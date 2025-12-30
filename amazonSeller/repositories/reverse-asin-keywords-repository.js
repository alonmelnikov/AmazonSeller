/**
 * ReverseAsinKeywordsRepository.js
 * Repository for Reverse ASIN Keywords API
 * Handles caching and API calls
 */

import { getReverseAsinKeywords } from '../server-handler.js';
import ReverseAsinKeywordsDTO from '../dto/reverse-asin-keywords-dto.js';

class ReverseAsinKeywordsRepository {
  constructor(cacheManager, isDebug = false) {
    this.cacheManager = cacheManager;
    this.isDebug = isDebug;
    this.apiName = 'reverseAsinKeywords';
  }

  /**
   * Get reverse ASIN keywords (from cache or API)
   * @param {String} productId - Product ASIN
   * @param {String} geo - Geographic region
   * @param {Number} pageNumber - Page number
   * @param {Number} resultsCount - Number of results
   * @returns {Promise<Object>} Reverse ASIN keywords
   */
  async get(productId, geo = "us", pageNumber = 1, resultsCount = 50) {
    const params = { productId, geo, pageNumber, resultsCount };
    const cacheKey = this.cacheManager.getCacheKey(this.apiName, params);

    // Check cache first
    const cacheResult = await this.cacheManager.getCache(cacheKey);
    
    if (cacheResult) {
      if (this.isDebug) {
        console.log(`[${this.apiName}] ✅ Cache HIT${cacheResult.age ? ` - Age: ${cacheResult.age} hours` : ''}`);
        console.log(`[${this.apiName}] Cached data:`, cacheResult.data);
      }
      const dto = new ReverseAsinKeywordsDTO(cacheResult.data.data);
      return { 
        url: cacheResult.data.url, 
        data: dto,
        fromCache: true, 
        cacheAge: cacheResult.age,
        raw: cacheResult.data.data
      };
    }

    // Cache miss - fetch from API
    if (this.isDebug) {
      console.log(`[${this.apiName}] ❌ Cache MISS - Fetching from API...`);
    }

    try {
      const result = await getReverseAsinKeywords(productId, geo, pageNumber, resultsCount);
      
      // Store in cache
      await this.cacheManager.setCache(cacheKey, result);
      
      if (this.isDebug) {
        console.log(`[${this.apiName}] ✅ API call successful - Cached`);
      }

      const dto = new ReverseAsinKeywordsDTO(result.data);
      return { url: result.url, data: dto, fromCache: false, raw: result.data };
    } catch (error) {
      if (this.isDebug) {
        console.error(`[${this.apiName}] ❌ API call failed:`, error);
      }
      throw error;
    }
  }
}

export default ReverseAsinKeywordsRepository;

