'use strict';
/**
 * Unit tests for authService.js
 * Uses mocked repository to avoid real DB calls.
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

process.env.JWT_SECRET = 'test-secret-for-jest';

// ─── Mock the repository layer so tests don't hit the DB ─────────────────────
jest.mock('../../repositories/authRepository', () => ({
    findUserByName: jest.fn(),
}));

const authRepository = require('../../repositories/authRepository');
const authService = require('../../services/authService');

// ─────────────────────────────────────────────────────────────────────────────

describe('authService.login', () => {
    const hashedPassword = bcrypt.hashSync('correctpassword', 10);

    const fakeUser = {
        id: 42,
        username: 'testuser',
        password: hashedPassword,
        role_name: 'student',
    };

    afterEach(() => jest.clearAllMocks());

    test('returns a token when credentials are correct', async () => {
        authRepository.findUserByName.mockResolvedValue(fakeUser);

        const result = await authService.login({
            name: 'testuser',
            password: 'correctpassword',
            role: 'student',
        });

        expect(result).toHaveProperty('token');
        const decoded = jwt.verify(result.token, process.env.JWT_SECRET);
        expect(decoded.id).toBe(42);
        expect(decoded.role).toBe('student');
    });

    test('throws when user is not found', async () => {
        authRepository.findUserByName.mockResolvedValue(null);

        await expect(
            authService.login({ name: 'nobody', password: 'any', role: 'student' })
        ).rejects.toThrow();
    });

    test('throws when password is wrong', async () => {
        authRepository.findUserByName.mockResolvedValue(fakeUser);

        await expect(
            authService.login({ name: 'testuser', password: 'wrongpassword', role: 'student' })
        ).rejects.toThrow();
    });

    test('throws when role does not match', async () => {
        authRepository.findUserByName.mockResolvedValue(fakeUser);

        await expect(
            authService.login({ name: 'testuser', password: 'correctpassword', role: 'admin' })
        ).rejects.toThrow();
    });
});
