// server-handler.js
// Centralized API/fetch logic for the Amazon Seller extension using SellerApp API

const BASE_URL = "https://api.sellerapp.com";

// SellerApp credentials
// NOTE: You asked to restore these values directly into the code.
// If you prefer the safer approach later, you can override them via chrome.storage.local.
const DEFAULT_CLIENT_ID = "tomer19839";
const DEFAULT_TOKEN = "c80beda6-e609-400d-9559-7fa46dc1e53d";

const AUTH_STORAGE_KEYS = {
  clientId: "sellerAppClientId",
  token: "sellerAppToken",
};

function hasChromeStorage() {
  return typeof chrome !== "undefined" && chrome?.storage?.local?.get && chrome?.storage?.local?.set;
}

function storageGet(keys) {
  return new Promise((resolve) => chrome.storage.local.get(keys, (result) => resolve(result || {})));
}

function storageSet(obj) {
  return new Promise((resolve) => chrome.storage.local.set(obj, () => resolve()));
}

let authCache = null;

async function getSellerAppAuth({ forceReload = false } = {}) {
  if (!forceReload && authCache) return authCache;
  if (!hasChromeStorage()) {
    authCache = { clientId: DEFAULT_CLIENT_ID, token: DEFAULT_TOKEN };
    return authCache;
  }

  const res = await storageGet([AUTH_STORAGE_KEYS.clientId, AUTH_STORAGE_KEYS.token]);
  const storedClientId = res[AUTH_STORAGE_KEYS.clientId] || "";
  const storedToken = res[AUTH_STORAGE_KEYS.token] || "";
  authCache = {
    clientId: storedClientId || DEFAULT_CLIENT_ID,
    token: storedToken || DEFAULT_TOKEN,
  };
  return authCache;
}

async function getDefaultHeaders() {
  const { clientId, token } = await getSellerAppAuth();
  return {
    "Content-Type": "application/json",
    "client-id": clientId,
    token,
  };
}

export async function setSellerAppCredentials({ clientId, token }) {
  if (!hasChromeStorage()) throw new Error("chrome.storage.local is not available in this context.");
  await storageSet({
    [AUTH_STORAGE_KEYS.clientId]: clientId ?? "",
    [AUTH_STORAGE_KEYS.token]: token ?? "",
  });
  await getSellerAppAuth({ forceReload: true });
  return { ok: true };
}

/**
 * Test if the token is valid by making a simple API call
 * This can be called from the browser console to check token validity
 */
