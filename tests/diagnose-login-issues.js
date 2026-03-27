const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// All test credentials based on setup-test-data.js
const testCredentials = [
  {
    name: 'admin',
    password: 'admin123',
    role: 'admin',
    description: 'Admin User'
  },
  {
    name: 'faculty1',
    password: 'faculty123',
    role: 'faculty',
    description: 'Faculty One'
  },
  {
    name: 'faculty2',
    password: 'faculty123',
    role: 'faculty',
    description: 'Faculty Two'
  },
  {
    name: 'student1',
    password: 'student123',
    role: 'student',
    description: 'Student One'
  },
  {
    name: 'student2',
    password: 'student123',
    role: 'student',
    description: 'Student Two'
  },
  {
    name: 'student3',
    password: 'student123',
    role: 'student',
    description: 'Student Three'
  }
];

async function testLoginCredentials() {
  console.log('🔐 COMPREHENSIVE LOGIN CREDENTIALS TEST\n');
  console.log('Testing all user roles and credentials...\n');

  let successCount = 0;
  let failureCount = 0;
  const results = [];

  for (let i = 0; i < testCredentials.length; i++) {
    const cred = testCredentials[i];
    console.log(`${i + 1}. Testing ${cred.description} (${cred.role})...`);
    
    try {
      const response = await axios.post(`${BASE_URL}/auth/login`, {
        name: cred.name,
        password: cred.password,
        role: cred.role
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      console.log(`   ✅ SUCCESS - Token received: ${response.data.token ? 'Yes' : 'No'}`);
      if (response.data.user) {
        console.log(`   👤 User: ${response.data.user.name} (ID: ${response.data.user.id})`);
      }
      successCount++;
      results.push({
        credential: cred,
        status: 'SUCCESS',
        token: !!response.data.token,
        user: response.data.user
      });
      
    } catch (error) {
      console.log(`   ❌ FAILED`);
      console.log(`   📊 Status: ${error.response?.status || 'No response'}`);
      console.log(`   💬 Error: ${error.response?.data?.message || error.message}`);
      
      if (error.code === 'ECONNREFUSED') {
        console.log('   🚨 SERVER CONNECTION REFUSED!');
      }
      
      failureCount++;
      results.push({
        credential: cred,
        status: 'FAILED',
        error: error.response?.data || error.message,
        statusCode: error.response?.status
      });
    }
    
    console.log(''); // Empty line for readability
  }

  // Summary
  console.log('='.repeat(60));
  console.log('📊 LOGIN TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Successful logins: ${successCount}`);
  console.log(`❌ Failed logins: ${failureCount}`);
  console.log(`📈 Success rate: ${((successCount / testCredentials.length) * 100).toFixed(1)}%`);

  if (failureCount > 0) {
    console.log('\n🔍 FAILURE ANALYSIS:');
    const failedResults = results.filter(r => r.status === 'FAILED');
    
    failedResults.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.credential.description}:`);
      console.log(`   Name: "${result.credential.name}"`);
      console.log(`   Password: "${result.credential.password}"`);
      console.log(`   Role: "${result.credential.role}"`);
      console.log(`   Error: ${JSON.stringify(result.error, null, 2)}`);
    });
    
    console.log('\n💡 POSSIBLE CAUSES:');
    console.log('1. Database connection issues');
    console.log('2. Password hashing mismatch');
    console.log('3. Missing user records');
    console.log('4. Authentication service configuration issues');
    console.log('5. Role validation problems');
  }

  if (successCount === testCredentials.length) {
    console.log('\n🎉 ALL CREDENTIALS WORKING PERFECTLY!');
  }

  return results;
}

// Run the test
testLoginCredentials()
  .then(results => {
    console.log('\n✅ Diagnosis complete!');
  })
  .catch(error => {
    console.error('\n💥 Test failed with error:', error.message);
  });