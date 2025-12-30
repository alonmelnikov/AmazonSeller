/**
 * ProductHistoryRepository.js
 * Repository for Product History API
 * Handles caching and API calls
 */

import { getProductHistory } from '../server-handler.js';
import ProductHistoryDTO from '../dto/product-history-dto.js';

class ProductHistoryRepository {
  constructor(cacheManager, isDebug = false) {
    this.cacheManager = cacheManager;
    this.isDebug = isDebug;
    this.apiName = 'productHistory';
  }

  /**
   * Get product history (from cache or API)
   * @param {String} productId - Product ASIN
   * @param {String} geo - Geographic region
   * @param {Number} days - Number of days
   * @returns {Promise<Object>} Product history
   */
  async get(productId, geo = "us", days = 30) {
    const params = { productId, geo, days };
    const cacheKey = this.cacheManager.getCacheKey(this.apiName, params);

    // Check cache first
    const cacheResult = await this.cacheManager.getCache(cacheKey);
    
    if (cacheResult) {
      if (this.isDebug) {
        console.log(`[${this.apiName}] ✅ Cache HIT${cacheResult.age ? ` - Age: ${cacheResult.age} hours` : ''}`);
        console.log(`[${this.apiName}] Cached data:`, cacheResult.data);
      }
      const dto = new ProductHistoryDTO(cacheResult.data.data);
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
      const result = await getProductHistory(productId, geo, days);
      
      // Store in cache
      await this.cacheManager.setCache(cacheKey, result);
      
      if (this.isDebug) {
        console.log(`[${this.apiName}] ✅ API call successful - Cached`);
      }

      const dto = new ProductHistoryDTO(result.data);
      return { url: result.url, data: dto, fromCache: false, raw: result.data };
    } catch (error) {
      if (this.isDebug) {
        console.error(`[${this.apiName}] ❌ API call failed:`, error);
      }
      throw error;
    }
  }
}

export default ProductHistoryRepository;

