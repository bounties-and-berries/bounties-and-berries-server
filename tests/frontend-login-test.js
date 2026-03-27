const axios = require('axios');

async function testFrontendLogin() {
  console.log('🌐 Frontend Login Test - Demonstrating Correct Format\n');

  const serverUrl = 'http://192.168.31.138:3000/api/auth/login';

  // ❌ WRONG WAY (what your frontend is currently doing)
  console.log('❌ WRONG WAY (Current Frontend Code):');
  console.log('Request Data: { email: "faculty1", password: "faculty123", role: "faculty" }');
  console.log('URL: http://localhost:3000/api/auth/login');
  
  try {
    await axios.post('http://localhost:3000/api/auth/login', {
      email: 'faculty1',  // Wrong field name
      password: 'faculty123',
      role: 'faculty'
    });
  } catch (error) {
    console.log('Result: ❌ FAILED - ' + (error.code || error.message));
  }

  console.log('\n' + '='.repeat(60));

  // ✅ CORRECT WAY
  console.log('\n✅ CORRECT WAY (Fixed Frontend Code):');
  console.log('Request Data: { name: "faculty1", password: "faculty123", role: "faculty" }');
  console.log('URL: http://192.168.31.138:3000/api/auth/login');
  
  try {
    const response = await axios.post(serverUrl, {
      name: 'faculty1',      // ✅ Correct field name
      password: 'faculty123',
      role: 'faculty'
    }, {
      headers: {
        'Origin': 'http://localhost:8081',  // Simulate frontend origin
        'Content-Type': 'application/json'
      }
    });

    console.log('Result: ✅ SUCCESS!');
    console.log('Token received: ' + (response.data.token ? 'Yes' : 'No'));
    console.log('User name: ' + response.data.user?.name);
    console.log('User role: ' + response.data.user?.role);
    console.log('CORS headers present: ' + !!response.headers['access-control-allow-origin']);

  } catch (error) {
    console.log('Result: ❌ FAILED - ' + (error.response?.data?.message || error.message));
    if (error.response?.data) {
      console.log('Server error details:', error.response.data);
    }
  }

  console.log('\n📋 SUMMARY FOR YOUR FRONTEND:');
  console.log('1. Change "email" field to "name"');
  console.log('2. Change URL from localhost:3000 to 192.168.31.138:3000');
  console.log('3. Use these exact credentials:');
  console.log('   - name: "faculty1" or "faculty2"');
  console.log('   - password: "faculty123"');
  console.log('   - role: "faculty"');
}

testFrontendLogin();