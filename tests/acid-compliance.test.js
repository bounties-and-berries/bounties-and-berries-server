const request = require('supertest');
const app = require('../server');
const pool = require('../config/db');

/**
 * ACID Compliance Test Suite
 * Tests each ACID principle across critical operations
 */

describe('ACID Compliance Tests', () => {
  let testUser1, testUser2, testBounty, testReward;
  let user1Token, user2Token;

  beforeAll(async () => {
    // Setup test data
    await setupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await pool.end();
  });

  describe('A - Atomicity Tests', () => {
    test('Reward Claiming: All operations succeed or fail together', async () => {
      // Test successful atomic operation
      const response = await request(app)
        .post('/api/user-reward-claims/claim')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          rewardId: testReward.id
        });

      expect(response.status).toBe(201);
      expect(response.body.claim).toBeDefined();
      expect(response.body.remaining_berries).toBeDefined();

      // Verify all related data is consistent
      const userEarnings = await getUserEarnings(testUser1.id);
      const userClaims = await getUserClaims(testUser1.id);
      
      expect(userEarnings.net_berries).toBe(response.body.remaining_berries);
      expect(userClaims.length).toBeGreaterThan(0);
    });

    test('Bounty Registration: Atomic registration prevents partial states', async () => {
      const response = await request(app)
        .post(`/api/bounty-participation/register/${testBounty.id}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(response.status).toBe(201);
      expect(response.body.participation).toBeDefined();
      expect(response.body.registeredBounties).toContain(testBounty.id);

      // Verify participation record exists and is consistent
      const participation = await getParticipation(testUser2.id, testBounty.id);
      expect(participation).toBeDefined();
      expect(participation.status).toBe('registered');
    });
  });

  describe('C - Consistency Tests', () => {
    test('Berry Balance: Net berries calculation is always consistent', async () => {
      const initialEarnings = await getUserEarnings(testUser1.id);
      
      // Claim a reward
      await request(app)
        .post('/api/user-reward-claims/claim')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ rewardId: testReward.id });

      const finalEarnings = await getUserEarnings(testUser1.id);
      
      // Verify consistency: final = initial - spent
      expect(finalEarnings.net_berries).toBe(
        initialEarnings.net_berries - testReward.berries_spent
      );
    });

    test('Points Calculation: Total points never decrease', async () => {
      const initialEarnings = await getUserEarnings(testUser1.id);
      const initialPoints = initialEarnings.total_points;

      // Complete a bounty to earn points
      await request(app)
        .post(`/api/bounty-participation/complete/${testBounty.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          pointsEarned: 100,
          berriesEarned: 50
        });

      const finalEarnings = await getUserEarnings(testUser1.id);
      
      // Points should never decrease (they're only earned, never spent)
      expect(finalEarnings.total_points).toBeGreaterThanOrEqual(initialPoints);
    });
  });

  describe('I - Isolation Tests', () => {
    test('Concurrent Reward Claims: Prevent race conditions', async () => {
      // Create a reward with limited quantity
      const limitedReward = await createLimitedReward(1); // Only 1 available
      
      // Simulate concurrent claims
      const promises = [
        request(app)
          .post('/api/user-reward-claims/claim')
          .set('Authorization', `Bearer ${user1Token}`)
          .send({ rewardId: limitedReward.id }),
        request(app)
          .post('/api/user-reward-claims/claim')
          .set('Authorization', `Bearer ${user2Token}`)
          .send({ rewardId: limitedReward.id })
      ];

      const results = await Promise.allSettled(promises);
      
      // Only one should succeed
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.status === 201);
      const failed = results.filter(r => r.status === 'fulfilled' && r.value.status !== 201);
      
      expect(successful.length).toBe(1);
      expect(failed.length).toBe(1);
    });

    test('Concurrent Bounty Registrations: Prevent duplicate registrations', async () => {
      // Simulate concurrent registrations
      const promises = [
        request(app)
          .post(`/api/bounty-participation/register/${testBounty.id}`)
          .set('Authorization', `Bearer ${user1Token}`),
        request(app)
          .post(`/api/bounty-participation/register/${testBounty.id}`)
          .set('Authorization', `Bearer ${user1Token}`)
      ];

      const results = await Promise.allSettled(promises);
      
      // Only one should succeed (first registration)
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.status === 201);
      const failed = results.filter(r => r.status === 'fulfilled' && r.value.status !== 201);
      
      expect(successful.length).toBe(1);
      expect(failed.length).toBe(1);
    });
  });

  describe('D - Durability Tests', () => {
    test('Database Recovery: Committed transactions survive restarts', async () => {
      // Perform a critical operation
      const response = await request(app)
        .post('/api/user-reward-claims/claim')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ rewardId: testReward.id });

      expect(response.status).toBe(201);
      const claimId = response.body.claim.id;

      // Simulate database restart (reconnect)
      await pool.end();
      await pool.connect();

      // Verify the claim still exists
      const claim = await getClaimById(claimId);
      expect(claim).toBeDefined();
      expect(claim.id).toBe(claimId);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('Insufficient Berries: Transaction rolls back completely', async () => {
      const initialEarnings = await getUserEarnings(testUser1.id);
      const expensiveReward = await createExpensiveReward(initialEarnings.net_berries + 1000);

      // Try to claim reward with insufficient berries
      const response = await request(app)
        .post('/api/user-reward-claims/claim')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ rewardId: expensiveReward.id });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('INSUFFICIENT_BERRIES');

      // Verify no changes were made
      const finalEarnings = await getUserEarnings(testUser1.id);
      expect(finalEarnings.net_berries).toBe(initialEarnings.net_berries);
    });

    test('Duplicate Operations: Prevent double processing', async () => {
      // Register for bounty
      await request(app)
        .post(`/api/bounty-participation/register/${testBounty.id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      // Try to register again
      const response = await request(app)
        .post(`/api/bounty-participation/register/${testBounty.id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('DUPLICATE_PARTICIPATION');
    });
  });
});

// Helper functions for testing
async function setupTestData() {
  // Create test users, bounties, rewards
  // This would set up the test environment
}

async function cleanupTestData() {
  // Clean up test data
}

async function getUserEarnings(userId) {
  const result = await pool.query(`
    SELECT 
      COALESCE(SUM(points_earned), 0) as total_points,
      COALESCE(SUM(berries_earned), 0) as total_berries_earned
    FROM user_bounty_participation 
    WHERE user_id = $1 AND status = 'completed'
  `, [userId]);
  
  const spentResult = await pool.query(`
    SELECT COALESCE(SUM(berries_spent), 0) as total_berries_spent
    FROM user_reward_claim 
    WHERE user_id = $1
  `, [userId]);

  return {
    total_points: parseInt(result.rows[0].total_points, 10),
    total_berries_earned: parseInt(result.rows[0].total_berries_earned, 10),
    total_berries_spent: parseInt(spentResult.rows[0].total_berries_spent, 10),
    net_berries: parseInt(result.rows[0].total_berries_earned, 10) - parseInt(spentResult.rows[0].total_berries_spent, 10)
  };
}

async function getUserClaims(userId) {
  const result = await pool.query(
    'SELECT * FROM user_reward_claim WHERE user_id = $1',
    [userId]
  );
  return result.rows;
}

async function getParticipation(userId, bountyId) {
  const result = await pool.query(
    'SELECT * FROM user_bounty_participation WHERE user_id = $1 AND bounty_id = $2',
    [userId, bountyId]
  );
  return result.rows[0];
}

async function getClaimById(claimId) {
  const result = await pool.query(
    'SELECT * FROM user_reward_claim WHERE id = $1',
    [claimId]
  );
  return result.rows[0];
}

async function createLimitedReward(quantity) {
  // Create a reward with limited availability
  const result = await pool.query(`
    INSERT INTO reward (name, description, berries_spent, available_quantity, created_on)
    VALUES ($1, $2, $3, $4, NOW())
    RETURNING *
  `, ['Limited Reward', 'Test reward', 10, quantity]);
  return result.rows[0];
}

async function createExpensiveReward(cost) {
  const result = await pool.query(`
    INSERT INTO reward (name, description, berries_spent, created_on)
    VALUES ($1, $2, $3, NOW())
    RETURNING *
  `, ['Expensive Reward', 'Test reward', cost]);
  return result.rows[0];
} 