/**
 * Zero-dependency LRU Cache utility for caching static, read-heavy API responses.
 * Protects the database from repetitive queries on common routes (e.g. /bounties/trending, /rewards)
 */
class LRUCache {
  constructor(capacity = 100, defaultTTL = 60000) {
    this.capacity = capacity;
    this.defaultTTL = defaultTTL; // milliseconds
    this.cache = new Map();
  }

  get(key) {
    if (!this.cache.has(key)) {
      return null;
    }

    const item = this.cache.get(key);

    // Check if expired
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    // Refresh position to signify recent use (LRU mechanic)
    this.cache.delete(key);
    this.cache.set(key, item);

    return item.value;
  }

  set(key, value, ttl = this.defaultTTL) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // Delete oldest item (Map iterates in insertion order)
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      value,
      expiry: Date.now() + ttl,
    });
  }

  delete(key) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }
}

// Singleton instances for common domains
const bountyCache = new LRUCache(50, 60000); // 1 minute TTL by default
const rewardCache = new LRUCache(50, 120000); // 2 minute TTL for rewards

module.exports = {
  LRUCache,
  bountyCache,
  rewardCache
};
