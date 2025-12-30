/**
 * CategoryNodeDTO.js
 * DTO for product_attributes.category element.
 */

class CategoryNodeDTO {
  constructor(data) {
    if (!data || typeof data !== 'object') return;
    Object.assign(this, data);
  }
}

export default CategoryNodeDTO;


