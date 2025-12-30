/**
 * RelationshipItemDTO.js
 * DTO for individual relationship entries inside product_attributes.relationships[*].relationships[*]
 */

import VariationThemeDTO from './variation-theme-dto.js';

class RelationshipItemDTO {
  constructor(data) {
    if (!data || typeof data !== 'object') return;
    this.parentAsins = data.parentAsins ?? undefined;
    this.type = data.type ?? undefined;
    this.variationTheme = data.variationTheme ? new VariationThemeDTO(data.variationTheme) : undefined;

    for (const [k, v] of Object.entries(data)) {
      if (!(k in this)) this[k] = v;
    }
  }
}

export default RelationshipItemDTO;


