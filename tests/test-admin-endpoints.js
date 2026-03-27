/**
 * 🧪 ADMIN ENDPOINTS TEST SUITE
 * 
 * Tests all new admin endpoints to verify they're working correctly
 * with proper authentication and validation.
 * 
 * @version 1.0.0
 * @created 2025-09-08
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3001';
const API_BASE = `${BASE_URL}/api`;

// Test admin credentials
const ADMIN_CREDENTIALS = {
  name: 'admin',
  password: 'admin123',
  role: 'admin'
};

let adminToken = null;
let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: []
};

// Helper function to make authenticated requests
async function makeRequest(method, endpoint, data = null, token = null, isFormData = false) {
  try {
    const config = {
      method,
      url: `${API_BASE}${endpoint}`,
      headers: {}
    };

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (data) {
      if (isFormData) {
        config.headers['Content-Type'] = 'multipart/form-data';
        config.data = data;
      } else {
        config.headers['Content-Type'] = 'application/json';
        config.data = data;
      }
    }

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || error.message,
      status: error.response?.status || 500 
    };
  }
}

// Test logging function
function logTest(testName, success, details = '') {
  testResults.total++;
  if (success) {
    testResults.passed++;
    console.log(`✅ ${testName}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${testName} - ${details}`);
    testResults.errors.push(`${testName}: ${details}`);
  }
}

// Authentication
async function authenticate() {
  console.log('\n🔐 AUTHENTICATING AS ADMIN...\n');

  const result = await makeRequest('POST', '/auth/login', ADMIN_CREDENTIALS);
  
  if (result.success && result.data.token) {
    adminToken = result.data.token;
    logTest('Admin Authentication', true);
    return true;
  } else {
    logTest('Admin Authentication', false, result.error);
    return false;
  }
}

// Test Dashboard API
async function testDashboardAPI() {
  console.log('\n📊 TESTING DASHBOARD API...\n');

  // Test GET /admin/dashboard
  const dashboardResult = await makeRequest('GET', '/admin/dashboard', null, adminToken);
  
  if (dashboardResult.success) {
    const data = dashboardResult.data;
    const hasRequiredFields = data.hasOwnProperty('berriesAvailable') &&
                              data.hasOwnProperty('categoryBreakdown') &&
                              data.hasOwnProperty('approvedPoints') &&
                              data.hasOwnProperty('pendingRequests') &&
                              data.hasOwnProperty('topStudents');
    
    logTest('Dashboard API - Structure', hasRequiredFields, hasRequiredFields ? '' : 'Missing required fields');
    logTest('Dashboard API - Response', true);
  } else {
    logTest('Dashboard API - Response', false, dashboardResult.error);
  }

  // Test with search parameter
  const searchResult = await makeRequest('GET', '/admin/dashboard?search=test', null, adminToken);
  logTest('Dashboard API - Search Parameter', searchResult.success, searchResult.success ? '' : searchResult.error);
}

// Test Berry Rules API
async function testBerryRulesAPI() {
  console.log('\n🍓 TESTING BERRY RULES API...\n');

  // Test POST /admin/rules
  const ruleData = {
    name: `Test Academic Rule ${Date.now()}`, // Add timestamp to avoid conflicts
    category: 'Academic',
    points: 50,
    maxPerSemester: 200,
    autoGrant: false
  };

  const createResult = await makeRequest('POST', '/admin/rules', ruleData, adminToken);
  logTest('Berry Rules - Create Rule', createResult.success, createResult.success ? '' : createResult.error);

  // Test validation - missing required fields
  const invalidData = {
    name: 'Invalid Rule'
    // Missing category and points
  };

  const validationResult = await makeRequest('POST', '/admin/rules', invalidData, adminToken);
  logTest('Berry Rules - Validation (400)', !validationResult.success && validationResult.status === 400, 
    validationResult.success ? 'Should have failed validation' : '');

  // Test duplicate rule name
  const duplicateResult = await makeRequest('POST', '/admin/rules', ruleData, adminToken);
  logTest('Berry Rules - Duplicate Prevention', !duplicateResult.success, 
    duplicateResult.success ? 'Should prevent duplicates' : '');
}

// Test Bulk User Upload API
async function testBulkUserUploadAPI() {
  console.log('\n👥 TESTING BULK USER UPLOAD API...\n');

  // Create test CSV file
  const csvContent = 'name,email,role,department,year,roll_no\n' +
                    'Test User 1,test1@example.com,student,Computer Science,2024,TEST001\n' +
                    'Test User 2,test2@example.com,student,Mathematics,2024,TEST002';
  
  const csvPath = path.join(__dirname, 'test_users.csv');
  fs.writeFileSync(csvPath, csvContent);

  // Test POST /admin/users/bulk with CSV
  const FormData = require('form-data');
  const formData = new FormData();
  formData.append('csv', fs.createReadStream(csvPath));

  try {
    const uploadResult = await axios.post(`${API_BASE}/admin/users/bulk`, formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${adminToken}`
      }
    });
    
    logTest('Bulk Upload - CSV Processing', true);
    
    const responseData = uploadResult.data;
    if (responseData.hasOwnProperty('successCount') && responseData.hasOwnProperty('errors')) {
      logTest('Bulk Upload - Response Structure', true);
    } else {
      logTest('Bulk Upload - Response Structure', false, 'Missing successCount or errors');
    }
  } catch (error) {
    logTest('Bulk Upload - CSV Processing', false, error.message);
  }

  // Clean up test file
  if (fs.existsSync(csvPath)) {
    fs.unlinkSync(csvPath);
  }

  // Test GET /admin/users/template
  const templateResult = await makeRequest('GET', '/admin/users/template', null, adminToken);
  logTest('Bulk Upload - Template Download', templateResult.success, templateResult.success ? '' : templateResult.error);
}

// Test Purchase Berries API
async function testPurchaseBerriesAPI() {
  console.log('\n💰 TESTING PURCHASE BERRIES API...\n');

  // Test POST /admin/purchase-berries
  const purchaseData = {
    adminId: '1', // Assuming admin has ID 1
    quantity: 1000,
    paymentRef: `TEST_${Date.now()}`
  };

  const purchaseResult = await makeRequest('POST', '/admin/purchase-berries', purchaseData, adminToken);
  logTest('Purchase Berries - Create Purchase', purchaseResult.success, purchaseResult.success ? '' : purchaseResult.error);

  // Test validation - missing fields
  const invalidPurchase = {
    quantity: 1000
    // Missing adminId and paymentRef
  };

  const validationResult = await makeRequest('POST', '/admin/purchase-berries', invalidPurchase, adminToken);
  logTest('Purchase Berries - Validation (400)', !validationResult.success && validationResult.status === 400,
    validationResult.success ? 'Should have failed validation' : '');

  // Test duplicate payment reference
  const duplicateResult = await makeRequest('POST', '/admin/purchase-berries', purchaseData, adminToken);
  logTest('Purchase Berries - Duplicate Prevention', !duplicateResult.success,
    duplicateResult.success ? 'Should prevent duplicate payment refs' : '');
}

// Test Admin Profile API
async function testAdminProfileAPI() {
  console.log('\n👤 TESTING ADMIN PROFILE API...\n');

  // Test GET /admin/profile
  const profileResult = await makeRequest('GET', '/admin/profile', null, adminToken);
  
  if (profileResult.success) {
    const profile = profileResult.data;
    const hasRequiredFields = profile.hasOwnProperty('name') &&
                              profile.hasOwnProperty('email') &&
                              profile.hasOwnProperty('logoUrl') &&
                              profile.hasOwnProperty('theme');
    
    logTest('Admin Profile - Get Profile', true);
    logTest('Admin Profile - Structure', hasRequiredFields, hasRequiredFields ? '' : 'Missing required fields');
  } else {
    logTest('Admin Profile - Get Profile', false, profileResult.error);
  }

  // Test PUT /admin/profile
  const updateData = {
    name: 'Updated Admin Name',
    email: 'updated@example.com',
    theme: 'dark'
  };

  const updateResult = await makeRequest('PUT', '/admin/profile', updateData, adminToken);
  logTest('Admin Profile - Update Profile', updateResult.success, updateResult.success ? '' : updateResult.error);
}

// Test Authorization (non-admin user)
async function testAuthorization() {
  console.log('\n🔒 TESTING AUTHORIZATION...\n');

  // Test without token
  const noTokenResult = await makeRequest('GET', '/admin/dashboard');
  logTest('Authorization - No Token (401)', !noTokenResult.success && noTokenResult.status === 401,
    noTokenResult.success ? 'Should require authentication' : '');

  // TODO: Test with non-admin token (would need to create student/faculty user)
}

// Main test runner
async function runTests() {
  console.log('🧪 STARTING ADMIN ENDPOINTS TEST SUITE\n');
  console.log('=' .repeat(50));

  try {
    // Authentication
    const authSuccess = await authenticate();
    if (!authSuccess) {
      console.log('\n❌ Authentication failed. Cannot proceed with tests.');
      return;
    }

    // Run all tests
    await testDashboardAPI();
    await testBerryRulesAPI();
    await testBulkUserUploadAPI();
    await testPurchaseBerriesAPI();
    await testAdminProfileAPI();
    await testAuthorization();

  } catch (error) {
    console.error('\n❌ Test suite error:', error.message);
  }

  // Print summary
  console.log('\n' + '=' .repeat(50));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('=' .repeat(50));
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);

  if (testResults.errors.length > 0) {
    console.log('\n❌ ERRORS:');
    testResults.errors.forEach(error => console.log(`  - ${error}`));
  }

  console.log('\n✅ Admin endpoints test suite completed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests };