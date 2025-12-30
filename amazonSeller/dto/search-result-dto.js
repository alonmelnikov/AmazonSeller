/**
 * SearchResultDTO.js
 * Data Transfer Object for Keyword Search Result API response
 * Mirrors the JSON structure exactly - owns all properties from the JSON
 *
 * Expected response shape (per docs):
 * {
 *   search_results: [...],
 *   total_indexed_products: number,
 *   ...
 * }
 */

class SearchResultDTO {
  constructor(data) {
    if (!data) return;

    if (Array.isArray(data)) {
      // Defensive: if caller passes an array, treat it as search_results
      this.search_results = data;
      return;
    }

    if (typeof data === 'object') {
      // Copy ALL properties from JSON object to this DTO - mirror exactly
      Object.keys(data).forEach((key) => {
        this[key] = data[key];
      });
    }
  }
}

export default SearchResultDTO;


