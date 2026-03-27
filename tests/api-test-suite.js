const axios = require('axios');

// Test configuration
const config = {
  baseURL: 'http://localhost:3000/api',
  timeout: 10000
};

// Test users credentials
const testUsers = {
  admin: { name: 'admin', password: 'admin123', role: 'admin' },
  faculty1: { name: 'faculty1', password: 'faculty123', role: 'faculty' },
  faculty2: { name: 'faculty2', password: 'faculty123', role: 'faculty' },
  student1: { name: 'student1', password: 'student123', role: 'student' },
  student2: { name: 'student2', password: 'student123', role: 'student' },
  student3: { name: 'student3', password: 'student123', role: 'student' }
};

// Store authentication tokens
const tokens = {};

class APITester {
  constructor() {
    this.client = axios.create(config);
    this.testResults = {
      passed: 0,
      failed: 0,
      total: 0,
      details: []
    };
  }

  // Authentication helper
  async authenticate(username) {
    const user = testUsers[username];
    if (!user) throw new Error(`User ${username} not found`);

    try {
      const response = await this.client.post('/auth/login', user);
      tokens[username] = response.data.token;
      return response.data.token;
    } catch (error) {
      throw new Error(`Authentication failed for ${username}: ${error.message}`);
    }
  }

  // Helper to make authenticated requests
  async request(method, url, data = null, token = null, expectStatus = 200) {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    
    try {
      const response = await this.client({
        method,
        url,
        data,
        headers
      });
      
      return {
        success: response.status === expectStatus,
        status: response.status,
        data: response.data,
        error: null
      };
    } catch (error) {
      return {
        success: error.response?.status === expectStatus,
        status: error.response?.status || 0,
        data: error.response?.data || null,
        error: error.message
      };
    }
  }

  // Test logger
  logTest(testName, success, details) {
    this.testResults.total++;
    if (success) {
      this.testResults.passed++;
      console.log(`✅ ${testName}`);
    } else {
      this.testResults.failed++;
      console.log(`❌ ${testName}`);
      console.log(`   Details: ${details}`);
    }
    
    this.testResults.details.push({
      test: testName,
      success,
      details
    });
  }

  // Test suite methods
  async testAuthentication() {
    console.log('\n🔐 Testing Authentication...');
    
    // Test valid login
    for (const [username, userData] of Object.entries(testUsers)) {
      try {
        await this.authenticate(username);
        this.logTest(`Login: ${username}`, true, 'Authentication successful');
      } catch (error) {
        this.logTest(`Login: ${username}`, false, error.message);
      }
    }

    // Test invalid login
    const invalidResult = await this.request('POST', '/auth/login', {
      name: 'invalid',
      password: 'wrong',
      role: 'admin'
    }, null, 401);
    
    this.logTest('Login: Invalid credentials', invalidResult.success, 
      invalidResult.success ? 'Correctly rejected' : 'Should have been rejected');
  }

  async testUserEndpoints() {
    console.log('\n👥 Testing User Endpoints...');

    // Test profile image update (all users can do this)
    for (const username of ['admin', 'faculty1', 'student1']) {
      const result = await this.request('PATCH', '/users/profile-image', 
        null, tokens[username], 400); // Expect 400 because no file uploaded
      
      this.logTest(`Profile image update: ${username}`, 
        result.status === 400, 
        result.status === 400 ? 'Correctly requires file' : 'Unexpected response');
    }

    // Test user creation (admin only)
    const userCreationResult = await this.request('POST', '/users', {
      username: 'newuser',
      name: 'New User',
      mobile: '9876543210',
      mobilenumber: '9876543210',
      role_id: 3,
      password: 'password123',
      college_id: 1
    }, tokens.admin);

    this.logTest('User creation: Admin', userCreationResult.success, 
      userCreationResult.success ? 'Successfully created user' : userCreationResult.error);

    // Test user creation forbidden for non-admin
    const forbiddenResult = await this.request('POST', '/users', {
      username: 'forbidden',
      name: 'Forbidden User'
    }, tokens.student1, 403);

    this.logTest('User creation: Student (should fail)', forbiddenResult.success,
      forbiddenResult.success ? 'Correctly forbidden' : 'Should have been forbidden');
  }

  async testBountyEndpoints() {
    console.log('\n🎯 Testing Bounty Endpoints...');

    // Test get all bounties (all authenticated users)
    for (const username of ['admin', 'faculty1', 'student1']) {
      const result = await this.request('GET', '/bounties', null, tokens[username]);
      this.logTest(`Get bounties: ${username}`, result.success, 
        result.success ? `Found ${result.data?.length || 0} bounties` : result.error);
    }

    // Test bounty creation (admin/faculty only)
    const bountyData = {
      name: 'Test Bounty API',
      description: 'API testing bounty',
      type: 'test',
      alloted_points: 50,
      alloted_berries: 25,
      capacity: 5
    };

    for (const username of ['admin', 'faculty1']) {
      const result = await this.request('POST', '/bounties', bountyData, tokens[username]);
      this.logTest(`Create bounty: ${username}`, result.success,
        result.success ? 'Successfully created bounty' : result.error);
    }

    // Test bounty creation forbidden for student
    const studentResult = await this.request('POST', '/bounties', bountyData, tokens.student1, 403);
    this.logTest('Create bounty: Student (should fail)', studentResult.success,
      studentResult.success ? 'Correctly forbidden' : 'Should have been forbidden');

    // Test bounty search
    const searchResult = await this.request('POST', '/bounties/search', {
      name: 'Web'
    }, tokens.student1);
    this.logTest('Bounty search: Student', searchResult.success,
      searchResult.success ? 'Search completed' : searchResult.error);
  }

