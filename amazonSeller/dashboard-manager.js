/**
 * dashboard-manager.js
 * Main controller for the Dashboard
 * Coordinates all tabs and manages data flow
 * Follows Single Responsibility Principle and Dependency Injection
 */

class DashboardManager {
  constructor() {
    this.tabs = {
      productDB: null,
      keywords: null,
      analysis: null
    };
    this.currentData = null;
    this.initialized = false;
  }

  /**
   * Initialize the dashboard with tab instances
   * @param {Object} tabInstances - Object containing tab instances
   */
  initialize(tabInstances) {
    if (this.initialized) {
      console.warn('[DashboardManager] Already initialized');
      return;
    }

    this.tabs.productDB = tabInstances.productDB;
    this.tabs.keywords = tabInstances.keywords;
    this.tabs.analysis = tabInstances.analysis;
    
    this.setupTabSwitching();
    this.initialized = true;
    
    console.log('[DashboardManager] Dashboard initialized successfully');
  }

  /**
   * Setup tab switching functionality
   */
  setupTabSwitching() {
    // Use button IDs to match with tab IDs
    const tabButton1 = document.getElementById('tabBtn1');
    const tabButton2 = document.getElementById('tabBtn2');
    const tabButton3 = document.getElementById('tabBtn3');
    const tab1 = document.getElementById('tab1');
    const tab2 = document.getElementById('tab2');
    const tab3 = document.getElementById('tab3');

    if (tabButton1 && tab1) {
      tabButton1.addEventListener('click', () => {
        tab1.classList.add('active');
        tab2?.classList.remove('active');
        tab3?.classList.remove('active');
        tabButton1.classList.add('active');
        tabButton2?.classList.remove('active');
        tabButton3?.classList.remove('active');
      });
    }

    if (tabButton2 && tab2) {
      tabButton2.addEventListener('click', () => {
        tab1?.classList.remove('active');
        tab2.classList.add('active');
        tab3?.classList.remove('active');
        tabButton1?.classList.remove('active');
        tabButton2.classList.add('active');
        tabButton3?.classList.remove('active');
      });
    }

    if (tabButton3 && tab3) {
      tabButton3.addEventListener('click', () => {
        tab1?.classList.remove('active');
        tab2?.classList.remove('active');
        tab3.classList.add('active');
        tabButton1?.classList.remove('active');
        tabButton2?.classList.remove('active');
        tabButton3.classList.add('active');
      });
    }

    console.log('[DashboardManager] Tab switching setup complete');
  }

  /**
   * Load and render data into all tabs
   * @param {Object} data - Complete data object from API calls
   */
  loadData(data) {
    if (!data) {
      console.error('[DashboardManager] No data provided');
      return;
    }

    this.currentData = data;
    
    // Transform data structure to match what tabs expect
    const transformedData = this.transformData(data);

    // Render each tab
    if (this.tabs.productDB) {
      this.tabs.productDB.render(transformedData);
    }
    
    if (this.tabs.keywords) {
      this.tabs.keywords.render(transformedData);
    }
    
    if (this.tabs.analysis) {
      this.tabs.analysis.render(transformedData);
    }

    console.log('[DashboardManager] Data loaded and rendered successfully');
  }

  /**
   * Transform API response data into a unified structure
   * @param {Object} apiResults - Raw API results from flows
   * @returns {Object} Transformed data structure
   */
  transformData(apiResults) {
    console.log('[DashboardManager] Transforming data:', {
      keys: Object.keys(apiResults),
      productDetails: apiResults.productDetails,
      productHistory: apiResults.productHistory,
      keywordResearch: apiResults.keywordResearch,
      categoryProducts: apiResults.categoryProducts
    });

    // Extract product details - handle both array and object formats
    let productDetails = apiResults.productDetails || apiResults.productDetails1 || null;
    
    // Extract promotions from product details if available
    let promotions = null;
    if (productDetails) {
      if (Array.isArray(productDetails) && productDetails.length > 0) {
        promotions = productDetails[0].promotions || null;
      } else if (productDetails.promotions) {
        promotions = productDetails.promotions;
      }
    }

    // Extract product history
    const productHistory = apiResults.productHistory || null;
    
    // Extract category products
    const categoryProducts = apiResults.categoryProducts || null;
    
    // Extract keyword research
    const keywordResearch = apiResults.keywordResearch || null;

    const transformed = {
      // Product DB data
      productDetails: productDetails,
      productHistory: productHistory,
      categoryProducts: categoryProducts,
      promotions: promotions,
      
      // Keywords data
      keywordResearch: keywordResearch,
      reverseAsin: keywordResearch, // Alias for compatibility
      
      // Analysis data (derived from product details)
      variations: apiResults.variations || null,
      
      // Raw data for reference
      raw: apiResults
    };

    console.log('[DashboardManager] Transformed data:', {
      hasProductDetails: !!transformed.productDetails,
      hasProductHistory: !!transformed.productHistory,
      hasCategoryProducts: !!transformed.categoryProducts,
      hasKeywordResearch: !!transformed.keywordResearch,
      hasPromotions: !!transformed.promotions
    });

    return transformed;
  }

  /**
   * Get current data
   * @returns {Object} Current data
   */
  getData() {
    return this.currentData;
  }

  /**
   * Refresh all tabs with current data
   */
  refresh() {
    if (this.currentData) {
      this.loadData(this.currentData);
    }
  }

  /**
   * Show loading state
   */
  showLoading() {
    const statusBar = document.getElementById('statusBar');
    if (statusBar) {
      statusBar.textContent = '⏳ Loading dashboard data...';
      statusBar.style.background = '#fff3cd';
    }
  }

  /**
   * Show success state
   */
  showSuccess() {
    const statusBar = document.getElementById('statusBar');
    if (statusBar) {
      statusBar.textContent = '';
      statusBar.style.background = 'transparent';
    }
  }

  /**
   * Show error state
   * @param {String} message - Error message
   */
  showError(message) {
    const statusBar = document.getElementById('statusBar');
    if (statusBar) {
      statusBar.textContent = `❌ ${message || 'Error loading dashboard'}`;
      statusBar.style.background = '#f8d7da';
    }
  }
}

// Export singleton instance
if (typeof window !== 'undefined') {
  window.DashboardManager = DashboardManager;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DashboardManager;
}

