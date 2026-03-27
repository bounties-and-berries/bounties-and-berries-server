const axios = require('axios');

async function testFacultyLogin() {
  try {
    console.log('🔐 Testing Faculty Login Credentials\n');
    
    const serverUrl = 'http://192.168.31.138:3001/api/auth/login';
    
    // Test Faculty 1
    console.log('1. Testing Faculty 1 Login...');
    try {
      const faculty1Response = await axios.post(serverUrl, {
        name: 'faculty1',
        password: 'faculty123',
        role: 'faculty'
      });
      console.log('✅ Faculty 1 Login: SUCCESS');
      console.log('Token received:', faculty1Response.data.token ? 'Yes' : 'No');
      console.log('User data:', JSON.stringify(faculty1Response.data.user, null, 2));
    } catch (error) {
      console.log('❌ Faculty 1 Login: FAILED');
      console.log('Error:', error.response?.data || error.message);
    }

    console.log('\n2. Testing Faculty 2 Login...');
    try {
      const faculty2Response = await axios.post(serverUrl, {
        name: 'faculty2',
        password: 'faculty123',
        role: 'faculty'
      });
      console.log('✅ Faculty 2 Login: SUCCESS');
      console.log('Token received:', faculty2Response.data.token ? 'Yes' : 'No');
      console.log('User data:', JSON.stringify(faculty2Response.data.user, null, 2));
    } catch (error) {
      console.log('❌ Faculty 2 Login: FAILED');
      console.log('Error:', error.response?.data || error.message);
    }

    // Also test what happens with wrong credentials
    console.log('\n3. Testing Invalid Credentials (to verify error handling)...');
    try {
      await axios.post(serverUrl, {
        name: 'faculty1',
        password: 'wrongpassword',
        role: 'faculty'
      });
      console.log('⚠️ This should not succeed');
    } catch (error) {
      console.log('✅ Properly rejected invalid credentials');
      console.log('Error message:', error.response?.data?.message || error.message);
    }

  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

testFacultyLogin();