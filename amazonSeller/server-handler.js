// server-handler.js
// Centralized API/fetch logic for the Amazon Seller extension using SellerApp API

const BASE_URL = "https://api.sellerapp.com";

// IMPORTANT: Do not hardcode credentials in source control.
// Provide these at runtime (e.g., via extension settings / chrome.storage) before calling APIs.
const CLIENT_ID = "";
const TOKEN = "";

const getDefaultHeaders = () => ({
  "Content-Type": "application/json",
  "client-id": CLIENT_ID,  // Try with hyphen (common API format)
  "token": TOKEN,
});

/**
 * Test if the token is valid by making a simple API call
 * This can be called from the browser console to check token validity
 */
export async function testTokenValidity() {
  console.log('========================================');
  console.log('[API] Testing token validity...');
  console.log('[API] CLIENT_ID set:', Boolean(CLIENT_ID));
  console.log('[API] TOKEN set:', Boolean(TOKEN));
  console.log('[API] Headers:', getDefaultHeaders());
  console.log('========================================');
  
  // Try a simple API call with minimal parameters
  const testUrl = `${BASE_URL}/sellmetricsv2/products?product_specifications=1&geo=us&productIds=B086KY66PJ`;
  
  try {
    const response = await fetch(testUrl, {
      method: "GET",
      headers: getDefaultHeaders(),
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
  console.log('[API] getProductDetails - Headers:', JSON.stringify(getDefaultHeaders(), null, 2));
  console.log('[API] Credentials - clientID:', CLIENT_ID);
  console.log('[API] Credentials - token:', TOKEN);
  console.log('[API] Query params include clientID:', queryParams.includes('clientID'));
  console.log('[API] Query params include token:', queryParams.includes('token'));
  console.log('[API] About to call fetch()...');
  
  const response = await fetch(url, {
    method: "GET",
    headers: getDefaultHeaders(), // Headers also include clientID and token
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
            errorMessage += `\n❌ INVALID CREDENTIALS: ${errorData.error}\n\nPlease check your CLIENT_ID and TOKEN in server-handler.js`;
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
  
  const response = await fetch(url, {
    method: "GET",
    headers: getDefaultHeaders(),
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
  console.log('[API] getKeywordSearchResult - Headers:', getDefaultHeaders());

  const response = await fetch(url, {
    method: "GET",
    headers: getDefaultHeaders(),
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
  
  const response = await fetch(url, {
    method: "GET",
    headers: getDefaultHeaders(),
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
  
  const response = await fetch(url, {
    method: "GET",
    headers: getDefaultHeaders(),
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
