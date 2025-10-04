// serverHandler.js
// Centralized API/fetch logic for the Amazon Seller extension using SellerApp API

const BASE_URL = "https://api.sellerapp.com";

const CLIENT_ID = "tomer19839";
const TOKEN = "c80beda6-e609-400d-9559-7fa46dc1e53d";

const getDefaultHeaders = () => ({
  "Content-Type": "application/json",
  "clientid": CLIENT_ID,
  "token": TOKEN,
});

/**
 * Get product details by product ID (ASIN)
 * Endpoint: GET /sellmetricsv2/products?product_specifications=1&potential_detail=1...
 * @param {string} productId - The ASIN or product ID
 * @param {string} [geo='us'] - (optional) Marketplace geo code, default is 'us'
 * @returns {Promise<Object>} Product details
 */
export async function getProductDetails(productId, geo = 'us') {
  const params = new URLSearchParams({
    product_specifications: 1,
    potential_detail: 1,
    price_detail: 1,
    fee_detail: 1,
    ratings: 1,
    promotions: 1,
    realtime_data: 1,
    geo,
    productIds: productId,
  }).toString();

  const response = await fetch(`${BASE_URL}/sellmetricsv2/products?${params}`, {
    method: "GET",
    headers: getDefaultHeaders()
  });
  if (!response.ok) throw new Error("Failed to fetch product details");
  return await response.json();
}

// You can add additional API wrapper functions for history, category, and keyword research as needed.
