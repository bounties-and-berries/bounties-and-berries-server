const axios = require('axios');

async function testCreateUser() {
  try {
    // Get admin token
    console.log('1. Getting admin token...');
    const loginResponse = await axios.post('http://192.168.31.138:3001/api/auth/login', {
      name: 'admin',
      password: 'admin123',
      role: 'admin'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Token obtained');

    // Create unique user
    const uniqueId = Date.now();
    const userData = {
      name: `Test User ${uniqueId}`,
      username: `testuser${uniqueId}`,
      mobile: `987654${uniqueId.toString().slice(-4)}`,
      role: 'student',
      college_id: 1
    };

    console.log('2. Creating user with data:', userData);
    
    const response = await axios.post('http://192.168.31.138:3001/api/users', userData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ User created successfully!');
    console.log('Response:', response.data);

  } catch (error) {
    console.log('❌ Error occurred:');
    console.log('Status:', error.response?.status);
    console.log('Error:', error.response?.data || error.message);
  }
}

testCreateUser();