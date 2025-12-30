/**
 * ProductPotentialDTO.js
 * DTO for product_potential.
 */

class ProductPotentialDTO {
  constructor(data) {
    if (!data || typeof data !== 'object') return;
    Object.assign(this, data);
  }
}

export default ProductPotentialDTO;


