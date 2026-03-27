const axios = require('axios');

const API_URL = 'http://localhost:3001/api';

async function testLogout(role, username, password) {
    try {
        console.log(`\nTesting logout for ${role} (${username})...`);

        // 1. Login
        const loginResponse = await axios.post(`${API_URL}/auth/login`, {
            name: username,
            password: password,
            role: role
        });

        const token = loginResponse.data.token;
        console.log('✅ Login successful, token received');

        // 2. Logout
        const logoutResponse = await axios.post(`${API_URL}/auth/logout`, {}, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (logoutResponse.status === 200) {
            console.log('✅ Logout successful');
        } else {
            console.log(`❌ Logout failed with status: ${logoutResponse.status}`);
        }

    } catch (error) {
        console.error(`❌ Error testing ${role}:`, error.response ? error.response.data : error.message);
    }
}

async function runTests() {
    await testLogout('admin', 'admin', 'admin123');
    await testLogout('faculty', 'faculty1', 'faculty123');
    await testLogout('student', 'student1', 'student123');

    console.log('\nTesting logout with invalid token...');
    try {
        const logoutResponse = await axios.post(`${API_URL}/auth/logout`, {}, {
            headers: {
                'Authorization': `Bearer invalid_token_here`
            }
        });
        console.log(`✅ Logout with invalid token status: ${logoutResponse.status}`);
    } catch (error) {
        console.log(`❌ Logout with invalid token failed: ${error.response ? error.response.status : error.message}`);
    }
}

runTests();
