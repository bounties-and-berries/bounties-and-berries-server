/**
 * In-Memory Token Blacklist
 * 
 * For production with multiple instances, replace this with Redis:
 *   const redis = require('ioredis');
 *   const client = new redis(process.env.REDIS_URL);
 * 
 * Tokens are automatically cleaned up after expiry to prevent memory leaks.
 */

const Redis = require('ioredis');

/**
 * Redis-backed Token Blacklist
 * 
 * Production-ready token blacklisting for multi-instance deployments.
 * Uses TTL (EX) to automatically clean up expired tokens from Redis.
 */
class TokenBlacklist {
  constructor() {
    this.useRedis = !!process.env.REDIS_URL;
    if (this.useRedis) {
      this.redis = new Redis(process.env.REDIS_URL);
      this.redis.on('error', (err) => {
        console.error('Redis connection error in token blacklist:', err);
      });
      console.log('✅ TokenBlacklist using Redis');
    } else {
      console.warn('⚠️ TokenBlacklist using fallback in-memory store (not multi-instance safe)');
      this.blacklist = new Map();
      this.cleanupInterval = setInterval(() => this.cleanup(), 10 * 60 * 1000);
    }
  }

  /**
   * Add a token to the blacklist
   * @param {string} token - JWT token to blacklist
   * @param {number} expiresInMs - How long until the token expires (ms)
   */
  async add(token, expiresInMs) {
    if (expiresInMs <= 0) return;
    
    if (this.useRedis) {
      const ttlSeconds = Math.ceil(expiresInMs / 1000);
      await this.redis.set(`blacklist:${token}`, 'blacklisted', 'EX', ttlSeconds);
    } else {
      const expiryTime = Date.now() + expiresInMs;
      this.blacklist.set(token, expiryTime);
    }
  }

  /**
   * Check if a token is blacklisted
   * @param {string} token - JWT token to check
   * @returns {boolean} true if blacklisted
   */
  async isBlacklisted(token) {
    if (this.useRedis) {
      const result = await this.redis.get(`blacklist:${token}`);
      return result === 'blacklisted';
    } else {
      if (!this.blacklist.has(token)) return false;
      
      const expiryTime = this.blacklist.get(token);
      if (Date.now() > expiryTime) {
        this.blacklist.delete(token);
        return false;
      }
      return true;
    }
  }

  /**
   * Remove expired tokens from the in-memory fallback
   */
  cleanup() {
    if (this.useRedis) return; // Redis handles this via EX automatically
    const now = Date.now();
    for (const [token, expiryTime] of this.blacklist) {
      if (now > expiryTime) {
        this.blacklist.delete(token);
      }
    }
  }

  /**
   * Destroy the connection/interval (for graceful shutdown)
   */
  async destroy() {
    if (this.useRedis) {
      await this.redis.quit();
    } else if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// Singleton instance
module.exports = new TokenBlacklist();
