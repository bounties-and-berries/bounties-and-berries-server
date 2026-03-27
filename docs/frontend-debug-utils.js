/**
 * Frontend Debugging Utilities for 403 Error
 * 
 * Add these utilities to your frontend code to help debug the 403 error.
 * Import and use them in your components/screens to verify token handling.
 */

// ============================================
// 1. Token Verification Utility
// ============================================

export const debugToken = () => {
    console.log('🔍 TOKEN DEBUG INFO');
    console.log('==================');

    // For React Native
    import('react-native').then(({ AsyncStorage }) => {
        AsyncStorage.getItem('token').then(token => {
            if (token) {
                console.log('✅ Token found in AsyncStorage:', token.substring(0, 20) + '...');

                // Decode JWT to check expiration
                try {
                    const base64Url = token.split('.')[1];
                    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                    const jsonPayload = decodeURIComponent(
                        atob(base64)
                            .split('')
                            .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                            .join('')
                    );

                    const decoded = JSON.parse(jsonPayload);
                    const expirationDate = new Date(decoded.exp * 1000);
                    const now = new Date();
                    const isExpired = expirationDate < now;

                    console.log('📅 Token expires:', expirationDate.toLocaleString());
                    console.log('⏰ Current time:', now.toLocaleString());
                    console.log(isExpired ? '❌ Token is EXPIRED' : '✅ Token is VALID');
                    console.log('👤 User role:', decoded.role);
                    console.log('🆔 User ID:', decoded.id);
                } catch (error) {
                    console.log('❌ Failed to decode token:', error.message);
                }
            } else {
                console.log('❌ No token found in AsyncStorage');
            }
        });
    }).catch(() => {
        // For Web
        const token = localStorage.getItem('token') || localStorage.getItem('authToken');
        if (token) {
            console.log('✅ Token found in localStorage:', token.substring(0, 20) + '...');
        } else {
            console.log('❌ No token found in localStorage');
            console.log('Available keys:', Object.keys(localStorage));
        }
    });
};

// ============================================
// 2. API Request Debugger
// ============================================

export const debugAPIRequest = (config) => {
    console.log('🌐 API REQUEST DEBUG');
    console.log('===================');
    console.log('URL:', config.url);
    console.log('Method:', config.method);
    console.log('Headers:', JSON.stringify(config.headers, null, 2));
    console.log('Data:', JSON.stringify(config.data, null, 2));

    // Check if Authorization header is present
    if (config.headers.Authorization) {
        console.log('✅ Authorization header is present');
        const token = config.headers.Authorization.replace('Bearer ', '');
        console.log('Token preview:', token.substring(0, 30) + '...');
    } else {
        console.log('❌ Authorization header is MISSING!');
        console.log('⚠️  This will cause a 401/403 error');
    }

    return config;
};

// ============================================
// 3. Error Response Debugger
// ============================================

export const debugAPIError = (error) => {
    console.log('❌ API ERROR DEBUG');
    console.log('==================');

    if (error.response) {
        console.log('Status:', error.response.status);
        console.log('Status Text:', error.response.statusText);
        console.log('Error Message:', error.response.data?.error || error.response.data?.message);
        console.log('Response Data:', JSON.stringify(error.response.data, null, 2));
        console.log('Response Headers:', JSON.stringify(error.response.headers, null, 2));

        if (error.response.status === 403) {
            console.log('\n🔧 403 FORBIDDEN - Possible causes:');
            console.log('   1. Token is valid but user lacks required permission');
            console.log('   2. User role doesn\'t have \'viewBounties\' permission');
            console.log('   3. Token is corrupted');
        } else if (error.response.status === 401) {
            console.log('\n🔧 401 UNAUTHORIZED - Possible causes:');
            console.log('   1. No token sent with request');
            console.log('   2. Token is invalid or expired');
            console.log('   3. Token not formatted as "Bearer <token>"');
        }
    } else if (error.request) {
        console.log('❌ No response received from server');
        console.log('Request:', error.request);
    } else {
        console.log('❌ Error setting up request:', error.message);
    }

    console.log('\nFull Error:', error);

    return Promise.reject(error);
};

// ============================================
// 4. Setup API Client with Debugging
// ============================================

export const createDebugAPIClient = (baseURL) => {
    const axios = require('axios');

    const client = axios.create({
        baseURL,
        headers: {
            'Content-Type': 'application/json',
        },
    });

    // Request interceptor with debugging
    client.interceptors.request.use(
        async (config) => {
            // Get token (adjust based on your storage method)
            let token;
            try {
                // Try React Native AsyncStorage
                const { AsyncStorage } = require('react-native');
                token = await AsyncStorage.getItem('token');
            } catch {
                // Fall back to web localStorage
                token = localStorage.getItem('token') || localStorage.getItem('authToken');
            }

            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }

            // Debug the request
            return debugAPIRequest(config);
        },
        (error) => {
            console.error('Request interceptor error:', error);
            return Promise.reject(error);
        }
    );

    // Response interceptor with debugging
    client.interceptors.response.use(
        (response) => {
            console.log('✅ API Response:', response.status, response.config.url);
            return response;
        },
        (error) => {
            return debugAPIError(error);
        }
    );

    return client;
};

// ============================================
// 5. Quick Test Function
// ============================================

export const testBountySearchAPI = async (apiClient) => {
    console.log('\n🧪 Testing /api/bounties/search...\n');

    try {
        const response = await apiClient.post('/bounties/search', {
            filters: { status: 'upcoming' },
            sortBy: 'name',
            sortOrder: 'asc',
            pageNumber: 1,
            pageSize: 10
        });

        console.log('✅ SUCCESS! Bounty search works');
        console.log('Found', response.data.results?.length || 0, 'bounties');
        return response.data;
    } catch (error) {
        console.log('❌ FAILED! Bounty search returned error');
        // Error already logged by debugAPIError
        throw error;
    }
};

// ============================================
// USAGE EXAMPLES
// ============================================

/*
// Example 1: Check token status
import { debugToken } from './debugUtils';
debugToken();

// Example 2: Create debug API client
import { createDebugAPIClient } from './debugUtils';
const api = createDebugAPIClient('http://localhost:3001/api');

// Example 3: Test bounty search
import { testBountySearchAPI } from './debugUtils';
testBountySearchAPI(api);

// Example 4: Add to existing API client
import axios from 'axios';
import { debugAPIRequest, debugAPIError } from './debugUtils';

const api = axios.create({ baseURL: 'http://localhost:3001/api' });
api.interceptors.request.use(debugAPIRequest);
api.interceptors.response.use(
  response => response,
  debugAPIError
);
*/
