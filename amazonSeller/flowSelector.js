import { getProductDetails, getProductHistory, getReverseAsinKeywords, getCategoryProducts } from './serverHandler.js';

console.log('========================================');
console.log('[FlowSelector] Module loaded at:', new Date().toISOString());
console.log('[FlowSelector] Functions available:', {
  getProductDetails: typeof getProductDetails,
  getProductHistory: typeof getProductHistory,
  getReverseAsinKeywords: typeof getReverseAsinKeywords,
  getCategoryProducts: typeof getCategoryProducts
});
console.log('========================================');

function getASINFromContentScript(callback) {
  console.log('========================================');
  console.log('[FlowSelector] getASINFromContentScript() CALLED');
  console.log('[FlowSelector] Starting ASIN search...');
  console.log('========================================');
  
  // First, try to inject content script if needed, then find Amazon tabs
  chrome.tabs.query({url: "*://*.amazon.com/*"}, (amazonTabs) => {
    console.log(`[FlowSelector] Found ${amazonTabs ? amazonTabs.length : 0} Amazon tabs`);
    
    if (amazonTabs && amazonTabs.length > 0) {
      // Sort by last accessed time (activeWindow first, then by index)
      amazonTabs.sort((a, b) => {
        if (a.active && a.windowId === chrome.windows.WINDOW_ID_CURRENT) return -1;
        if (b.active && b.windowId === chrome.windows.WINDOW_ID_CURRENT) return 1;
        return (b.lastAccessed || 0) - (a.lastAccessed || 0);
      });
      
      // Try each Amazon tab until we find one with ASIN
      let tabIndex = 0;
      const tryNextTab = () => {
        if (tabIndex >= amazonTabs.length) {
          console.error('[FlowSelector] ❌ No ASIN found in any Amazon tab');
          console.error('[FlowSelector] Tried tabs:', amazonTabs.map(t => t.url));
          callback(null);
          return;
        }
        
        const tab = amazonTabs[tabIndex];
        console.log(`[FlowSelector] Trying tab ${tabIndex + 1}/${amazonTabs.length}: ${tab.url}`);
        
        // First, try to inject the content script if it's not already there
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        }).then(() => {
          console.log(`[FlowSelector] Content script injected into tab ${tab.id}`);
          
          // Wait a bit for script to load, then send message
          setTimeout(() => {
            chrome.tabs.sendMessage(
              tab.id,
              { action: "scrapeProductInfo" },
              (res) => {
                if (chrome.runtime.lastError) {
                  console.warn(`[FlowSelector] Error with tab ${tab.url}:`, chrome.runtime.lastError.message);
                  // Try next tab
                  tabIndex++;
                  tryNextTab();
                  return;
                }
                console.log(`[FlowSelector] Response from tab:`, res);
                if (res && res.asin) {
                  console.log(`[FlowSelector] ✅ Found ASIN "${res.asin}" in tab: ${tab.url}`);
                  callback(res.asin, res);
                } else {
                  console.warn(`[FlowSelector] No ASIN in response from tab: ${tab.url}`, res);
                  // No ASIN in this tab, try next
                  tabIndex++;
                  tryNextTab();
                }
              }
            );
          }, 500); // Wait 500ms for script to initialize
        }).catch((error) => {
          console.error(`[FlowSelector] Failed to inject script into tab ${tab.id}:`, error);
          // Try sending message anyway (script might already be there)
          chrome.tabs.sendMessage(
            tab.id,
            { action: "scrapeProductInfo" },
            (res) => {
              if (chrome.runtime.lastError) {
                console.warn(`[FlowSelector] Error with tab ${tab.url}:`, chrome.runtime.lastError.message);
                tabIndex++;
                tryNextTab();
                return;
              }
              if (res && res.asin) {
                console.log(`[FlowSelector] ✅ Found ASIN "${res.asin}" in tab: ${tab.url}`);
                callback(res.asin, res);
              } else {
                console.warn(`[FlowSelector] No ASIN found in tab: ${tab.url}`, res);
                tabIndex++;
                tryNextTab();
              }
            }
          );
        });
      };
      
      tryNextTab();
    } else {
      // No Amazon tabs found, try active tab anyway
      console.warn('[FlowSelector] No Amazon tabs found, trying active tab');
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (!tabs[0]?.id) {
          console.error('[FlowSelector] No active tab found');
          callback(null);
          return;
        }
        
        const tab = tabs[0];
        console.log(`[FlowSelector] Trying active tab: ${tab.url}`);
        
        // Try to inject content script
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        }).then(() => {
          setTimeout(() => {
            chrome.tabs.sendMessage(
              tab.id,
              { action: "scrapeProductInfo" },
              (res) => {
                if (chrome.runtime.lastError || !res || !res.asin) {
                  console.error('[FlowSelector] No content script found or not an Amazon page:', chrome.runtime.lastError);
                  console.error('[FlowSelector] Response:', res);
                  callback(null);
                  return;
                }
                console.log(`[FlowSelector] ✅ Found ASIN "${res.asin}" in active tab`);
                callback(res.asin, res);
              }
            );
          }, 500);
        }).catch((error) => {
          console.error('[FlowSelector] Failed to inject script:', error);
          // Try anyway
          chrome.tabs.sendMessage(
            tab.id,
            { action: "scrapeProductInfo" },
            (res) => {
              if (chrome.runtime.lastError || !res || !res.asin) {
                console.error('[FlowSelector] No ASIN found:', chrome.runtime.lastError, res);
                callback(null);
                return;
              }
              callback(res.asin, res);
            }
          );
        });
      });
    }
  });
}

