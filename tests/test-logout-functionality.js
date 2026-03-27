const axios = require('axios');

const BASE_URL = 'http://192.168.31.138:3001/api';

// Test credentials
const testCredentials = [
  { name: 'admin', password: 'admin123', role: 'admin', description: 'Admin User' },
  { name: 'faculty1', password: 'faculty123', role: 'faculty', description: 'Faculty One' },
  { name: 'student1', password: 'student123', role: 'student', description: 'Student One' }
];

async function testLogoutFunctionality() {
  console.log('🔐 COMPREHENSIVE LOGOUT FUNCTIONALITY TEST\n');
  console.log('Testing login → logout flow for all user types...\n');

  let successfulLogins = 0;
  let successfulLogouts = 0;
  let testResults = [];

  for (let i = 0; i < testCredentials.length; i++) {
    const cred = testCredentials[i];
    console.log(`${i + 1}. Testing ${cred.description} (${cred.role})...`);
    
    let token = null;
    
    try {
      // Step 1: Login
      console.log(`   📝 Step 1: Logging in...`);
      const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
        name: cred.name,
        password: cred.password,
        role: cred.role
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });
      
      token = loginResponse.data.token;
      if (token) {
        console.log(`   ✅ Login successful - Token received`);
        successfulLogins++;
      } else {
        console.log(`   ❌ Login failed - No token received`);
        testResults.push({ user: cred, loginSuccess: false, logoutSuccess: false, error: 'No token' });
        continue;
      }
      
      // Step 2: Test logout
      console.log(`   📝 Step 2: Testing logout...`);
      const logoutResponse = await axios.post(`${BASE_URL}/auth/logout`, {}, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      if (logoutResponse.data.success) {
        console.log(`   ✅ Logout successful - ${logoutResponse.data.message}`);
        successfulLogouts++;
        testResults.push({ 
          user: cred, 
          loginSuccess: true, 
          logoutSuccess: true, 
          message: logoutResponse.data.message 
        });
      } else {
        console.log(`   ❌ Logout failed - Response not successful`);
        testResults.push({ 
          user: cred, 
          loginSuccess: true, 
          logoutSuccess: false, 
          error: 'Response not successful' 
        });
      }
      
    } catch (error) {
      console.log(`   ❌ Test failed - ${error.response?.data?.message || error.message}`);
      testResults.push({ 
        user: cred, 
        loginSuccess: !!token, 
        logoutSuccess: false, 
        error: error.response?.data || error.message 
      });
    }
    
    console.log(''); // Empty line for readability
  }

  // Test logout with invalid token
  console.log('4. Testing logout with invalid token...');
  try {
    const invalidLogoutResponse = await axios.post(`${BASE_URL}/auth/logout`, {}, {
      headers: { 
        'Authorization': `Bearer invalid_token_12345`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    if (invalidLogoutResponse.data.success) {
      console.log(`   ✅ Invalid token logout handled gracefully - ${invalidLogoutResponse.data.message}`);
    }
  } catch (error) {
    console.log(`   ✅ Invalid token properly rejected - ${error.response?.data?.message || error.message}`);
  }

  // Test logout without token
  console.log('\n5. Testing logout without token...');
  try {
    const noTokenLogoutResponse = await axios.post(`${BASE_URL}/auth/logout`, {}, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });
    console.log(`   ⚠️  No token logout unexpectedly succeeded`);
  } catch (error) {
    console.log(`   ✅ No token properly rejected - ${error.response?.data?.message || error.message}`);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 LOGOUT FUNCTIONALITY TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Successful logins: ${successfulLogins}/${testCredentials.length}`);
  console.log(`✅ Successful logouts: ${successfulLogouts}/${testCredentials.length}`);
  console.log(`📈 Login success rate: ${((successfulLogins / testCredentials.length) * 100).toFixed(1)}%`);
  console.log(`📈 Logout success rate: ${((successfulLogouts / testCredentials.length) * 100).toFixed(1)}%`);
  console.log(`🔗 Logout endpoint: ${BASE_URL}/auth/logout`);

  if (successfulLogins === testCredentials.length && successfulLogouts === testCredentials.length) {
    console.log('\n🎉 LOGOUT FUNCTIONALITY WORKING PERFECTLY!');
    console.log('✨ All user types can login and logout successfully');
  } else {
    console.log('\n⚠️  Some issues found:');
    testResults.forEach((result, index) => {
      if (!result.loginSuccess || !result.logoutSuccess) {
        console.log(`   ${index + 1}. ${result.user.description}: Login: ${result.loginSuccess ? '✅' : '❌'}, Logout: ${result.logoutSuccess ? '✅' : '❌'}`);
        if (result.error) {
          console.log(`      Error: ${JSON.stringify(result.error, null, 2)}`);
        }
      }
    });
  }

  console.log('\n📋 USAGE INSTRUCTIONS FOR FRONTEND:');
  console.log('POST /api/auth/logout');
  console.log('Headers: {');
  console.log('  "Authorization": "Bearer <jwt_token>",');
  console.log('  "Content-Type": "application/json"');
  console.log('}');
  
  return testResults;
}

testLogoutFunctionality();