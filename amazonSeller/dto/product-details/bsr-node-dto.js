/**
 * BsrNodeDTO.js
 * DTO for product_attributes.bsr element.
 */

class BsrNodeDTO {
  constructor(data) {
    if (!data || typeof data !== 'object') return;
    Object.assign(this, data);
  }
}

export default BsrNodeDTO;


