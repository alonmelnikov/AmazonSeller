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

/* =====================================================
 * PRODUCT DETAILS
 * ===================================================== */

/**
 * Get product details by ASIN
 * Endpoint: GET /sellmetricsv2/products
 */
export async function getProductDetails(productId, geo = "us") {
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
    headers: getDefaultHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch product details");
  return await response.json();
}

/* =====================================================
 * PRODUCT HISTORY
 * ===================================================== */

/**
 * Get product historical performance
 * Endpoint: GET /sellmetricsv2/producthistory
 */
export async function getProductHistory(productId, geo = "us", days = 30) {
  const params = new URLSearchParams({
    productIds: productId,
    geo,
    days,
  }).toString();

  const response = await fetch(`${BASE_URL}/sellmetricsv2/producthistory?${params}`, {
    method: "GET",
    headers: getDefaultHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch product history");
  return await response.json();
}

/* =====================================================
 * KEYWORD SEARCH RESULT
 * ===================================================== */

/**
 * Get keyword search results (search volume, CPC, competition, etc.)
 * Endpoint: GET /sellmetricsv2/keywords
 */
export async function getKeywordSearchResult(keyword, geo = "us") {
  const params = new URLSearchParams({
    keyword,
    geo,
  }).toString();

  const response = await fetch(`${BASE_URL}/sellmetricsv2/keywords?${params}`, {
    method: "GET",
    headers: getDefaultHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch keyword search result");
  return await response.json();
}

/* =====================================================
 * KEYWORD RESEARCH / REVERSE ASIN
 * ===================================================== */

/**
 * Reverse ASIN keyword research — get keywords ranked for a given ASIN
 * Endpoint: GET /sellmetricsv2/reverseasin
 */
export async function getReverseAsinKeywords(productId, geo = "us") {
  const params = new URLSearchParams({
    productIds: productId,
    geo,
  }).toString();

  const response = await fetch(`${BASE_URL}/sellmetricsv2/reverseasin?${params}`, {
    method: "GET",
    headers: getDefaultHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch reverse ASIN keywords");
  return await response.json();
}

/* =====================================================
 * CATEGORY PRODUCTS
 * ===================================================== */

/**
 * Get top products under a specific category
 * Endpoint: GET /sellmetricsv2/categoryproducts
 */
export async function getCategoryProducts(categoryId, geo = "us", limit = 20, page = 1) {
  const params = new URLSearchParams({
    categoryId,
    geo,
    limit,
    page,
  }).toString();

  const response = await fetch(`${BASE_URL}/sellmetricsv2/categoryproducts?${params}`, {
    method: "GET",
    headers: getDefaultHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch category products");
  return await response.json();
}

/* =====================================================
 * EXPORT ALL
 * ===================================================== */
export default {
  getProductDetails,
  getProductHistory,
  getKeywordSearchResult,
  getReverseAsinKeywords,
  getCategoryProducts,
};
