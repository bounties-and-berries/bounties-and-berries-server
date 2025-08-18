const ACHIEVEMENT_CONSTANTS = require('../config/achievementConstants');

class AchievementCacheManager {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = ACHIEVEMENT_CONSTANTS.CACHE.TIMEOUT;
    this.maxCacheSize = ACHIEVEMENT_CONSTANTS.PERFORMANCE.MAX_CACHE_SIZE;
  }

  /**
   * Get cached achievements for a user
   * @param {string} userId - User ID
   * @returns {Object|null} Cached achievements or null if expired/not found
   */
  getCachedAchievements(userId) {
    const cacheKey = this.getCacheKey(userId);
    const cached = this.cache.get(cacheKey);
    
    if (cached && this.isCacheValid(cached.timestamp)) {
      return cached.data;
    }
    
    // Remove expired cache entry
    if (cached) {
      this.cache.delete(cacheKey);
    }
    
    return null;
  }

  /**
   * Cache achievements for a user
   * @param {string} userId - User ID
   * @param {Object} achievements - Achievement data to cache
   */
  setCachedAchievements(userId, achievements) {
    const cacheKey = this.getCacheKey(userId);
    
    // Check cache size limit
    if (this.cache.size >= this.maxCacheSize) {
      this.evictOldestCache();
    }
    
    this.cache.set(cacheKey, {
      data: achievements,
      timestamp: Date.now()
    });
  }

  /**
   * Invalidate cache for a specific user
   * @param {string} userId - User ID
   */
  invalidateUserCache(userId) {
    const cacheKey = this.getCacheKey(userId);
    this.cache.delete(cacheKey);
  }

  /**
   * Clear all cache
   */
  clearAllCache() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;
    
    for (const [key, value] of this.cache.entries()) {
      if (this.isCacheValid(value.timestamp)) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    }
    
    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      maxSize: this.maxCacheSize
    };
  }

  /**
   * Generate cache key for user
   * @param {string} userId - User ID
   * @returns {string} Cache key
   */
  getCacheKey(userId) {
    return `${ACHIEVEMENT_CONSTANTS.CACHE.KEY_PREFIX}${userId}`;
  }

  /**
   * Check if cache entry is still valid
   * @param {number} timestamp - Cache timestamp
   * @returns {boolean} True if cache is valid
   */
  isCacheValid(timestamp) {
    return Date.now() - timestamp < this.cacheTimeout;
  }

  /**
   * Evict oldest cache entries when limit is reached
   */
  evictOldestCache() {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    // Remove oldest 20% of entries
    const entriesToRemove = Math.ceil(entries.length * 0.2);
    for (let i = 0; i < entriesToRemove; i++) {
      this.cache.delete(entries[i][0]);
    }
  }
}

module.exports = new AchievementCacheManager();
