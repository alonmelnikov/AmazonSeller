/**
 * PointsDTO.js
 * DTO for points objects like:
 * { points_monetary_value: { currency_code: "USD" } }
 */

import MoneyValueDTO from './money-value-dto.js';

class PointsDTO {
  constructor(data) {
    if (!data || typeof data !== 'object') return;
    this.points_monetary_value = data.points_monetary_value ? new MoneyValueDTO(data.points_monetary_value) : undefined;
    // preserve any additional keys
    for (const [k, v] of Object.entries(data)) {
      if (!(k in this)) this[k] = v;
    }
  }
}

export default PointsDTO;