  async testRewardEndpoints() {
    console.log('\n🏆 Testing Reward Endpoints...');

    // Test get all rewards (all authenticated users)
    for (const username of ['admin', 'faculty1', 'student1']) {
      const result = await this.request('GET', '/reward', null, tokens[username]);
      this.logTest(`Get rewards: ${username}`, result.success,
        result.success ? `Found ${result.data?.length || 0} rewards` : result.error);
    }

    // Test reward search
    const searchResult = await this.request('POST', '/reward/search', {
      name: 'Coffee'
    }, tokens.student1);
    this.logTest('Reward search: Student', searchResult.success,
      searchResult.success ? 'Search completed' : searchResult.error);

    // Test view claimed rewards
    const claimedResult = await this.request('GET', '/reward/user/claimed', null, tokens.student1);
    this.logTest('View claimed rewards: Student', claimedResult.success,
      claimedResult.success ? 'Retrieved claimed rewards' : claimedResult.error);
  }

  async testPointRequestEndpoints() {
    console.log('\n📊 Testing Point Request Endpoints...');

    // Test get own point requests (students)
    for (const username of ['student1', 'student2']) {
      const result = await this.request('GET', '/point-requests/my-requests', null, tokens[username]);
      this.logTest(`Get own point requests: ${username}`, result.success,
        result.success ? 'Retrieved point requests' : result.error);
    }

    // Test get assigned requests (faculty)
    for (const username of ['faculty1', 'faculty2']) {
      const result = await this.request('GET', '/point-requests/assigned', null, tokens[username]);
      this.logTest(`Get assigned requests: ${username}`, result.success,
        result.success ? 'Retrieved assigned requests' : result.error);
    }

    // Test get reviewers (students)
    const reviewersResult = await this.request('GET', '/point-requests/reviewers', null, tokens.student1);
    this.logTest('Get reviewers: Student', reviewersResult.success,
      reviewersResult.success ? 'Retrieved reviewers list' : reviewersResult.error);
  }

  async testCollegeEndpoints() {
    console.log('\n🏫 Testing College Endpoints...');

    // Test get colleges (should work for creators - admin/faculty)
    for (const username of ['admin', 'faculty1']) {
      const result = await this.request('GET', '/college', null, tokens[username]);
      this.logTest(`Get colleges: ${username}`, result.success,
        result.success ? 'Retrieved colleges' : result.error);
    }

    // Test college search
    const searchResult = await this.request('GET', '/college/search?name=Test', null, tokens.admin);
    this.logTest('College search: Admin', searchResult.success,
      searchResult.success ? 'Search completed' : searchResult.error);
  }

  async testStatusEndpoints() {
    console.log('\n💚 Testing Status Endpoints...');

    // Test basic status (no auth required)
    const statusResult = await this.request('GET', '/status');
    this.logTest('Basic status', statusResult.success,
      statusResult.success ? 'Status retrieved' : statusResult.error);

    // Test detailed status
    const detailedResult = await this.request('GET', '/status/detailed');
    this.logTest('Detailed status', detailedResult.success,
      detailedResult.success ? 'Detailed status retrieved' : detailedResult.error);

    // Test health check
    const healthResult = await this.request('GET', '/status/health');
    this.logTest('Health check', healthResult.success,
      healthResult.success ? 'Health check passed' : healthResult.error);
  }

  async runAllTests() {
    console.log('🚀 Starting API Test Suite...\n');
    console.log('📡 Testing against:', config.baseURL);
    
    try {
      await this.testAuthentication();
      await this.testUserEndpoints();
      await this.testBountyEndpoints();
      await this.testRewardEndpoints();
      await this.testPointRequestEndpoints();
      await this.testCollegeEndpoints();
      await this.testStatusEndpoints();
      
      this.printSummary();
    } catch (error) {
      console.error('💥 Test suite crashed:', error.message);
    }
  }

  printSummary() {
    console.log('\n📊 TEST SUMMARY');
    console.log('================');
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    console.log(`📈 Total: ${this.testResults.total}`);
    console.log(`📊 Success Rate: ${((this.testResults.passed / this.testResults.total) * 100).toFixed(1)}%`);

    if (this.testResults.failed > 0) {
      console.log('\n🔍 Failed Tests:');
      this.testResults.details
        .filter(t => !t.success)
        .forEach(t => console.log(`   • ${t.test}: ${t.details}`));
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new APITester();
  tester.runAllTests()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = APITester;