// Helper function to display status on screen
function displayStatus(message, isError = false) {
  console.log('========================================');
  console.log('[FlowSelector] displayStatus() CALLED');
  console.log('[FlowSelector] isError:', isError);
  console.log('[FlowSelector] message length:', message.length);
  console.log('[FlowSelector] message preview:', message.substring(0, 100) + '...');
  console.log('[FlowSelector] Full message:', message);
  const statusDisplay = document.getElementById('statusDisplay');
  if (!statusDisplay) {
    console.error('[FlowSelector] statusDisplay element not found!');
    // Try to find it again
    setTimeout(() => {
      const retry = document.getElementById('statusDisplay');
      if (retry) {
        console.log('[FlowSelector] Found statusDisplay on retry');
        updateStatusDisplay(retry, message, isError);
      } else {
        console.error('[FlowSelector] statusDisplay still not found after retry');
        alert('Status display not found! Message: ' + message.substring(0, 100));
      }
    }, 100);
    return;
  }
  updateStatusDisplay(statusDisplay, message, isError);
}

function updateStatusDisplay(element, message, isError) {
  element.textContent = message;
  element.className = isError ? 'error' : 'success';
  // Force display with important styles
  element.style.display = 'block';
  element.style.visibility = 'visible';
  element.style.opacity = '1';
  element.style.background = isError ? '#ffe0e0' : 'rgba(255, 255, 255, 0.95)';
  element.style.color = isError ? '#c92a2a' : '#333';
  element.style.padding = '20px';
  element.style.marginTop = '30px';
  element.style.fontSize = '0.9em';
  element.style.textAlign = 'left';
  element.style.fontFamily = "'Courier New', monospace";
  element.style.border = '3px solid #fff';
  element.style.borderRadius = '12px';
  element.style.maxWidth = '95%';
  element.style.maxHeight = '70vh';
  element.style.overflowY = 'auto';
  element.style.whiteSpace = 'pre-wrap';
  element.style.wordWrap = 'break-word';
  // Scroll into view
  element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  console.log('[FlowSelector] Status display updated successfully');
}

// Helper function to extract ASIN from URL
function extractASIN(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    // 1) Look for /dp/ASIN
    let match = u.pathname.match(/\/dp\/([A-Z0-9]{10})(?:[/?]|$)/i);
    if (match) return match[1].toUpperCase();
    // 2) Look for /gp/product/ASIN
    match = u.pathname.match(/\/product\/([A-Z0-9]{10})(?:[/?]|$)/i);
    if (match) return match[1].toUpperCase();
    // 3) Look for "asin=" in query string
    match = u.search.match(/asin=([A-Z0-9]{10})/i);
    if (match) return match[1].toUpperCase();
    // 4) Look for data-asin inside URL fragments
    match = url.match(/([A-Z0-9]{10})(?=[/?&]|$)/i);
    if (match) return match[1].toUpperCase();
  } catch (e) {
    console.error("Invalid URL:", e);
    return null;
  }
  return null;
}

