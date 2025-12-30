/**
 * PromotionsDTO.js
 * DTO for promotions.
 */

import PromoDetailDTO from './promo-detail-dto.js';

class PromotionsDTO {
  constructor(data) {
    if (!data || typeof data !== 'object') return;
    this.deals = Array.isArray(data.deals) ? data.deals : [];
    this.promo_details = Array.isArray(data.promo_details) ? data.promo_details.map(p => new PromoDetailDTO(p)) : [];

    for (const [k, v] of Object.entries(data)) {
      if (!(k in this)) this[k] = v;
    }
  }
}

export default PromotionsDTO;


