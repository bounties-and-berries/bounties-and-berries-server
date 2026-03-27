# 403 Forbidden Error - Debugging Guide

## Problem Summary
**Error**: `POST http://localhost:3001/api/bounties/search 403 (Forbidden)`
**Location**: Frontend trying to access the bounties search API
**Impact**: Users cannot search for bounties/events

## Root Causes Identified

### 1. ✅ **FIXED** - Permission Configuration Issue
**Problem**: Admin and Faculty roles were missing the `'viewBounties'` permission required by the `/api/bounties/search` endpoint.

**Solution Applied**: Updated `/middleware/authMiddleware.js` to add:
- `'viewBounties'` permission to admin and faculty roles
- `'viewRewards'` permission to admin and faculty roles  
- `'editBounty'` permission to admin and faculty roles

### 2. ⚠️ **TO VERIFY** - Missing or Invalid Authentication Token

The 403 error could also occur if the frontend is:
- Not sending an Authorization header
- Sending an invalid/expired token
- Not storing the token after login

## Steps to Debug

### Step 1: Check Token Storage (Frontend)

After successful login, verify the token is being stored:

```typescript
// After login success
localStorage.setItem('authToken', response.token);
// OR
localStorage.setItem('token', response.token);
```

**Check in browser console:**
```javascript
console.log('Token:', localStorage.getItem('authToken'));
console.log('Token:', localStorage.getItem('token'));
```

### Step 2: Verify API Request Headers

Check if the Authorization header is being sent with requests. In your API service, ensure:

```typescript
// Example from FIXED_API_SERVICE.ts
this.client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken'); // or 'token'
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  }
);
```

### Step 3: Test the Endpoint with curl

Test the endpoint directly to verify backend is working:

```bash
# Login first to get a token
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "your_username",
    "password": "your_password"
  }'

# Use the returned token
TOKEN="<paste_token_here>"

# Test bounties search
curl -X POST http://localhost:3001/api/bounties/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "filters": {
      "status": "upcoming"
    }
  }'
```

### Step 4: Check Backend Logs

Look at the backend server logs to see what error is being returned:

```bash
# In the backend directory
tail -f server.log
```

### Step 5: Verify User Role and Permissions

Check what role the logged-in user has:

```javascript
// In frontend, after login
const user = JSON.parse(localStorage.getItem('user'));
console.log('User role:', user.role);
```

**Verify permissions in authMiddleware.js:**
- ✅ `student` → has `'viewBounties'`
- ✅ `faculty` → has `'viewBounties'` (FIXED)
- ✅ `admin` → has `'viewBounties'` (FIXED)

## Frontend Check List

### 1. Check API Configuration

Ensure your API service is configured correctly:

```typescript
// Check BASE_URL in your API service
const BASE_URL = Platform.select({
  web: 'http://localhost:3001/api',
  android: 'http://10.0.2.2:3001/api',
  ios: 'http://localhost:3001/api'
});
```

### 2. Check Token Storage After Login

In your login function:

```typescript
const handleLogin = async (username, password) => {
  try {
    const response = await api.post('/auth/login', { username, password });
    
    // CRITICAL: Store the token
    await AsyncStorage.setItem('token', response.data.token);
    // OR for web
    localStorage.setItem('authToken', response.data.token);
    
    // Store user info
    await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
    
  } catch (error) {
    console.error('Login error:', error);
  }
};
```

### 3. Check API Request Interceptor

Ensure your axios instance adds the token:

```typescript
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor
api.interceptors.request.use(
  async (config) => {
    // For React Native
    const token = await AsyncStorage.getItem('token');
    // OR for web
    // const token = localStorage.getItem('authToken');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
```

## Quick Fixes to Try

### Fix 1: Restart the Backend Server

After updating permissions, restart the backend:

```bash
cd /path/to/backend
npm stop
npm start
```

### Fix 2: Clear and Re-login

Clear all stored data and login again:

```javascript
// In frontend
localStorage.clear(); // or AsyncStorage.clear()
// Then login again
```

### Fix 3: Check Network Tab

In browser DevTools Network tab:
1. Find the failed `/api/bounties/search` request
2. Check **Request Headers** → Should have `Authorization: Bearer <token>`
3. Check **Response** → See the exact error message
4. Check **Status Code** → Should be 403

## Expected Flow

1. **User logs in** → Backend returns `{ token: "...", user: { ... } }`
2. **Frontend stores token** → `localStorage.setItem('authToken', token)`
3. **User makes API request** → Frontend adds header `Authorization: Bearer <token>`
4. **Backend validates token** → `authenticateToken` middleware verifies JWT
5. **Backend checks permission** → `authorize('viewBounties')` checks user role
6. **Request succeeds** → Returns bounties data

## Common Mistakes

❌ **Storing token under wrong key**
```javascript
// Backend sends "token"
localStorage.setItem('authToken', response.token); // ❌ key mismatch

// Fix:
localStorage.setItem('token', response.data.token); // ✅
```

❌ **Not adding "Bearer " prefix**
```javascript
config.headers.Authorization = token; // ❌ Missing "Bearer"

// Fix:
config.headers.Authorization = `Bearer ${token}`; // ✅
```

❌ **Token expired**
```javascript
// Check token expiration
const decoded = jwt_decode(token);
console.log('Token expires:', new Date(decoded.exp * 1000));
```

## Next Steps

1. ✅ Backend permissions have been fixed
2. ⚠️ Verify frontend is storing and sending tokens correctly
3. ⚠️ Test the API endpoint with curl to isolate frontend/backend issues
4. ⚠️ Check browser console and network tab for detailed error information

## Files Modified

- ✅ `/middleware/authMiddleware.js` - Added missing permissions to admin and faculty roles

## Need More Help?

If the error persists after checking all the above:

1. Share the Network tab screenshot showing the failed request
2. Share the browser console logs
3. Share your API service configuration code
4. Share your login handler code

---

**Last Updated**: 2025-01-25
**Status**: Backend permissions fixed, awaiting frontend verification