async function selectFlow(flow) {
  console.log('========================================');
  console.log('[FlowSelector] selectFlow() CALLED');
  console.log('[FlowSelector] flow parameter:', flow);
  console.log('[FlowSelector] typeof flow:', typeof flow);
  console.log('[FlowSelector] Current time:', new Date().toISOString());
  console.log('========================================');
  
  // Immediately show that button was clicked
  const initialMessage = '⏳ Button clicked! Flow ' + flow + ' starting...\n\n🔍 Step 1: Searching for ASIN...\n\nPlease wait...';
  console.log('[FlowSelector] Calling displayStatus with initial message');
  displayStatus(initialMessage);
  
  try {
    // First try: Get ASIN from URL directly (fastest method)
    chrome.tabs.query({url: "*://*.amazon.com/*"}, (tabs) => {
      let asin = null;
      let productInfo = null;
      
      if (tabs && tabs.length > 0) {
        // Try to extract ASIN directly from URL first
        const tab = tabs[0];
        const url = tab.url;
        console.log('[FlowSelector] Checking URL:', url);
        asin = extractASIN(url);
        
        if (asin && /^[BA0-9][A-Z0-9]{9}$/i.test(asin)) {
          console.log('[FlowSelector] ✅ Extracted ASIN from URL:', asin);
          displayStatus('✅ ASIN Found (from URL): ' + asin + '\n\n🚀 Starting Flow ' + flow + ' API calls...');
          continueFlow(flow, asin, null).catch(error => {
            console.error('[FlowSelector] Error in continueFlow:', error);
            displayStatus('❌ Error in flow execution:\n\n' + error.message + '\n\nStack: ' + (error.stack || 'N/A'), true);
          });
          return;
        }
      }
      
      // Second try: Get ASIN from content script
      displayStatus('⏳ ASIN not found in URL, trying content script...\n\nPlease wait...');
      getASINFromContentScript((asinFromScript, productInfoFromScript) => {
        console.log('[FlowSelector] getASINFromContentScript callback called with ASIN:', asinFromScript);
        
        if (asinFromScript) {
          console.log('[FlowSelector] ✅ ASIN found from content script:', asinFromScript);
          displayStatus('✅ ASIN Found (from content script): ' + asinFromScript + '\n\n🚀 Starting Flow ' + flow + ' API calls...');
          continueFlow(flow, asinFromScript, productInfoFromScript).catch(error => {
            console.error('[FlowSelector] Error in continueFlow:', error);
            displayStatus('❌ Error in flow execution:\n\n' + error.message + '\n\nStack: ' + (error.stack || 'N/A'), true);
          });
          return;
        }
        
        // If still no ASIN, try URL extraction from all tabs
        chrome.tabs.query({url: "*://*.amazon.com/*"}, (allTabs) => {
          if (allTabs && allTabs.length > 0) {
            for (const tab of allTabs) {
              const extractedAsin = extractASIN(tab.url);
              if (extractedAsin && /^[BA0-9][A-Z0-9]{9}$/i.test(extractedAsin)) {
                console.log('[FlowSelector] ✅ Extracted ASIN from tab URL:', extractedAsin);
                displayStatus('✅ ASIN Found (from tab URL): ' + extractedAsin + '\n\n🚀 Starting Flow ' + flow + ' API calls...');
                continueFlow(flow, extractedAsin, null).catch(error => {
                  console.error('[FlowSelector] Error in continueFlow:', error);
                  displayStatus('❌ Error in flow execution:\n\n' + error.message + '\n\nStack: ' + (error.stack || 'N/A'), true);
                });
                return;
              }
            }
          }
          
          // Final fallback: Show error with instructions
          const errorMsg = '❌ Could not find ASIN.\n\n' +
            'Debug Info:\n' +
            '- Amazon tabs found: ' + (allTabs ? allTabs.length : 0) + '\n' +
            '- Please check:\n' +
            '  1. You have an Amazon product page open\n' +
            '  2. The page URL contains /dp/ASIN or /gp/product/ASIN\n' +
            '  3. Open browser console (F12) for detailed logs\n' +
            '  4. Try reloading the Amazon page and try again\n\n' +
            'Example URL: https://www.amazon.com/dp/B08XXXXXXX';
          displayStatus(errorMsg, true);
        });
      });
    });
  } catch (error) {
    console.error('[FlowSelector] Error in selectFlow:', error);
    displayStatus('❌ Error: ' + error.message + '\n\nStack: ' + (error.stack || 'N/A'), true);
  }
}

