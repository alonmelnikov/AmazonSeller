/**
 * CategoryProductsRepository.js
 * Repository for Category Products API
 * Handles caching and API calls
 */

import { getCategoryProducts } from '../server-handler.js';
import CategoryProductsDTO from '../dto/category-products-dto.js';

class CategoryProductsRepository {
  constructor(cacheManager, isDebug = false) {
    this.cacheManager = cacheManager;
    this.isDebug = isDebug;
    this.apiName = 'categoryProducts';
  }

  /**
   * Get category products (from cache or API)
   * @param {String} categoryId - Category ID
   * @param {String} geo - Geographic region
   * @param {Number} pageNumber - Page number
   * @param {Number} extendedResponse - Extended response flag
   * @returns {Promise<Object>} Category products
   */
  async get(categoryId, geo = "us", pageNumber = 1, extendedResponse = 1) {
    const params = { categoryId, geo, pageNumber, extendedResponse };
    const cacheKey = this.cacheManager.getCacheKey(this.apiName, params);

    // Check cache first
    const cacheResult = await this.cacheManager.getCache(cacheKey);
    
    if (cacheResult) {
      if (this.isDebug) {
        console.log(`[${this.apiName}] ✅ Cache HIT${cacheResult.age ? ` - Age: ${cacheResult.age} hours` : ''}`);
        console.log(`[${this.apiName}] Cached data:`, cacheResult.data);
      }
      const dto = new CategoryProductsDTO(cacheResult.data.data);
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
      const result = await getCategoryProducts(categoryId, geo, pageNumber, extendedResponse);
      
      // Store in cache
      await this.cacheManager.setCache(cacheKey, result);
      
      if (this.isDebug) {
        console.log(`[${this.apiName}] ✅ API call successful - Cached`);
      }

      const dto = new CategoryProductsDTO(result.data);
      return { url: result.url, data: dto, fromCache: false, raw: result.data };
    } catch (error) {
      if (this.isDebug) {
        console.error(`[${this.apiName}] ❌ API call failed:`, error);
      }
      throw error;
    }
  }
}

export default CategoryProductsRepository;

