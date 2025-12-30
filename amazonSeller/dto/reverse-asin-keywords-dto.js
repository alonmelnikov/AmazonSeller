/**
 * ReverseAsinKeywordsDTO.js
 * Data Transfer Object for Reverse ASIN Keywords API response
 * Mirrors the JSON structure exactly - owns all properties from the JSON
 */

class ReverseAsinKeywordsDTO {
  constructor(data) {
    if (!data) return;

    // Reverse ASIN response is an object with keys like:
    // title (string) and keyword_list (array)
    if (Array.isArray(data)) {
      // Defensive: if caller passes an array, treat it as keyword_list
      this.keyword_list = data;
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

export default ReverseAsinKeywordsDTO;
