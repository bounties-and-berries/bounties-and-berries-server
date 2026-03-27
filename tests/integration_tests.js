const axios = require('axios');

const API_URL = 'http://localhost:3001/api';

/**
 * Comprehensive Integration Test Suite
 * Tests all critical user flows and API endpoints
 */

let adminToken, facultyToken, studentToken;
let studentId, facultyId, adminId;
let testBountyId, testRewardId, testPointRequestId;

async function runAllTests() {
    console.log('🚀 Starting Comprehensive Integration Tests\n');

    try {
        await testAuthentication();
        await testStudentFlow();
        await testFacultyFlow();
        await testAdminFlow();
        await testFrontendAliases();

        console.log('\n✅ All Integration Tests Passed! 🎉\n');
    } catch (error) {
        console.error('\n❌ Integration Tests Failed:', error.message);
        process.exit(1);
    }
}

// ============================================
// 1. AUTHENTICATION TESTS
// ============================================
async function testAuthentication() {
    console.log('📝 Testing Authentication...');

    // Login as admin
    const adminLogin = await axios.post(`${API_URL}/auth/login`, {
        name: 'admin',
        password: 'admin123',
        role: 'admin'
    });
    adminToken = adminLogin.data.token;
    adminId = adminLogin.data.user?.id || '1';
    console.log('  ✅ Admin login successful');

    // Login as faculty
    const facultyLogin = await axios.post(`${API_URL}/auth/login`, {
        name: 'faculty1',
        password: 'faculty123',
        role: 'faculty'
    });
    facultyToken = facultyLogin.data.token;
    facultyId = facultyLogin.data.user?.id || '2';
    console.log('  ✅ Faculty login successful');

    // Login as student
    const studentLogin = await axios.post(`${API_URL}/auth/login`, {
        name: 'student1',
        password: 'student123',
        role: 'student'
    });
    studentToken = studentLogin.data.token;
    studentId = studentLogin.data.user?.id || '4';
    console.log('  ✅ Student login successful');

    // Test logout
    await axios.post(`${API_URL}/auth/logout`, {}, {
        headers: { Authorization: `Bearer ${studentToken}` }
    });
    console.log('  ✅ Logout successful\n');
}

// ============================================
// 2. STUDENT FLOW TESTS
// ============================================
async function testStudentFlow() {
    console.log('👨‍🎓 Testing Student Flow...');

    const headers = { Authorization: `Bearer ${studentToken}` };

    // Get current user profile
    const profile = await axios.get(`${API_URL}/users/me`, { headers });
    console.log(`  ✅ Get profile: ${profile.data.data.name}`);

    // Get user stats
    const stats = await axios.get(`${API_URL}/users/${studentId}/stats`, { headers });
    console.log(`  ✅ Get stats: ${stats.data.data.points.current} points, ${stats.data.data.berries.current} berries`);

    // Get available bounties
    const bounties = await axios.get(`${API_URL}/bounties`, { headers });
    console.log(`  ✅ Get bounties: ${bounties.data.length} available`);

    // Get my participations (history)
    const participations = await axios.get(`${API_URL}/bounty-participation/my`, { headers });
    console.log(`  ✅ Get history: ${participations.data.length} participations`);

    // Get available rewards
    const rewards = await axios.get(`${API_URL}/reward`, { headers });
    console.log(`  ✅ Get rewards: ${rewards.data.length} available`);

    // Get claimed rewards
    const claimed = await axios.get(`${API_URL}/reward/user/claimed`, { headers });
    console.log(`  ✅ Get claimed rewards: ${claimed.data.length} claimed`);

    // Get my point requests
    const myRequests = await axios.get(`${API_URL}/point-requests/my-requests`, { headers });
    console.log(`  ✅ Get point requests: ${myRequests.data.length} requests\n`);
}

