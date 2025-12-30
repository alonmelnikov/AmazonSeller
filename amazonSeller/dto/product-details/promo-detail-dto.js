/**
 * PromoDetailDTO.js
 * DTO for promotions.promo_details items.
 */

class PromoDetailDTO {
  constructor(data) {
    if (!data || typeof data !== 'object') return;
    Object.assign(this, data);
  }
}

export default PromoDetailDTO;