async function continueFlow(flow, asin, productInfo) {
    console.log('========================================');
    console.log('[FlowSelector] continueFlow() CALLED');
    console.log('[FlowSelector] flow:', flow);
    console.log('[FlowSelector] asin:', asin);
    console.log('[FlowSelector] productInfo:', productInfo);
    console.log('[FlowSelector] Current time:', new Date().toISOString());
    console.log('========================================');
    
    // Check if API functions are available
    if (!getProductDetails || !getProductHistory) {
      const errorMsg = '❌ API functions not loaded. Please reload the extension.';
      console.error('[FlowSelector]', errorMsg);
      displayStatus(errorMsg, true);
      return;
    }
    
    let apiResults = null;

    // Flow 1: Call APIs in sequence
    if (flow === 1) {
      try {
        // Show loading status
        const statusEl = document.querySelector('h2');
        if (statusEl) {
          statusEl.textContent = 'Loading Flow 1: Calling APIs...';
        }
        displayStatus('🔍 ASIN: ' + asin + '\n\nLoading Flow 1: Calling APIs...');
        
        // Step 1: Call productDetails API
        console.log('========================================');
        console.log('[Flow 1] Step 1/3: Calling getProductDetails()');
        console.log('[Flow 1] ASIN:', asin);
        console.log('[Flow 1] Geo: us');
        console.log('[Flow 1] Time:', new Date().toISOString());
        console.log('========================================');
        displayStatus('🔍 ASIN: ' + asin + '\n\nFlow 1: Step 1/3 - Calling getProductDetails...\n⏳ Loading...');
        const productDetailsResult = await getProductDetails(asin, 'us');
        console.log('[Flow 1] getProductDetails() returned:', productDetailsResult);
        const productDetails = productDetailsResult.data;
        const productDetailsUrl = productDetailsResult.url;
        console.log('[Flow 1] Product Details:', productDetails);
        displayStatus('🔍 ASIN: ' + asin + '\n\n✅ Step 1/3 - getProductDetails Complete!\n\n📡 URL:\n' + productDetailsUrl + '\n\n📦 Response:\n' + JSON.stringify(productDetails, null, 2));
        
        // Step 2: Call productHistory API
        console.log('========================================');
        console.log('[Flow 1] Step 2/3: Calling getProductHistory()');
        console.log('[Flow 1] ASIN:', asin);
        console.log('[Flow 1] Geo: us, Days: 30');
        console.log('[Flow 1] Time:', new Date().toISOString());
        console.log('========================================');
        displayStatus('🔍 ASIN: ' + asin + '\n\n✅ Step 1/3 Complete\n\nFlow 1: Step 2/3 - Calling getProductHistory...\n⏳ Loading...');
        const productHistoryResult = await getProductHistory(asin, 'us', 30);
        console.log('[Flow 1] getProductHistory() returned:', productHistoryResult);
        const productHistory = productHistoryResult.data;
        const productHistoryUrl = productHistoryResult.url;
        console.log('[Flow 1] Product History:', productHistory);
        displayStatus('🔍 ASIN: ' + asin + '\n\n✅ Step 1/3 - getProductDetails\n📡 ' + productDetailsUrl + '\n\n✅ Step 2/3 - getProductHistory Complete!\n\n📡 URL:\n' + productHistoryUrl + '\n\n📦 Response:\n' + JSON.stringify(productHistory, null, 2));
        
        // Step 3: Call keywordResearch (reverse ASIN) API
        console.log('========================================');
        console.log('[Flow 1] Step 3/3: Calling getReverseAsinKeywords()');
        console.log('[Flow 1] ASIN:', asin);
        console.log('[Flow 1] Geo: us');
        console.log('[Flow 1] Time:', new Date().toISOString());
        console.log('========================================');
        displayStatus('🔍 ASIN: ' + asin + '\n\n✅ Step 1/3 Complete\n✅ Step 2/3 Complete\n\nFlow 1: Step 3/3 - Calling getReverseAsinKeywords...\n⏳ Loading...');
        const keywordResearchResult = await getReverseAsinKeywords(asin, 'us');
        console.log('[Flow 1] getReverseAsinKeywords() returned:', keywordResearchResult);
        const keywordResearch = keywordResearchResult.data;
        const keywordResearchUrl = keywordResearchResult.url;
        console.log('[Flow 1] Keyword Research:', keywordResearch);
        
        // Store all API results
        apiResults = {
          productDetails,
          productHistory,
          keywordResearch
        };
        
        if (statusEl) {
          statusEl.textContent = 'Flow 1: APIs loaded successfully!';
        }
        
        // Display final results
        const resultsSummary = '🔍 ASIN: ' + asin + '\n\n' +
          '✅ Flow 1 Complete!\n\n' +
          '=== API Call 1: getProductDetails ===\n' +
          '📡 URL:\n' + productDetailsUrl + '\n\n' +
          '📦 Response:\n' + JSON.stringify(productDetails, null, 2) + '\n\n' +
          '=== API Call 2: getProductHistory ===\n' +
          '📡 URL:\n' + productHistoryUrl + '\n\n' +
          '📦 Response:\n' + JSON.stringify(productHistory, null, 2) + '\n\n' +
          '=== API Call 3: getReverseAsinKeywords ===\n' +
          '📡 URL:\n' + keywordResearchUrl + '\n\n' +
          '📦 Response:\n' + JSON.stringify(keywordResearch, null, 2) + '\n\n' +
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
          '✅ All API calls completed successfully!\n' +
          'You can now proceed to open the analyzer window.';
        
        displayStatus(resultsSummary, false);
        
        // Store results but don't auto-open window - let user see results first
        chrome.storage.local.set({ 
          flowASIN: asin,
          flowProductInfo: productInfo,
          flowApiResults: apiResults
        });
      } catch (error) {
        console.error('========================================');
        console.error('[Flow 1] ERROR in continueFlow()');
        console.error('[Flow 1] Error message:', error.message);
        console.error('[Flow 1] Error stack:', error.stack);
        console.error('[Flow 1] Full error:', error);
        console.error('[Flow 1] Error type:', error.constructor.name);
        console.error('[Flow 1] Time:', new Date().toISOString());
        console.error('========================================');
        const errorMessage = '❌ Flow 1 Error:\n\n' + 
          'Error: ' + error.message + '\n\n' +
          'Stack: ' + (error.stack || 'N/A') + '\n\n' +
          'Full Error Object: ' + JSON.stringify(error, Object.getOwnPropertyNames(error), 2);
        displayStatus(errorMessage, true);
        alert('Error calling APIs: ' + error.message + '\n\nCheck the status display below for full details.');
        return;
      }
    }
    
    // Flow 2: Call APIs in sequence
    if (flow === 2) {
      try {
        // Show loading status
        const statusEl = document.querySelector('h2');
        if (statusEl) {
          statusEl.textContent = 'Loading Flow 2: Calling APIs...';
        }
        displayStatus('🔍 ASIN: ' + asin + '\n\nLoading Flow 2: Calling APIs...');
        
        // Step 1: Call productDetails API
        console.log('========================================');
        console.log('[Flow 2] Step 1/4: Calling getProductDetails()');
        console.log('[Flow 2] ASIN:', asin);
        console.log('[Flow 2] Geo: us');
        console.log('[Flow 2] Time:', new Date().toISOString());
        console.log('========================================');
        displayStatus('🔍 ASIN: ' + asin + '\n\nFlow 2: Step 1/4 - Calling getProductDetails...\n⏳ Loading...');
        const productDetails1Result = await getProductDetails(asin, 'us');
        console.log('[Flow 2] getProductDetails() (Step 1) returned:', productDetails1Result);
        const productDetails1 = productDetails1Result.data;
        const productDetails1Url = productDetails1Result.url;
        console.log('[Flow 2] Product Details (Step 1):', productDetails1);
        displayStatus('🔍 ASIN: ' + asin + '\n\n✅ Step 1/4 - getProductDetails Complete!\n\n📡 URL:\n' + productDetails1Url + '\n\n📦 Response:\n' + JSON.stringify(productDetails1, null, 2));
        
        // Step 2: Call productHistory API
        console.log('========================================');
        console.log('[Flow 2] Step 2/4: Calling getProductHistory()');
        console.log('[Flow 2] ASIN:', asin);
        console.log('[Flow 2] Geo: us, Days: 30');
        console.log('[Flow 2] Time:', new Date().toISOString());
        console.log('========================================');
        displayStatus('🔍 ASIN: ' + asin + '\n\n✅ Step 1/4 Complete\n\nFlow 2: Step 2/4 - Calling getProductHistory...\n⏳ Loading...');
        const productHistoryResult = await getProductHistory(asin, 'us', 30);
        console.log('[Flow 2] getProductHistory() returned:', productHistoryResult);
        const productHistory = productHistoryResult.data;
        const productHistoryUrl = productHistoryResult.url;
        console.log('[Flow 2] Product History:', productHistory);
        displayStatus('🔍 ASIN: ' + asin + '\n\n✅ Step 1/4 - getProductDetails\n📡 ' + productDetails1Url + '\n\n✅ Step 2/4 - getProductHistory Complete!\n\n📡 URL:\n' + productHistoryUrl + '\n\n📦 Response:\n' + JSON.stringify(productHistory, null, 2));
        
        // Step 3: Extract categoryId from productDetails and call categoryProducts API
        // Based on SellerApp API docs, response is an array with product_attributes.category array
        // Each category object has a "node_id" field
        let categoryId = null;
        if (productDetails1 && Array.isArray(productDetails1) && productDetails1.length > 0) {
          const product = productDetails1[0];
          if (product && product.product_attributes && product.product_attributes.category) {
            const categories = product.product_attributes.category;
            // Use the first category's node_id, or the deepest level category
            if (Array.isArray(categories) && categories.length > 0) {
              // Get the category with the highest level (most specific)
              const deepestCategory = categories.reduce((prev, curr) => 
                (curr.level > (prev?.level || -1)) ? curr : prev
              );
              categoryId = deepestCategory.node_id;
            }
          }
        }
        
        let categoryProducts = null;
        let categoryProductsUrl = null;
        if (categoryId) {
          console.log('========================================');
          console.log('[Flow 2] Step 3/4: Calling getCategoryProducts()');
          console.log('[Flow 2] categoryId:', categoryId);
          console.log('[Flow 2] Geo: us, Limit: 20, Page: 1');
          console.log('[Flow 2] Time:', new Date().toISOString());
          console.log('========================================');
          displayStatus('🔍 ASIN: ' + asin + '\n\n✅ Step 1/4 Complete\n✅ Step 2/4 Complete\n\nFlow 2: Step 3/4 - Calling getCategoryProducts...\nCategoryId: ' + categoryId + '\n⏳ Loading...');
          const categoryProductsResult = await getCategoryProducts(categoryId, 'us', 1, 1);
          console.log('[Flow 2] getCategoryProducts() returned:', categoryProductsResult);
          categoryProducts = categoryProductsResult.data;
          categoryProductsUrl = categoryProductsResult.url;
          console.log('[Flow 2] Category Products:', categoryProducts);
          displayStatus('🔍 ASIN: ' + asin + '\n\n✅ Step 1/4 - getProductDetails\n✅ Step 2/4 - getProductHistory\n\n✅ Step 3/4 - getCategoryProducts Complete!\n\n📡 URL:\n' + categoryProductsUrl + '\n\n📦 Response:\n' + JSON.stringify(categoryProducts, null, 2));
        } else {
          console.warn('[Flow 2] Could not extract categoryId from productDetails, skipping categoryProducts call');
          displayStatus('🔍 ASIN: ' + asin + '\n\n✅ Step 1/4 Complete\n✅ Step 2/4 Complete\n\n⚠️ Step 3/4 - Could not extract categoryId, skipping categoryProducts');
        }
        
        // Step 4: Call productDetails API again
        console.log('========================================');
        console.log('[Flow 2] Step 4/4: Calling getProductDetails() again');
        console.log('[Flow 2] ASIN:', asin);
        console.log('[Flow 2] Geo: us');
        console.log('[Flow 2] Time:', new Date().toISOString());
        console.log('========================================');
        displayStatus('🔍 ASIN: ' + asin + '\n\n✅ Step 1/4 Complete\n✅ Step 2/4 Complete\n' + (categoryId ? '✅ Step 3/4 Complete\n' : '⚠️ Step 3/4 Skipped\n') + '\nFlow 2: Step 4/4 - Calling getProductDetails again...\n⏳ Loading...');
        const productDetails2Result = await getProductDetails(asin, 'us');
        console.log('[Flow 2] getProductDetails() (Step 4) returned:', productDetails2Result);
        const productDetails2 = productDetails2Result.data;
        const productDetails2Url = productDetails2Result.url;
        console.log('[Flow 2] Product Details (Step 4):', productDetails2);
        
        // Store all API results
        apiResults = {
          productDetails1,
          productHistory,
          categoryProducts,
          productDetails2
        };
        
        if (statusEl) {
          statusEl.textContent = 'Flow 2: APIs loaded successfully!';
        }
        
        // Display final results
        const resultsSummary = '🔍 ASIN: ' + asin + '\n\n' +
          '✅ Flow 2 Complete!\n\n' +
          '=== API Call 1: getProductDetails (First) ===\n' +
          '📡 URL:\n' + productDetails1Url + '\n\n' +
          '📦 Response:\n' + JSON.stringify(productDetails1, null, 2) + '\n\n' +
          '=== API Call 2: getProductHistory ===\n' +
          '📡 URL:\n' + productHistoryUrl + '\n\n' +
          '📦 Response:\n' + JSON.stringify(productHistory, null, 2) + '\n\n' +
          '=== API Call 3: getCategoryProducts ===\n' +
          (categoryProducts ? 
            '📡 URL:\n' + categoryProductsUrl + '\n\n' +
            '📦 Response:\n' + JSON.stringify(categoryProducts, null, 2) + '\n\n'
            : '⚠️ Skipped (no categoryId)\n\n') +
          '=== API Call 4: getProductDetails (Second) ===\n' +
          '📡 URL:\n' + productDetails2Url + '\n\n' +
          '📦 Response:\n' + JSON.stringify(productDetails2, null, 2) + '\n\n' +
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
          '✅ All API calls completed successfully!\n' +
          'You can now proceed to open the analyzer window.';
        
        displayStatus(resultsSummary, false);
        
        // Store results but don't auto-open window - let user see results first
        chrome.storage.local.set({ 
          flowASIN: asin,
          flowProductInfo: productInfo,
          flowApiResults: apiResults
        });
      } catch (error) {
        console.error('========================================');
        console.error('[Flow 2] ERROR in continueFlow()');
        console.error('[Flow 2] Error message:', error.message);
        console.error('[Flow 2] Error stack:', error.stack);
        console.error('[Flow 2] Full error:', error);
        console.error('[Flow 2] Error type:', error.constructor.name);
        console.error('[Flow 2] Time:', new Date().toISOString());
        console.error('========================================');
        const errorMessage = '❌ Flow 2 Error:\n\n' + 
          'Error: ' + error.message + '\n\n' +
          'Stack: ' + (error.stack || 'N/A') + '\n\n' +
          'Full Error Object: ' + JSON.stringify(error, Object.getOwnPropertyNames(error), 2);
        displayStatus(errorMessage, true);
        alert('Error calling APIs: ' + error.message + '\n\nCheck the status display below for full details.');
        return;
      }
    }
    
    // Results are already stored above, window stays open so user can see results
    // User can manually close or we can add a button later to proceed
}