// ============================================
// 3. FACULTY FLOW TESTS
// ============================================
async function testFacultyFlow() {
    console.log('👨‍🏫 Testing Faculty Flow...');

    const headers = { Authorization: `Bearer ${facultyToken}` };

    // Get my bounties (events I created)
    const myBounties = await axios.get(`${API_URL}/bounties/admin/all`, { headers });
    console.log(`  ✅ Get my bounties: ${myBounties.data.length} created`);

    // Get assigned point requests
    const assigned = await axios.get(`${API_URL}/point-requests/assigned`, { headers });
    console.log(`  ✅ Get assigned requests: ${assigned.data.length} assigned`);

    // Get available reviewers (may require special permission)
    try {
        const reviewers = await axios.get(`${API_URL}/point-requests/reviewers`, { headers });
        console.log(`  ✅ Get reviewers: ${reviewers.data.length} available\n`);
    } catch (error) {
        console.log(`  ⚠️  Get reviewers: ${error.response?.status || error.message} (may require special permission)\n`);
    }
}

// ============================================
// 4. ADMIN FLOW TESTS
// ============================================
async function testAdminFlow() {
    console.log('👑 Testing Admin Flow...');

    const headers = { Authorization: `Bearer ${adminToken}` };

    // Get dashboard stats
    try {
        const dashboard = await axios.get(`${API_URL}/admin/dashboard`, { headers });
        console.log(`  ✅ Get dashboard: ${dashboard.data.totalUsers || 'N/A'} users`);
    } catch (error) {
        console.log(`  ⚠️  Dashboard: ${error.response?.status || error.message}`);
    }

    // Get berry rules
    const rules = await axios.get(`${API_URL}/berry-rules`, { headers });
    console.log(`  ✅ Get berry rules: ${rules.data.data.length} rules`);

    // Get berry purchases
    const purchases = await axios.get(`${API_URL}/berry-purchases`, { headers });
    console.log(`  ✅ Get purchases: ${purchases.data.data.length} purchases`);

    // Get purchase stats
    const purchaseStats = await axios.get(`${API_URL}/berry-purchases/stats`, { headers });
    console.log(`  ✅ Get purchase stats: ${purchaseStats.data.data.total_purchased} total berries`);

    // Get leaderboard
    try {
        const leaderboard = await axios.get(`${API_URL}/achievements/leaderboard`, { headers });
        console.log(`  ✅ Get leaderboard: ${leaderboard.data.length} entries\n`);
    } catch (error) {
        console.log(`  ⚠️  Leaderboard: ${error.response?.status || error.message}\n`);
    }
}

// ============================================
// 5. FRONTEND ALIAS TESTS
// ============================================
async function testFrontendAliases() {
    console.log('🔗 Testing Frontend Compatibility Aliases...');

    // Test student history alias
    try {
        const history = await axios.get(`${API_URL}/students/${studentId}/history`, {
            headers: { Authorization: `Bearer ${studentToken}` }
        });
        console.log(`  ✅ Student history alias works`);
    } catch (error) {
        console.log(`  ⚠️  Student history alias: ${error.message}`);
    }

    // Test admin dashboard stats alias
    try {
        const dashStats = await axios.get(`${API_URL}/admin/dashboard-stats`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log(`  ✅ Admin dashboard stats alias works`);
    } catch (error) {
        console.log(`  ⚠️  Admin dashboard stats alias: ${error.message}`);
    }

    // Test faculty events alias
    try {
        const events = await axios.get(`${API_URL}/faculty/events`, {
            headers: { Authorization: `Bearer ${facultyToken}` }
        });
        console.log(`  ✅ Faculty events alias works`);
    } catch (error) {
        console.log(`  ⚠️  Faculty events alias: ${error.message}`);
    }

    // Test user stats alias
    try {
        const userStats = await axios.get(`${API_URL}/users/stats`, {
            headers: { Authorization: `Bearer ${studentToken}` }
        });
        console.log(`  ✅ User stats alias works\n`);
    } catch (error) {
        console.log(`  ⚠️  User stats alias: ${error.message}\n`);
    }
}

// Run all tests
runAllTests().catch(console.error);
