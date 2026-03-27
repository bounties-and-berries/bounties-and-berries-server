/**
 * 🔍 DEBUG FAILED API ENDPOINTS
 * 
 * Investigates the 3 failing endpoints from the comprehensive test
 */

const axios = require('axios');

const BASE_URL = 'http://192.168.31.138:3001/api';

async function debugFailedApis() {
  console.log('🔍 DEBUGGING FAILED API ENDPOINTS\n');

  try {
    // First, get admin token
    console.log('1. Getting admin authentication token...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      name: 'admin',
      password: 'admin123',
      role: 'admin'
    });
    
    const adminToken = loginResponse.data.token;
    console.log('✅ Admin token obtained');

    // Test 1: Create User
    console.log('\n2. Testing Create User endpoint...');
    try {
      const createUserResponse = await axios.post(`${BASE_URL}/users`, {
        name: 'Debug Test User',
        username: 'debuguser',
        mobile: '9876543210',
        role: 'student',
        college_id: 1
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Create User: SUCCESS');
      console.log('Response:', createUserResponse.data);
    } catch (error) {
      console.log('❌ Create User: FAILED');
      console.log('Error:', error.response?.data || error.message);
      console.log('Status:', error.response?.status);
    }

    // Test 2: Change Password
    console.log('\n3. Testing Change Password endpoint...');
    try {
      const changePasswordResponse = await axios.post(`${BASE_URL}/users/change-password`, {
        mobile: '1234567890',
        name: 'Admin User',
        oldPassword: 'admin123',
        newPassword: 'admin456',
        role: 'admin'
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Change Password: SUCCESS');
      console.log('Response:', changePasswordResponse.data);
    } catch (error) {
      console.log('❌ Change Password: FAILED');
      console.log('Error:', error.response?.data || error.message);
      console.log('Status:', error.response?.status);
    }

    // Test 3: Get User Achievements
    console.log('\n4. Testing Get User Achievements endpoint...');
    try {
      const achievementsResponse = await axios.post(`${BASE_URL}/achievements/user`, {
        userId: 4
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Get User Achievements: SUCCESS');
      console.log('Response:', achievementsResponse.data);
    } catch (error) {
      console.log('❌ Get User Achievements: FAILED');
      console.log('Error:', error.response?.data || error.message);
      console.log('Status:', error.response?.status);
    }

    // Test additional endpoints that might not be working
    console.log('\n5. Testing additional critical endpoints...');
    
    // Test creator-specific endpoints
    console.log('\n5a. Testing Creator Login...');
    try {
      const creatorLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
        name: 'creator1',
        password: 'creator123',
        role: 'creator'
      });
      console.log('✅ Creator Login: SUCCESS');
      
      const creatorToken = creatorLoginResponse.data.token;
      
      // Test college creation
      console.log('\n5b. Testing College Creation...');
      try {
        const collegeResponse = await axios.post(`${BASE_URL}/college`, {
          name: 'Test College Debug',
          location: 'Debug City',
          berries_purchased: 100,
          is_active: true
        }, {
          headers: {
            'Authorization': `Bearer ${creatorToken}`,
            'Content-Type': 'application/json'
          }
        });
        console.log('✅ Create College: SUCCESS');
      } catch (error) {
        console.log('❌ Create College: FAILED');
        console.log('Error:', error.response?.data || error.message);
      }
      
    } catch (error) {
      console.log('❌ Creator Login: FAILED');
      console.log('Error:', error.response?.data || error.message);
    }

    console.log('\n🏁 DEBUG ANALYSIS COMPLETE');

  } catch (error) {
    console.error('💥 Fatal error during debugging:', error.message);
  }
}

debugFailedApis();