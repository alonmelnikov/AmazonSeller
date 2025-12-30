/**
 * ProductDetailsDTO.js
 * Data Transfer Object for Product Details API response
 * Mirrors the JSON structure exactly (per-product element), based on SellerApp response.
 *
 * Example JSON (as returned by the API) is an ARRAY of objects:
 * [
 *   {
 *     product_attributes: {...},
 *     price_details: {...},
 *     fee_details: {...},
 *     product_potential: {...},
 *     product_specifications: {...},
 *     ratings: {...},
 *     promotions: {...}
 *   }
 * ]
 */

import ProductAttributesDTO from './product-details/product-attributes-dto.js';
import PriceDetailsDTO from './product-details/price-details-dto.js';
import ProductPotentialDTO from './product-details/product-potential-dto.js';
import ProductSpecificationsDTO from './product-details/product-specifications-dto.js';
import RatingsDTO from './product-details/ratings-dto.js';
import PromotionsDTO from './product-details/promotions-dto.js';

class ProductDetailsDTO {
  /**
   * @param {object|object[]} input - Either the API array response OR a single element object.
   */
  constructor(input) {
    const src =
      Array.isArray(input) ? (input[0] ?? {}) :
      (input ?? {});

    // These members mirror the JSON keys exactly, but are wrapped in nested DTOs.
    // (Nested DTOs still preserve any extra keys they don't explicitly model.)
    this.product_attributes = new ProductAttributesDTO(src.product_attributes ?? {});
    this.price_details = new PriceDetailsDTO(src.price_details ?? {});
    this.fee_details = src.fee_details ?? {}; // not modeled yet (leave as plain object)
    this.product_potential = new ProductPotentialDTO(src.product_potential ?? {});
    this.product_specifications = new ProductSpecificationsDTO(src.product_specifications ?? {});
    this.ratings = new RatingsDTO(src.ratings ?? {});
    this.promotions = new PromotionsDTO(src.promotions ?? {});

    // If the API later adds more top-level keys, preserve them too
    // (still as direct members on the DTO).
    for (const [k, v] of Object.entries(src)) {
      if (!(k in this)) this[k] = v;
    }
  }
}

export default ProductDetailsDTO;
