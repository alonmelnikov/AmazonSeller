/**
 * dashboard-init.js
 * Initialization script for the Dashboard
 * Loads data from storage and initializes all tabs
 */

document.addEventListener("DOMContentLoaded", () => {
  console.log('[DashboardInit] Starting dashboard initialization...');

  // Setup back button
  const backBtn = document.getElementById('backBtn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.location.href = chrome.runtime.getURL("flow-selector.html");
    });
  }

  // Initialize tab instances
  const productDBTab = new ProductDBTab();
  const keywordsTab = new KeywordsTab();
  const analysisTab = new AnalysisTab();

  // Initialize dashboard manager
  const dashboardManager = new DashboardManager();
  dashboardManager.initialize({
    productDB: productDBTab,
    keywords: keywordsTab,
    analysis: analysisTab
  });

  // Show loading state
  dashboardManager.showLoading();

  // Load data from storage (set by flowSelector)
  chrome.storage.local.get(['flowASIN', 'flowProductInfo', 'flowApiResults'], (data) => {
    if (!data.flowApiResults) {
      console.warn('[DashboardInit] No API results found in storage');
      dashboardManager.showError('No data available. Please run a flow first.');
      return;
    }

    console.log('[DashboardInit] Loading data from storage:', {
      asin: data.flowASIN,
      hasProductInfo: !!data.flowProductInfo,
      hasApiResults: !!data.flowApiResults
    });

    console.log('[DashboardInit] API Results structure:', Object.keys(data.flowApiResults));
    console.log('[DashboardInit] Product Details:', data.flowApiResults.productDetails);
    console.log('[DashboardInit] Product History:', data.flowApiResults.productHistory);
    console.log('[DashboardInit] Keyword Research:', data.flowApiResults.keywordResearch);

    // Load data into dashboard
    dashboardManager.loadData(data.flowApiResults);

    // Hide status bar (no success message)
    dashboardManager.showSuccess();

    // Clear flow data after loading (optional - comment out if you want to keep it)
    // chrome.storage.local.remove(['flowASIN', 'flowProductInfo', 'flowApiResults']);
  });

  // Make dashboard manager available globally for debugging
  window.dashboardManager = dashboardManager;
});

