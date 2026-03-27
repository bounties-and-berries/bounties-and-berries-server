const axios = require('axios');

const API_URL = 'http://localhost:3001/api';

async function testNewAPIs() {
    try {
        // Step 1: Login as admin
        console.log('🔐 Logging in as admin...');
        const loginResponse = await axios.post(`${API_URL}/auth/login`, {
            name: 'admin',
            password: 'admin123',
            role: 'admin'
        });

        const adminToken = loginResponse.data.token;
        console.log('✅ Admin login successful\n');

        // Step 2: Test Berry Rules API
        console.log('📋 Testing Berry Rules API...');

        // Get all rules
        const rulesResponse = await axios.get(`${API_URL}/berry-rules`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        console.log(`✅ GET /berry-rules: ${rulesResponse.data.data.length} rules found`);

        // Step 3: Test Berry Purchases API
        console.log('\n💰 Testing Berry Purchases API...');

        // Get all purchases
        const purchasesResponse = await axios.get(`${API_URL}/berry-purchases`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        console.log(`✅ GET /berry-purchases: ${purchasesResponse.data.data.length} purchases found`);

        // Get purchase stats
        const statsResponse = await axios.get(`${API_URL}/berry-purchases/stats`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        console.log(`✅ GET /berry-purchases/stats:`, statsResponse.data.data);

        // Step 4: Test User Profile & Stats API
        console.log('\n👤 Testing User Profile & Stats API...');

        // Login as student
        const studentLogin = await axios.post(`${API_URL}/auth/login`, {
            name: 'student1',
            password: 'student123',
            role: 'student'
        });
        const studentToken = studentLogin.data.token;
        console.log('Student login response:', studentLogin.data);

        // Get student ID from the login response or query
        const studentId = studentLogin.data.user?.id || 1; // Fallback to ID 1 for testing

        // Get current user
        const meResponse = await axios.get(`${API_URL}/users/me`, {
            headers: { 'Authorization': `Bearer ${studentToken}` }
        });
        console.log(`✅ GET /users/me: ${meResponse.data.data.name}`);

        // Get user stats
        const userStatsResponse = await axios.get(`${API_URL}/users/${studentId}/stats`, {
            headers: { 'Authorization': `Bearer ${studentToken}` }
        });
        console.log(`✅ GET /users/:id/stats:`, userStatsResponse.data.data);

        console.log('\n🎉 All new APIs are working correctly!');

    } catch (error) {
        console.error('❌ Error:', error.response ? error.response.data : error.message);
    }
}

testNewAPIs();
