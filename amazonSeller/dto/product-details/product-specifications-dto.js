/**
 * ProductSpecificationsDTO.js
 * DTO for product_specifications.
 */

import DimensionsDTO from './dimensions-dto.js';

class ProductSpecificationsDTO {
  constructor(data) {
    if (!data || typeof data !== 'object') return;

    this.gtin_code = data.gtin_code ?? undefined;
    this.upc_code = data.upc_code ?? undefined;
    this.is_adult_product = data.is_adult_product ?? undefined;
    this.model_number = data.model_number ?? undefined;
    this.part_number = data.part_number ?? undefined;
    this.parent_asins = data.parent_asins ?? undefined;
    this.number_of_items = data.number_of_items ?? undefined;
    this.batteries_required = data.batteries_required ?? undefined;

    this.package_dimensions = data.package_dimensions ? new DimensionsDTO(data.package_dimensions) : undefined;
    this.item_dimensions = data.item_dimensions ? new DimensionsDTO(data.item_dimensions) : undefined;

    // preserve any additional keys
    for (const [k, v] of Object.entries(data)) {
      if (!(k in this)) this[k] = v;
    }
  }
}

export default ProductSpecificationsDTO;


