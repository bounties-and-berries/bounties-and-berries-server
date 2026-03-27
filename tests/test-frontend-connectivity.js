const axios = require('axios');

const BASE_URL = 'http://192.168.31.138:3001/api';

// Test credentials on the corrected port
const testCredentials = [
  { name: 'admin', password: 'admin123', role: 'admin', description: 'Admin User' },
  { name: 'faculty1', password: 'faculty123', role: 'faculty', description: 'Faculty One' },
  { name: 'student1', password: 'student123', role: 'student', description: 'Student One' }
];

async function testFrontendConnectivity() {
  console.log('🔗 TESTING FRONTEND CONNECTIVITY FIX\n');
  console.log('Testing the exact endpoint that frontend uses...\n');

  let successCount = 0;

  for (let i = 0; i < testCredentials.length; i++) {
    const cred = testCredentials[i];
    console.log(`${i + 1}. Testing ${cred.description}...`);
    
    try {
      const response = await axios.post(`${BASE_URL}/auth/login`, {
        name: cred.name,
        password: cred.password,
        role: cred.role
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });
      
      console.log(`   ✅ SUCCESS - Token received: ${response.data.token ? 'Yes' : 'No'}`);
      successCount++;
      
    } catch (error) {
      console.log(`   ❌ FAILED - ${error.response?.data?.message || error.message}`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('🎯 FRONTEND CONNECTIVITY TEST RESULTS');
  console.log('='.repeat(50));
  console.log(`✅ Successful: ${successCount}/${testCredentials.length}`);
  console.log(`📡 Endpoint: ${BASE_URL}/auth/login`);
  console.log(`🌐 Port: 3001 (matches frontend expectation)`);

  if (successCount === testCredentials.length) {
    console.log('\n🎉 FRONTEND CONNECTIVITY ISSUE RESOLVED!');
    console.log('✨ Frontend should now be able to connect successfully');
  } else {
    console.log('\n⚠️  Some issues remain');
  }
}

testFrontendConnectivity();