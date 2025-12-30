/**
 * RelationshipContainerDTO.js
 * DTO for product_attributes.relationships[*]
 */

import RelationshipItemDTO from './relationship-item-dto.js';

class RelationshipContainerDTO {
  constructor(data) {
    if (!data || typeof data !== 'object') return;

    this.marketplaceId = data.marketplaceId ?? undefined;
    this.relationships = Array.isArray(data.relationships)
      ? data.relationships.map(r => new RelationshipItemDTO(r))
      : [];

    for (const [k, v] of Object.entries(data)) {
      if (!(k in this)) this[k] = v;
    }
  }
}

export default RelationshipContainerDTO;