export async function testTokenValidity() {
  console.log('========================================');
  console.log('[API] Testing token validity...');
  const auth = await getSellerAppAuth();
  console.log('[API] sellerAppClientId set:', Boolean(auth.clientId));
  console.log('[API] sellerAppToken set:', Boolean(auth.token));
  console.log('========================================');
  
  // Try a simple API call with minimal parameters
  const testUrl = `${BASE_URL}/sellmetricsv2/products?product_specifications=1&geo=us&productIds=B086KY66PJ`;
  
  try {
    const headers = await getDefaultHeaders();
    const response = await fetch(testUrl, {
      method: "GET",
      headers,
    });
    
    console.log('[API] Test Response Status:', response.status, response.statusText);
    console.log('[API] Test Response Headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('[API] Test Response Body:', responseText);
    
    if (response.ok) {
      console.log('✅ TOKEN IS VALID - API call succeeded!');
      return { valid: true, message: 'Token is valid' };
    } else {
      const errorData = JSON.parse(responseText);
      console.error('❌ TOKEN VALIDATION FAILED');
      console.error('Status:', response.status);
      console.error('Error:', errorData);
      
      if (response.status === 401) {
        if (errorData.error && errorData.error.includes('expired')) {
          return { valid: false, message: 'Token is expired', error: errorData };
        } else if (errorData.error && errorData.error.includes('invalid')) {
          return { valid: false, message: 'Token is invalid', error: errorData };
        } else {
          return { valid: false, message: 'Authentication failed - check credentials', error: errorData };
        }
      }
      
      return { valid: false, message: `API returned status ${response.status}`, error: errorData };
    }
  } catch (error) {
    console.error('❌ ERROR testing token:', error);
    return { valid: false, message: 'Error testing token: ' + error.message, error };
  }
}

// Make testTokenValidity available globally for console testing
if (typeof window !== 'undefined') {
  window.testTokenValidity = testTokenValidity;
  window.setSellerAppCredentials = setSellerAppCredentials;
}

/* =====================================================
 * PRODUCT DETAILS
 * ===================================================== */

/**
 * Get product details by ASIN
 * Endpoint: GET /sellmetricsv2/products
 */
export async function getProductDetails(productId, geo = "us") {
  console.log('========================================');
  console.log('[API] getProductDetails() CALLED');
  console.log('[API] productId:', productId);
  console.log('[API] geo:', geo);
  console.log('[API] Time:', new Date().toISOString());
  console.log('========================================');
  
  // Query params should NOT include credentials - they go in headers only
  const queryParams = new URLSearchParams({
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

  const url = `${BASE_URL}/sellmetricsv2/products?${queryParams}`;
  console.log('[API] getProductDetails - Full URL:', url);
  console.log('[API] Query params include clientID:', queryParams.includes('clientID'));
  console.log('[API] Query params include token:', queryParams.includes('token'));
  console.log('[API] About to call fetch()...');

  const headers = await getDefaultHeaders();
  console.log('[API] getProductDetails - Auth headers set:', {
    'client-id': Boolean(headers['client-id']),
    token: Boolean(headers.token),
  });
  
  const response = await fetch(url, {
    method: "GET",
    headers,
  });
  
  console.log('[API] getProductDetails - Response status:', response.status, response.statusText);
  
  if (!response.ok) {
    let errorMessage = `Failed to fetch product details: ${response.status} ${response.statusText}`;
    try {
      const errorBody = await response.text();
      console.error('[API] getProductDetails - Error response body:', errorBody);
      
      // Check for token expiration or invalid credentials
      try {
        const errorData = JSON.parse(errorBody);
        if (errorData.error) {
          if (errorData.error.toLowerCase().includes('expired')) {
            errorMessage += `\n❌ TOKEN EXPIRED: ${errorData.error}\n\nPlease get a new token from SellerApp.`;
          } else if (errorData.error.toLowerCase().includes('invalid')) {
            errorMessage += `\n❌ INVALID CREDENTIALS: ${errorData.error}\n\nPlease verify ${AUTH_STORAGE_KEYS.clientId} and ${AUTH_STORAGE_KEYS.token} in chrome.storage.local.`;
          } else {
            errorMessage += `\nResponse: ${errorBody}`;
          }
        } else {
          errorMessage += `\nResponse: ${errorBody}`;
        }
      } catch (e) {
        errorMessage += `\nResponse: ${errorBody}`;
      }
    } catch (e) {
      console.error('[API] getProductDetails - Could not read error response');
    }
    throw new Error(errorMessage);
  }
  
  const data = await response.json();
  console.log('[API] getProductDetails - Success!');
  console.log('[API] getProductDetails - Response data type:', typeof data);
  console.log('[API] getProductDetails - Response data length:', JSON.stringify(data).length);
  console.log('[API] getProductDetails - Returning {url, data}');
  console.log('========================================');
  return { url, data };
}

/* =====================================================
 * PRODUCT HISTORY
 * ===================================================== */

/**
 * Get product historical performance
 * Endpoint: GET /sellmetricsv2/products/history
 */
export async function getProductHistory(productId, geo = "us", days = 30) {
  console.log('========================================');
  console.log('[API] getProductHistory() CALLED');
  console.log('[API] productId:', productId);
  console.log('[API] geo:', geo);
  console.log('[API] days:', days);
  console.log('[API] Time:', new Date().toISOString());
  console.log('========================================');
  
  // Convert geo to uppercase for the API
  const geoUpper = geo.toUpperCase();
  
  const params = new URLSearchParams({
    productId: productId,  // Note: singular, not plural
    geo: geoUpper,
    days: days.toString(),
    price: "1",
    bsr: "1",
    rating: "1",
    review_count: "1",
    sellers_count: "1",
  }).toString();

  const url = `${BASE_URL}/sellmetricsv2/products/history?${params}`;
  console.log('[API] getProductHistory - URL:', url);
  console.log('[API] About to call fetch()...');

  const headers = await getDefaultHeaders();
  
  const response = await fetch(url, {
    method: "GET",
    headers,
  });
  
  console.log('[API] getProductHistory - Response status:', response.status, response.statusText);
  
  if (!response.ok) {
    let errorMessage = `Failed to fetch product history: ${response.status} ${response.statusText}`;
    try {
      const errorBody = await response.text();
      console.error('[API] getProductHistory - Error response body:', errorBody);
      errorMessage += `\nResponse: ${errorBody}`;
    } catch (e) {
      console.error('[API] getProductHistory - Could not read error response');
    }
    throw new Error(errorMessage);
  }
  
  const data = await response.json();
  console.log('[API] getProductHistory - Success!');
  console.log('[API] getProductHistory - Response data type:', typeof data);
  console.log('[API] getProductHistory - Response data length:', JSON.stringify(data).length);
  console.log('[API] getProductHistory - Returning {url, data}');
  console.log('========================================');
  return { url, data };
}

/* =====================================================
 * KEYWORD SEARCH RESULT
 * ===================================================== */

/**
 * Keyword Search Result
 * Endpoint: GET /sellmetricsv2/keyword_search_result
 *
 * Docs (from SellerApp):
 * - Required params: geo, search
 * - Optional: pagenumber, sort, include_sponsored_results, extended_response
 * - Auth: headers "client-id" and "token"
 */
export async function getKeywordSearchResult(
  search,
  geo = "us",
  pageNumber = 1,
  {
    extendedResponse = 1,
    sort = undefined,
    includeSponsoredResults = undefined,
  } = {}
) {
  const paramsObj = {
    geo: String(geo).toLowerCase(),
    search: String(search),
    pagenumber: String(pageNumber),
    extended_response: String(extendedResponse),
  };

  // Optional params only when provided
  if (sort) paramsObj.sort = String(sort);
  if (includeSponsoredResults !== undefined && includeSponsoredResults !== null) {
    paramsObj.include_sponsored_results = String(includeSponsoredResults);
  }

  const params = new URLSearchParams(paramsObj).toString();
  const url = `${BASE_URL}/sellmetricsv2/keyword_search_result?${params}`;

  console.log('[API] getKeywordSearchResult - URL:', url);
  const headers = await getDefaultHeaders();
  console.log('[API] getKeywordSearchResult - Auth headers set:', {
    'client-id': Boolean(headers['client-id']),
    token: Boolean(headers.token),
  });

  const response = await fetch(url, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    let errorMessage = `Failed to fetch keyword search result: ${response.status} ${response.statusText}`;
    try {
      const errorBody = await response.text();
      console.error('[API] getKeywordSearchResult - Error response body:', errorBody);
      errorMessage += `\nResponse: ${errorBody}`;
    } catch (e) {
      console.error('[API] getKeywordSearchResult - Could not read error response');
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  return { url, data };
}

/* =====================================================
 * KEYWORD RESEARCH / REVERSE ASIN
 * ===================================================== */

/**
 * Reverse ASIN keyword research — get keywords ranked for a given ASIN
 * Endpoint: GET /sellmetricsv2/keyword_research
 * 
 * Required parameters:
 * - type: "asin" or "keyword"
 * - key: ASIN (when type=asin) or keyword (when type=keyword)
 * - geo: us, uk, ca, in
 * 
 * Optional parameters:
 * - pagenumber: pagination parameter
 * - results_count: Number of results (multiples of 50, less than 500, default 50)
 */
export async function getReverseAsinKeywords(productId, geo = "us", pageNumber = 1, resultsCount = 50) {
  console.log('========================================');
  console.log('[API] getReverseAsinKeywords() CALLED');
  console.log('[API] productId:', productId);
  console.log('[API] geo:', geo);
  console.log('[API] pageNumber:', pageNumber);
  console.log('[API] resultsCount:', resultsCount);
  console.log('[API] Time:', new Date().toISOString());
  console.log('========================================');
  
  const params = new URLSearchParams({
    type: "asin",
    key: productId,
    geo: geo.toLowerCase(),  // Keep lowercase: us, uk, ca, in
    pagenumber: pageNumber.toString(),
    results_count: resultsCount.toString(),
  }).toString();

  const url = `${BASE_URL}/sellmetricsv2/keyword_research?${params}`;
  console.log('[API] getReverseAsinKeywords - URL:', url);
  console.log('[API] About to call fetch()...');

  const headers = await getDefaultHeaders();
  
  const response = await fetch(url, {
    method: "GET",
    headers,
  });
  
  console.log('[API] getReverseAsinKeywords - Response status:', response.status, response.statusText);
  
  if (!response.ok) {
    let errorMessage = `Failed to fetch reverse ASIN keywords: ${response.status} ${response.statusText}`;
    try {
      const errorBody = await response.text();
      console.error('[API] getReverseAsinKeywords - Error response body:', errorBody);
      errorMessage += `\nResponse: ${errorBody}`;
    } catch (e) {
      console.error('[API] getReverseAsinKeywords - Could not read error response');
    }
    throw new Error(errorMessage);
  }
  
  const data = await response.json();
  console.log('[API] getReverseAsinKeywords - Success!');
  console.log('[API] getReverseAsinKeywords - Response data type:', typeof data);
  console.log('[API] getReverseAsinKeywords - Response data length:', JSON.stringify(data).length);
  console.log('[API] getReverseAsinKeywords - Returning {url, data}');
  console.log('========================================');
  return { url, data };
}

/* =====================================================
 * CATEGORY PRODUCTS
 * ===================================================== */

/**
 * Get top products under a specific category
 * Endpoint: GET /sellmetricsv2/category_products
 * 
 * Required parameters:
 * - category_id: The category or node ID
 * - geo: us, uk, de, fr, br, ca, mx, ae, eg, es, in, it, nl, sa, se, tr, sg, au, jp, cn, pl, be
 * 
 * Optional parameters:
 * - pagenumber: Page number (default: 1)
 * - extended_response: Pass 1 to get extended response (default: 1)
 */
export async function getCategoryProducts(categoryId, geo = "us", pageNumber = 1, extendedResponse = 1) {
  console.log('========================================');
  console.log('[API] getCategoryProducts() CALLED');
  console.log('[API] categoryId:', categoryId);
  console.log('[API] geo:', geo);
  console.log('[API] pageNumber:', pageNumber);
  console.log('[API] extendedResponse:', extendedResponse);
  console.log('[API] Time:', new Date().toISOString());
  console.log('========================================');
  
  const params = new URLSearchParams({
    category_id: categoryId,
    geo: geo.toLowerCase(),
    pagenumber: pageNumber.toString(),
    extended_response: extendedResponse.toString(),
  }).toString();

  const url = `${BASE_URL}/sellmetricsv2/category_products?${params}`;
  console.log('[API] getCategoryProducts - URL:', url);
  console.log('[API] About to call fetch()...');

  const headers = await getDefaultHeaders();
  
  const response = await fetch(url, {
    method: "GET",
    headers,
  });
  
  console.log('[API] getCategoryProducts - Response status:', response.status, response.statusText);
  
  if (!response.ok) {
    let errorMessage = `Failed to fetch category products: ${response.status} ${response.statusText}`;
    try {
      const errorBody = await response.text();
      console.error('[API] getCategoryProducts - Error response body:', errorBody);
      errorMessage += `\nResponse: ${errorBody}`;
    } catch (e) {
      console.error('[API] getCategoryProducts - Could not read error response');
    }
    throw new Error(errorMessage);
  }
  
  const data = await response.json();
  console.log('[API] getCategoryProducts - Success!');
  console.log('[API] getCategoryProducts - Response data type:', typeof data);
  console.log('[API] getCategoryProducts - Response data length:', JSON.stringify(data).length);
  console.log('[API] getCategoryProducts - Returning {url, data}');
  console.log('========================================');
  return { url, data };
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
