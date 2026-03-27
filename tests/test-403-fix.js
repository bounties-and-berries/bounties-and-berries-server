#!/usr/bin/env node

/**
 * Test Script for 403 Forbidden Error Fix
 * 
 * This script tests if the /api/bounties/search endpoint works correctly
 * after fixing the permissions in authMiddleware.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

// Test credentials - UPDATE THESE with actual credentials
const TEST_USERS = {
    admin: { username: 'admin', password: 'admin123' },
    faculty: { username: 'faculty1', password: 'faculty123' },
    student: { username: 'student1', password: 'student123' }
};

async function testLogin(role, credentials) {
    try {
        console.log(`\n🔐 Testing login for ${role}...`);
        const response = await axios.post(`${BASE_URL}/auth/login`, credentials);

        if (response.data && response.data.token) {
            console.log(`✅ ${role} login successful`);
            console.log(`   Token: ${response.data.token.substring(0, 20)}...`);
            console.log(`   User: ${response.data.user.name} (${response.data.user.role})`);
            return response.data.token;
        } else {
            console.log(`❌ ${role} login failed: No token returned`);
            return null;
        }
    } catch (error) {
        console.log(`❌ ${role} login failed:`, error.response?.data?.error || error.message);
        return null;
    }
}

async function testBountySearch(role, token) {
    try {
        console.log(`\n🔍 Testing bounty search for ${role}...`);
        const response = await axios.post(
            `${BASE_URL}/bounties/search`,
            {
                filters: { status: 'upcoming' },
                sortBy: 'name',
                sortOrder: 'asc',
                pageNumber: 1,
                pageSize: 10
            },
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log(`✅ ${role} bounty search successful`);
        console.log(`   Found ${response.data.results?.length || 0} bounties`);
        console.log(`   Total results: ${response.data.totalResults || 0}`);
        return true;
    } catch (error) {
        const status = error.response?.status;
        const errorMsg = error.response?.data?.error || error.message;

        if (status === 403) {
            console.log(`❌ ${role} bounty search FAILED with 403 Forbidden`);
            console.log(`   Error: ${errorMsg}`);
            console.log(`   🔧 This means the permission fix didn't work for ${role}`);
        } else if (status === 401) {
            console.log(`❌ ${role} bounty search FAILED with 401 Unauthorized`);
            console.log(`   Error: ${errorMsg}`);
            console.log(`   🔧 Token might be invalid or expired`);
        } else {
            console.log(`❌ ${role} bounty search failed:`, errorMsg);
        }
        return false;
    }
}

async function runTests() {
    console.log('🧪 Starting 403 Error Fix Verification Tests\n');
    console.log('='.repeat(60));

    const results = [];

    for (const [role, credentials] of Object.entries(TEST_USERS)) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`Testing ${role.toUpperCase()} role`);
        console.log('='.repeat(60));

        // Login
        const token = await testLogin(role, credentials);

        if (token) {
            // Test bounty search
            const searchSuccess = await testBountySearch(role, token);
            results.push({ role, login: true, search: searchSuccess });
        } else {
            results.push({ role, login: false, search: false });
        }

        // Wait a bit between tests
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Print summary
    console.log('\n\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log('\n');

    results.forEach(({ role, login, search }) => {
        const loginStatus = login ? '✅' : '❌';
        const searchStatus = search ? '✅' : '❌';
        console.log(`${role.toUpperCase().padEnd(10)} | Login: ${loginStatus} | Bounty Search: ${searchStatus}`);
    });

    const allPassed = results.every(r => r.login && r.search);

    console.log('\n' + '='.repeat(60));
    if (allPassed) {
        console.log('🎉 ALL TESTS PASSED! The 403 error is fixed.');
    } else {
        console.log('⚠️  SOME TESTS FAILED. Check the details above.');
        console.log('\nPossible issues:');
        console.log('  1. Test credentials are incorrect');
        console.log('  2. Database doesn\'t have these users');
        console.log('  3. Permissions still need adjustment');
        console.log('  4. Backend server needs restart');
    }
    console.log('='.repeat(60) + '\n');
}

// Run tests
runTests().catch(error => {
    console.error('\n❌ Test execution failed:', error.message);
    console.error('\nMake sure:');
    console.error('  1. Backend server is running on port 3001');
    console.error('  2. Database is accessible');
    console.error('  3. Test users exist in the database\n');
    process.exit(1);
});
