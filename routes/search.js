const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../middleware/errorHandler');

router.get('/global', authenticateToken, asyncHandler(async (req, res) => {
  const { query } = req.query;
  if (!query || query.length < 2) {
    return res.json({ success: true, results: [] });
  }

  const searchTerm = `%${query}%`;
  
  // Search in Bounties
  const bountiesPromise = pool.query(
    'SELECT id, name, description, "type", \'event\' as category FROM bounty WHERE name ILIKE $1 OR description ILIKE $1 LIMIT 5',
    [searchTerm]
  );

  // Search in Rewards
  const rewardsPromise = pool.query(
    'SELECT id, name, description, \'reward\' as category FROM reward WHERE name ILIKE $1 OR description ILIKE $1 LIMIT 5',
    [searchTerm]
  );

  // Search in Users (if admin/faculty)
  let usersPromise = Promise.resolve({ rows: [] });
  if (req.user.role === 'admin' || req.user.role === 'faculty') {
    usersPromise = pool.query(
      'SELECT id, name, email, role_id, \'user\' as category FROM "user" WHERE name ILIKE $1 OR email ILIKE $1 LIMIT 5',
      [searchTerm]
    );
  }

  const [bounties, rewards, users] = await Promise.all([bountiesPromise, rewardsPromise, usersPromise]);

  const results = [
    ...bounties.rows.map(r => {
      let link = `/(student)/events?id=${r.id}`;
      if (req.user.role === 'faculty') {
        link = `/(faculty)/(tabs)/events?id=${r.id}`;
      } else if (req.user.role === 'admin') {
        // Admins can see events in the dashboard or rules
        link = `/(admin)/dashboard?highlight=${r.id}`; 
      }
      return { ...r, link };
    }),
    ...rewards.rows.map(r => {
      let link = `/(student)/rewards?id=${r.id}`;
      if (req.user.role === 'admin') {
        link = `/(admin)/purchase-berries`; 
      }
      return { ...r, link };
    }),
    ...users.rows.map(r => {
      let link = '#';
      if (req.user.role === 'admin') {
        link = `/(admin)/user-details?id=${r.id}`;
      } else if (req.user.role === 'faculty') {
        link = `/(faculty)/(tabs)/analysis?id=${r.id}`;
      }
      return { ...r, link };
    })
  ];

  res.json({ success: true, results });
}));

module.exports = router;
