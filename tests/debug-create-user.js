const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function debugCreateUser() {
  console.log('🔍 DEBUGGING CREATE USER FLOW\n');

  try {
    // Get admin token
    console.log('1. Getting admin token...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      name: 'admin',
      password: 'admin123',
      role: 'admin'
    });
    
    const adminToken = loginResponse.data.token;
    console.log('✅ Admin token obtained');

    // Test with complete data
    console.log('\n2. Testing with all required fields...');
    const userData = {
      mobile: '9999999999',
      name: 'Debug User Complete',
      username: 'debugusercomplete',
      role: 'student',
      college_id: 1,
      can_review_point_requests: false
    };
    
    console.log('Sending data:', JSON.stringify(userData, null, 2));
    
    try {
      const response = await axios.post(`${BASE_URL}/users`, userData, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Create User SUCCESS!');
      console.log('Response:', response.data);
    } catch (error) {
      console.log('❌ Create User FAILED');
      console.log('Status:', error.response?.status);
      console.log('Error Response:', JSON.stringify(error.response?.data, null, 2));
      
      // Let's also check what the service is receiving
      console.log('\n3. The error suggests username is null in database insertion');
      console.log('This means either:');
      console.log('   a) Controller is not extracting username properly');
      console.log('   b) Service is not using username properly');
      console.log('   c) SQL query is malformed');
    }

  } catch (error) {
    console.error('💥 Fatal error:', error.message);
  }
}

debugCreateUser();