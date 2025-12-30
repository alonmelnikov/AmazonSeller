/**
 * MoneyValueDTO.js
 * DTO for objects like:
 * { currency_code: "USD" }
 */

class MoneyValueDTO {
  constructor(data) {
    if (!data || typeof data !== 'object') return;
    Object.assign(this, data);
  }
}

export default MoneyValueDTO;


