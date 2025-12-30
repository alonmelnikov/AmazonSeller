/**
 * SearchResultRepository.js
 * Repository for Keyword Search Result API
 * Handles caching and API calls
 */

import { getKeywordSearchResult } from '../server-handler.js';
import SearchResultDTO from '../dto/search-result-dto.js';

class SearchResultRepository {
  constructor(cacheManager, isDebug = false) {
    this.cacheManager = cacheManager;
    this.isDebug = isDebug;
    this.apiName = 'keywordSearchResult';
  }

  /**
   * Get keyword search results (from cache or API)
   * @param {String} search - keyword/search term
   * @param {String} geo - Amazon marketplace geo (us, uk, de, ...)
   * @param {Number} pageNumber - page number (default 1)
   * @param {Object} options
   * @param {Number} options.extendedResponse - 1 to include extended response
   * @param {String} options.sort - low-to-high | high-to-low | avg-review | newest-arrivals | best-seller
   * @param {Number} options.includeSponsoredResults - 1 to include sponsored
   * @returns {Promise<Object>} Keyword search result
   */
  async get(
    search,
    geo = "us",
    pageNumber = 1,
    {
      extendedResponse = 1,
      sort = undefined,
      includeSponsoredResults = undefined,
    } = {}
  ) {
    const params = { search, geo, pageNumber, extendedResponse, sort, includeSponsoredResults };
    const cacheKey = this.cacheManager.getCacheKey(this.apiName, params);

    // Check cache first
    const cacheResult = await this.cacheManager.getCache(cacheKey);

    if (cacheResult) {
      if (this.isDebug) {
        console.log(`[${this.apiName}] ✅ Cache HIT${cacheResult.age ? ` - Age: ${cacheResult.age} hours` : ''}`);
        console.log(`[${this.apiName}] Cached data:`, cacheResult.data);
      }
      const dto = new SearchResultDTO(cacheResult.data.data);
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
      const result = await getKeywordSearchResult(search, geo, pageNumber, {
        extendedResponse,
        sort,
        includeSponsoredResults,
      });

      // Store in cache
      await this.cacheManager.setCache(cacheKey, result);

      if (this.isDebug) {
        console.log(`[${this.apiName}] ✅ API call successful - Cached`);
      }

      const dto = new SearchResultDTO(result.data);
      return { url: result.url, data: dto, fromCache: false, raw: result.data };
    } catch (error) {
      if (this.isDebug) {
        console.error(`[${this.apiName}] ❌ API call failed:`, error);
      }
      throw error;
    }
  }
}

export default SearchResultRepository;


