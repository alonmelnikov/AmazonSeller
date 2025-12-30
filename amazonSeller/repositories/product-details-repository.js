/**
 * ProductDetailsRepository.js
 * Repository for Product Details API
 * Handles caching and API calls
 */

import { getProductDetails } from '../server-handler.js';
import ProductDetailsDTO from '../dto/product-details-dto.js';

class ProductDetailsRepository {
  constructor(cacheManager, isDebug = false) {
    this.cacheManager = cacheManager;
    this.isDebug = isDebug;
    this.apiName = 'productDetails';
  }

  /**
   * Get product details (from cache or API)
   * @param {String} productId - Product ASIN
   * @param {String} geo - Geographic region
   * @returns {Promise<Object>} Product details
   */
  async get(productId, geo = "us") {
    const params = { productId, geo };
    const cacheKey = this.cacheManager.getCacheKey(this.apiName, params);

    // Check cache first
    const cacheResult = await this.cacheManager.getCache(cacheKey);
    
    if (cacheResult) {
      if (this.isDebug) {
        console.log(`[${this.apiName}] ✅ Cache HIT${cacheResult.age ? ` - Age: ${cacheResult.age} hours` : ''}`);
        console.log(`[${this.apiName}] Cached data:`, cacheResult.data);
      }
      const dto = new ProductDetailsDTO(cacheResult.data.data);
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
      const result = await getProductDetails(productId, geo);
      
      // Store in cache
      await this.cacheManager.setCache(cacheKey, result);
      
      if (this.isDebug) {
        console.log(`[${this.apiName}] ✅ API call successful - Cached`);
      }

      const dto = new ProductDetailsDTO(result.data);
      return { url: result.url, data: dto, fromCache: false, raw: result.data };
    } catch (error) {
      if (this.isDebug) {
        console.error(`[${this.apiName}] ❌ API call failed:`, error);
      }
      throw error;
    }
  }
}

export default ProductDetailsRepository;

