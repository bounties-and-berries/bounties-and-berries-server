const axios = require('axios');

async function testLoginQuick() {
  console.log('🔐 Quick Faculty Login Test\n');
  
  try {
    const response = await axios.post('http://192.168.31.138:3001/api/auth/login', {
      name: 'faculty1',
      password: 'faculty123',
      role: 'faculty'
    });
    
    console.log('✅ LOGIN SUCCESSFUL!');
    console.log('🎯 Token:', response.data.token ? 'Generated ✓' : 'Missing ✗');
    console.log('👤 User Info:', response.data.user);
    
  } catch (error) {
    console.log('❌ LOGIN FAILED');
    console.log('📊 Status:', error.response?.status);
    console.log('💬 Error:', error.response?.data?.message || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n🚨 SERVER NOT RUNNING!');
      console.log('   Run: npm start');
    }
  }
}

testLoginQuick();