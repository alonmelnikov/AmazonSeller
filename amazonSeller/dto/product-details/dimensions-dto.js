/**
 * DimensionsDTO.js
 * DTO for item_dimensions / package_dimensions.
 */

class DimensionsDTO {
  constructor(data) {
    if (!data || typeof data !== 'object') return;
    Object.assign(this, data);
  }
}

export default DimensionsDTO;


