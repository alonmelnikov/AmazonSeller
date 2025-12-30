/**
 * cache-manager.js
 * Utility for managing cache expiration and storage
 * Cache expires after 1 day (24 hours)
 */

class CacheManager {
  constructor() {
    this.CACHE_PREFIX = 'api_cache_';
    this.CACHE_EXPIRY_HOURS = 24; // 1 day
  }

  /**
   * Get cache key for a specific API call
   * @param {String} apiName - Name of the API (e.g., 'productDetails')
   * @param {Object} params - Parameters used for the API call
   * @returns {String} Cache key
   */
  getCacheKey(apiName, params) {
    const paramString = JSON.stringify(params);
    return `${this.CACHE_PREFIX}${apiName}_${this.hashString(paramString)}`;
  }

  /**
   * Simple hash function for creating cache keys
   * @param {String} str - String to hash
   * @returns {String} Hashed string
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Check if cache is expired
   * @param {Number} timestamp - Cache timestamp
   * @returns {Boolean} True if expired
   */
  isExpired(timestamp) {
    if (!timestamp) return true;
    const now = Date.now();
    const expiryTime = timestamp + (this.CACHE_EXPIRY_HOURS * 60 * 60 * 1000);
    return now > expiryTime;
  }

  /**
   * Get cached data if available and not expired
   * @param {String} cacheKey - Cache key
   * @returns {Promise<Object|null>} Cached data or null
   */
  async getCache(cacheKey) {
    return new Promise((resolve) => {
      chrome.storage.local.get([cacheKey], (result) => {
        const cachedData = result[cacheKey];
        
        if (!cachedData) {
          resolve(null);
          return;
        }

        // Check expiration
        if (this.isExpired(cachedData.timestamp)) {
          // Delete expired cache
          this.deleteCache(cacheKey);
          resolve(null);
          return;
        }

        // Return data with metadata
        resolve({
          data: cachedData.data,
          timestamp: cachedData.timestamp,
          age: this.getCacheAge(cachedData.timestamp)
        });
      });
    });
  }

  /**
   * Set cache data with timestamp
   * @param {String} cacheKey - Cache key
   * @param {Object} data - Data to cache
   */
  async setCache(cacheKey, data) {
    return new Promise((resolve) => {
      const cacheData = {
        data: data,
        timestamp: Date.now()
      };
      
      chrome.storage.local.set({ [cacheKey]: cacheData }, () => {
        resolve();
      });
    });
  }

  /**
   * Delete cache
   * @param {String} cacheKey - Cache key
   */
  async deleteCache(cacheKey) {
    return new Promise((resolve) => {
      chrome.storage.local.remove([cacheKey], () => {
        resolve();
      });
    });
  }

  /**
   * Clean all expired caches
   * This should be called when extension is triggered
   */
  async cleanExpiredCaches() {
    return new Promise((resolve) => {
      chrome.storage.local.get(null, (allData) => {
        const keysToDelete = [];
        
        for (const key in allData) {
          if (key.startsWith(this.CACHE_PREFIX)) {
            const cachedData = allData[key];
            if (cachedData && cachedData.timestamp && this.isExpired(cachedData.timestamp)) {
              keysToDelete.push(key);
            }
          }
        }

        if (keysToDelete.length > 0) {
          chrome.storage.local.remove(keysToDelete, () => {
            console.log(`[CacheManager] Cleaned ${keysToDelete.length} expired cache entries`);
            resolve(keysToDelete.length);
          });
        } else {
          resolve(0);
        }
      });
    });
  }

  /**
   * Get cache age in hours
   * @param {Number} timestamp - Cache timestamp
   * @returns {Number} Age in hours
   */
  getCacheAge(timestamp) {
    if (!timestamp) return null;
    const now = Date.now();
    const ageMs = now - timestamp;
    return (ageMs / (1000 * 60 * 60)).toFixed(2);
  }
}

// Export for ES6 modules
export default CacheManager;

// Also make available globally for browser
if (typeof window !== 'undefined') {
  window.CacheManager = CacheManager;
}

