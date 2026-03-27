'use strict';
/**
 * Unit tests for authMiddleware.js
 * Tests: authenticateToken, authorizeRoles, authorize
 */

const jwt = require('jsonwebtoken');

// Set JWT_SECRET before requiring the middleware
const TEST_SECRET = 'test-secret-for-jest';
process.env.JWT_SECRET = TEST_SECRET;

const {
    authenticateToken,
    authorizeRoles,
    authorize,
} = require('../../middleware/authMiddleware');

// ─── Helper: create a mock Express next function ──────────────────────────────
const mockNext = jest.fn();
const mockRes = {};

function makeReq(authHeader) {
    return { headers: { authorization: authHeader } };
}

function signToken(payload) {
    return jwt.sign(payload, TEST_SECRET, { expiresIn: '1h' });
}

// ─────────────────────────────────────────────────────────────────────────────

describe('authenticateToken', () => {
    beforeEach(() => mockNext.mockClear());

    test('calls next(ApiError) when no token provided', async () => {
        const req = makeReq(undefined);
        await authenticateToken(req, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalledTimes(1);
        const err = mockNext.mock.calls[0][0];
        expect(err).toBeDefined();
        expect(err.statusCode).toBe(401);
    });

    test('calls next(ApiError) when token is invalid', async () => {
        const req = makeReq('Bearer invalid.jwt.token');
        await authenticateToken(req, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalledTimes(1);
        const err = mockNext.mock.calls[0][0];
        expect(err.statusCode).toBe(401);
    });

    test('attaches user to req and calls next() when token is valid', async () => {
        const payload = { id: 1, username: 'testuser', role: 'student' };
        const token = signToken(payload);
        const req = makeReq(`Bearer ${token}`);
        await authenticateToken(req, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalledWith(); // no args → pass-through
        expect(req.user).toMatchObject({ id: 1, username: 'testuser', role: 'student' });
    });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('authorizeRoles', () => {
    beforeEach(() => mockNext.mockClear());

    test('calls next(ApiError 403) when user role is not allowed', () => {
        const req = { user: { role: 'student' } };
        authorizeRoles('admin')(req, mockRes, mockNext);
        const err = mockNext.mock.calls[0][0];
        expect(err.statusCode).toBe(403);
    });

    test('calls next() when user role is allowed', () => {
        const req = { user: { role: 'admin' } };
        authorizeRoles('admin', 'creator')(req, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalledWith(); // pass-through
    });

    test('calls next(ApiError 403) when req.user is missing', () => {
        const req = {};
        authorizeRoles('admin')(req, mockRes, mockNext);
        const err = mockNext.mock.calls[0][0];
        expect(err.statusCode).toBe(403);
    });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('authorize (permission-based)', () => {
    beforeEach(() => mockNext.mockClear());

    test('student can submitPointRequest', () => {
        const req = { user: { role: 'student' } };
        authorize('submitPointRequest')(req, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalledWith();
    });

    test('student cannot viewAllUsers', () => {
        const req = { user: { role: 'student' } };
        authorize('viewAllUsers')(req, mockRes, mockNext);
        const err = mockNext.mock.calls[0][0];
        expect(err.statusCode).toBe(403);
    });

    test('admin can viewAllUsers', () => {
        const req = { user: { role: 'admin' } };
        authorize('viewAllUsers')(req, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalledWith();
    });

    test('faculty can reviewPointRequests', () => {
        const req = { user: { role: 'faculty' } };
        authorize('reviewPointRequests')(req, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalledWith();
    });
});
