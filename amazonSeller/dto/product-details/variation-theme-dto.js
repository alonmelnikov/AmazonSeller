/**
 * VariationThemeDTO.js
 * DTO for variationTheme objects within relationships.
 */

class VariationThemeDTO {
  constructor(data) {
    if (!data || typeof data !== 'object') return;
    Object.assign(this, data);
  }
}

export default VariationThemeDTO;