// Make selectFlow available globally for inline onclick handlers
window.selectFlow = selectFlow;

// Add event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('========================================');
  console.log('[FlowSelector] DOMContentLoaded event fired');
  console.log('[FlowSelector] Time:', new Date().toISOString());
  console.log('[FlowSelector] Setting up event listeners...');
  console.log('========================================');
  
  const flow1Button = document.getElementById('flow1');
  const flow2Button = document.getElementById('flow2');
  const statusDisplay = document.getElementById('statusDisplay');
  
  console.log('[FlowSelector] Flow1 button found:', !!flow1Button);
  console.log('[FlowSelector] Flow2 button found:', !!flow2Button);
  console.log('[FlowSelector] StatusDisplay found:', !!statusDisplay);
  
  if (flow1Button) {
    console.log('[FlowSelector] Flow1 button element:', flow1Button);
    console.log('[FlowSelector] Flow1 button id:', flow1Button.id);
  }
  if (flow2Button) {
    console.log('[FlowSelector] Flow2 button element:', flow2Button);
    console.log('[FlowSelector] Flow2 button id:', flow2Button.id);
  }
  if (statusDisplay) {
    console.log('[FlowSelector] StatusDisplay element:', statusDisplay);
    console.log('[FlowSelector] StatusDisplay current display:', window.getComputedStyle(statusDisplay).display);
  }
  
  if (flow1Button) {
    // Add event listener (don't remove onclick, let both work)
    flow1Button.addEventListener('click', (e) => {
      console.log('========================================');
      console.log('[FlowSelector] FLOW 1 BUTTON CLICKED!');
      console.log('[FlowSelector] Event:', e);
      console.log('[FlowSelector] Button element:', flow1Button);
      console.log('[FlowSelector] Time:', new Date().toISOString());
      console.log('========================================');
      
      e.preventDefault();
      e.stopPropagation();
      
      // Immediate feedback - test that displayStatus works
      const testMsg = '✅ BUTTON CLICKED!\n\nFlow 1 button was clicked successfully.\n\n🔍 Now searching for ASIN...\n\nPlease wait...';
      console.log('[FlowSelector] Calling displayStatus with test message');
      displayStatus(testMsg);
      
      // Small delay to ensure display updates, then start flow
      setTimeout(() => {
        console.log('[FlowSelector] About to call selectFlow(1)');
        selectFlow(1).catch(error => {
          console.error('========================================');
          console.error('[FlowSelector] ERROR in selectFlow(1)');
          console.error('[FlowSelector] Error message:', error.message);
          console.error('[FlowSelector] Error stack:', error.stack);
          console.error('[FlowSelector] Full error:', error);
          console.error('========================================');
          const errorMsg = '❌ Error in Flow 1:\n\n' + error.message + '\n\nStack:\n' + (error.stack || 'N/A');
          displayStatus(errorMsg, true);
        });
      }, 100);
      
      return false;
    }, true);
    console.log('[FlowSelector] Flow1 event listener added successfully');
  } else {
    console.error('[FlowSelector] Flow1 button not found!');
  }
  
  if (flow2Button) {
    // Add event listener (don't remove onclick, let both work)
    flow2Button.addEventListener('click', (e) => {
      console.log('========================================');
      console.log('[FlowSelector] FLOW 2 BUTTON CLICKED!');
      console.log('[FlowSelector] Event:', e);
      console.log('[FlowSelector] Button element:', flow2Button);
      console.log('[FlowSelector] Time:', new Date().toISOString());
      console.log('========================================');
      
      e.preventDefault();
      e.stopPropagation();
      
      // Immediate feedback - test that displayStatus works
      const testMsg = '✅ BUTTON CLICKED!\n\nFlow 2 button was clicked successfully.\n\n🔍 Now searching for ASIN...\n\nPlease wait...';
      console.log('[FlowSelector] Calling displayStatus with test message');
      displayStatus(testMsg);
      
      // Small delay to ensure display updates, then start flow
      setTimeout(() => {
        console.log('[FlowSelector] About to call selectFlow(2)');
        selectFlow(2).catch(error => {
          console.error('========================================');
          console.error('[FlowSelector] ERROR in selectFlow(2)');
          console.error('[FlowSelector] Error message:', error.message);
          console.error('[FlowSelector] Error stack:', error.stack);
          console.error('[FlowSelector] Full error:', error);
          console.error('========================================');
          const errorMsg = '❌ Error in Flow 2:\n\n' + error.message + '\n\nStack:\n' + (error.stack || 'N/A');
          displayStatus(errorMsg, true);
        });
      }, 100);
      
      return false;
    }, true);
    console.log('[FlowSelector] Flow2 event listener added successfully');
  } else {
    console.error('[FlowSelector] Flow2 button not found!');
  }
  
  console.log('========================================');
  console.log('[FlowSelector] Event listeners set up complete');
  console.log('[FlowSelector] window.selectFlow available:', typeof window.selectFlow);
  console.log('[FlowSelector] Ready to receive button clicks!');
  console.log('========================================');
});

