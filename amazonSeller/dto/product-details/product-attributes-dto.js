/**
 * ProductAttributesDTO.js
 * DTO for product_attributes.
 */

import CategoryNodeDTO from './category-node-dto.js';
import BsrNodeDTO from './bsr-node-dto.js';
import RelationshipContainerDTO from './relationship-container-dto.js';

class ProductAttributesDTO {
  constructor(data) {
    if (!data || typeof data !== 'object') return;

    // Common scalar fields (still preserve everything below)
    this.asin = data.asin ?? undefined;
    this.title = data.title ?? undefined;
    this.brand = data.brand ?? undefined;
    this.url = data.url ?? undefined;
    this.manufacturer = data.manufacturer ?? undefined;
    this.date_first_available = data.date_first_available ?? undefined;
    this.number_of_sellers = data.number_of_sellers ?? undefined;

    this.image_urls = Array.isArray(data.image_urls) ? data.image_urls : [];
    this.key_points = Array.isArray(data.key_points) ? data.key_points : [];

    this.category = Array.isArray(data.category) ? data.category.map(c => new CategoryNodeDTO(c)) : [];
    this.bsr = Array.isArray(data.bsr) ? data.bsr.map(b => new BsrNodeDTO(b)) : [];

    this.relationships = Array.isArray(data.relationships)
      ? data.relationships.map(r => new RelationshipContainerDTO(r))
      : [];

    // additional_attributes is a very large, dynamic object; keep as-is
    this.additional_attributes = data.additional_attributes ?? {};

    // preserve any additional keys
    for (const [k, v] of Object.entries(data)) {
      if (!(k in this)) this[k] = v;
    }
  }
}

export default ProductAttributesDTO;


