/**
 * CategoryProductsDTO.js
 * Data Transfer Object for Category Products API response
 * Mirrors the JSON structure exactly - owns all properties from the JSON
 */

class CategoryProductsDTO {
  constructor(data) {
    if (!data) return;

    // Category Products response is an object with keys like:
    // search_results (array) and total_indexed_products (number)
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

export default CategoryProductsDTO;
