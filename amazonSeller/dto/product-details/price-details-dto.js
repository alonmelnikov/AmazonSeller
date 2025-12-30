/**
 * PriceDetailsDTO.js
 * DTO for price_details.
 */

import PointsDTO from './points-dto.js';

class PriceDetailsDTO {
  constructor(data) {
    if (!data || typeof data !== 'object') return;

    this.landed_price_new = data.landed_price_new ?? undefined;
    this.listing_price_new = data.listing_price_new ?? undefined;
    this.currency_code = data.currency_code ?? undefined;

    this.points_new = data.points_new ? new PointsDTO(data.points_new) : undefined;
    this.points_used = data.points_used ? new PointsDTO(data.points_used) : undefined;

    // preserve any additional keys
    for (const [k, v] of Object.entries(data)) {
      if (!(k in this)) this[k] = v;
    }
  }
}

export default PriceDetailsDTO;


