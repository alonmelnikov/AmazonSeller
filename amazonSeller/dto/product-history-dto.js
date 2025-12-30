/**
 * ProductHistoryDTO.js
 * Data Transfer Object for Product History API response
 * Mirrors the JSON structure exactly - owns all properties from the JSON
 */

class ProductHistoryDTO {
  constructor(data) {
    if (!data) return;

    // Product History response is an object with keys like:
    // price_history, bsr_history, ratings_history, review_count_history,
    // new_product_sellers_history, used_product_sellers_history
    if (Array.isArray(data)) {
      // Defensive: if caller passes an array, treat it as price_history
      // (keeps rendering usable without inventing extra shapes).
      this.price_history = data;
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

export default ProductHistoryDTO;
