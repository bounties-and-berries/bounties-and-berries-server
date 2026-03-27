'use strict';
/**
 * Integration tests for the auth API route using supertest.
 * Requires server to be importable without starting a real DB.
 * The DB pool is mocked below.
 */

// Mock pg pool BEFORE requiring any app files
jest.mock('../config/db', () => ({
    query: jest.fn(),
}));

const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../server');
const pool = require('../config/db');

// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
    const hashedPwd = bcrypt.hashSync('student123', 10);

    afterEach(() => jest.clearAllMocks());

    test('returns 401 when body is missing required fields', async () => {
        const res = await request(app).post('/api/auth/login').send({});
        expect(res.status).toBe(401);
    });

    test('returns 401 when user is not found', async () => {
        // DB returns no rows
        pool.query.mockResolvedValue({ rows: [] });

        const res = await request(app)
            .post('/api/auth/login')
            .send({ name: 'nobody', password: 'any', role: 'student' });

        expect(res.status).toBe(401);
    });

    test('returns 401 when password is wrong', async () => {
        pool.query.mockResolvedValue({
            rows: [{ id: 1, username: 'student', password: hashedPwd, role_name: 'student' }],
        });

        const res = await request(app)
            .post('/api/auth/login')
            .send({ name: 'student', password: 'wrongpassword', role: 'student' });

        expect(res.status).toBe(401);
    });

    test('returns 200 and a token on valid credentials', async () => {
        pool.query.mockResolvedValue({
            rows: [{ id: 1, username: 'student', password: hashedPwd, role_name: 'student' }],
        });

        const res = await request(app)
            .post('/api/auth/login')
            .send({ name: 'student', password: 'student123', role: 'student' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('token');
    });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('GET /health', () => {
    test('returns 200 with status OK', async () => {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('OK');
    });
});
