const adminService = require('./services/adminService');
const db = require('./config/knex');

async function testService() {
  try {
    const result = await adminService.getStudentsProgress();
    console.log('Result Length:', result ? result.length : 'null');
    console.log('First Item:', result ? result[0] : 'null');
    process.exit(0);
  } catch (err) {
    console.error('Service Error:', err.message);
    process.exit(1);
  }
}

testService();
