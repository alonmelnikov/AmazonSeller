/**
 * RatingsDTO.js
 * DTO for ratings.
 * Example: { ratings: 4.7, number_of_ratings: 47306 }
 */

class RatingsDTO {
  constructor(data) {
    if (!data || typeof data !== 'object') return;
    Object.assign(this, data);
  }
}

export default RatingsDTO;


