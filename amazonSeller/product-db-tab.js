/**
 * product-db-tab.js
 * Module for displaying Product Database tab content
 * Handles: Product Details, History, Offers, Reviews, Category Products
 */

import ProductDetailsDTO from './dto/product-details-dto.js';
import ProductHistoryDTO from './dto/product-history-dto.js';
import CategoryProductsDTO from './dto/category-products-dto.js';

class ProductDBTab {
  constructor() {
    this.sections = {
      productDetails: document.getElementById('productDetailsSection'),
      productHistory: document.getElementById('productHistorySection'),
      productOffers: document.getElementById('productOffersSection'),
      productReviews: document.getElementById('productReviewsSection'),
      categoryProducts: document.getElementById('categoryProductsSection')
    };
  }

  /**
   * Render product details section
   * @param {Object} productDetails - Product details from API
   */
  renderProductDetails(productDetails) {
    if (!this.sections.productDetails) return;
    
    if (!productDetails || (Array.isArray(productDetails) && productDetails.length === 0)) {
      this.sections.productDetails.innerHTML = '<p style="color: #999;">No product details available</p>';
      return;
    }

    const dto = new ProductDetailsDTO(productDetails);
    const attrs = dto.product_attributes;
    const priceDetails = dto.price_details;
    const feeDetails = dto.fee_details;
    const potential = dto.product_potential;
    const ratings = dto.ratings;

    const html = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
        <div style="background: #fff; padding: 15px; border-radius: 8px; border: 1px solid #e0e0e0;">
          <h5 style="margin: 0 0 12px 0; color: #232f3e; font-size: 14px; font-weight: 600;">Basic Information</h5>
          <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
            <tr><td style="padding: 6px 0; color: #666;"><strong>ASIN:</strong></td><td style="padding: 6px 0; color: #232f3e;">${attrs.asin || 'N/A'}</td></tr>
            <tr><td style="padding: 6px 0; color: #666;"><strong>Title:</strong></td><td style="padding: 6px 0; color: #232f3e;">${this.truncate(attrs.title, 60) || 'N/A'}</td></tr>
            <tr><td style="padding: 6px 0; color: #666;"><strong>Brand:</strong></td><td style="padding: 6px 0; color: #232f3e;">${attrs.brand || 'N/A'}</td></tr>
            <tr><td style="padding: 6px 0; color: #666;"><strong>Manufacturer:</strong></td><td style="padding: 6px 0; color: #232f3e;">${attrs.manufacturer || 'N/A'}</td></tr>
            <tr><td style="padding: 6px 0; color: #666;"><strong>Date Available:</strong></td><td style="padding: 6px 0; color: #232f3e;">${attrs.date_first_available || 'N/A'}</td></tr>
            <tr><td style="padding: 6px 0; color: #666;"><strong>Number of Sellers:</strong></td><td style="padding: 6px 0; color: #232f3e;">${attrs.number_of_sellers || 'N/A'}</td></tr>
          </table>
        </div>
        <div style="background: #fff; padding: 15px; border-radius: 8px; border: 1px solid #e0e0e0;">
          <h5 style="margin: 0 0 12px 0; color: #232f3e; font-size: 14px; font-weight: 600;">Pricing & Fees</h5>
          <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
            <tr><td style="padding: 6px 0; color: #666;"><strong>Landed Price:</strong></td><td style="padding: 6px 0; color: #c45500; font-weight: 600;">$${priceDetails.landed_price_new?.toFixed(2) || 'N/A'}</td></tr>
            <tr><td style="padding: 6px 0; color: #666;"><strong>Listing Price:</strong></td><td style="padding: 6px 0; color: #232f3e;">$${priceDetails.listing_price_new?.toFixed(2) || 'N/A'}</td></tr>
            <tr><td style="padding: 6px 0; color: #666;"><strong>Referral Fee:</strong></td><td style="padding: 6px 0; color: #232f3e;">$${feeDetails.referral_fee?.toFixed(2) || 'N/A'}</td></tr>
            <tr><td style="padding: 6px 0; color: #666;"><strong>FBA Fee:</strong></td><td style="padding: 6px 0; color: #232f3e;">$${feeDetails.fba_fee?.toFixed(2) || 'N/A'}</td></tr>
            <tr><td style="padding: 6px 0; color: #666;"><strong>Currency:</strong></td><td style="padding: 6px 0; color: #232f3e;">${priceDetails.currency_code || 'USD'}</td></tr>
          </table>
        </div>
      </div>
      ${potential.sales_estimate_low ? `
        <div style="margin-bottom: 20px; padding: 15px; background: #fff3cd; border-radius: 8px; border-left: 4px solid #ff9900;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div>
              <div style="color: #666; font-size: 12px; margin-bottom: 4px;">Sales Estimate (Monthly)</div>
              <div style="color: #232f3e; font-size: 18px; font-weight: 600;">${this.formatNumber(potential.sales_estimate_low)} - ${this.formatNumber(potential.sales_estimate_high)} units</div>
            </div>
            <div>
              <div style="color: #666; font-size: 12px; margin-bottom: 4px;">Revenue Estimate (Monthly)</div>
              <div style="color: #c45500; font-size: 18px; font-weight: 600;">$${this.formatNumber(potential.revenue_estimate_low)} - $${this.formatNumber(potential.revenue_estimate_high)}</div>
            </div>
          </div>
        </div>
      ` : ''}
      ${attrs.image_urls && attrs.image_urls.length > 0 ? `
        <div style="margin-bottom: 20px;">
          <h5 style="margin: 0 0 12px 0; color: #232f3e; font-size: 14px; font-weight: 600;">Product Images</h5>
          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            ${attrs.image_urls.slice(0, 5).map(url => `
              <img src="${url}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 6px; border: 1px solid #e0e0e0; cursor: pointer;" 
                   onclick="window.open('${url}', '_blank')" 
                   onerror="this.style.display='none'" />
            `).join('')}
          </div>
        </div>
      ` : ''}
    `;
    
    this.sections.productDetails.innerHTML = html;
  }

  /**
   * Render product history section with graph
   * @param {Object} productHistory - Product history from API
   */
  renderProductHistory(productHistory) {
    if (!this.sections.productHistory) return;
    
    if (!productHistory) {
      this.sections.productHistory.innerHTML = '<p style="color: #999;">No product history available</p>';
      return;
    }

    const dto = new ProductHistoryDTO(productHistory);
    
    const priceHistoryRaw = Array.isArray(dto.price_history) ? dto.price_history : [];
    const bsrHistoryRaw = Array.isArray(dto.bsr_history) ? dto.bsr_history : [];
    const ratingsHistoryRaw = Array.isArray(dto.ratings_history) ? dto.ratings_history : [];

    if (priceHistoryRaw.length === 0 && bsrHistoryRaw.length === 0 && ratingsHistoryRaw.length === 0) {
      this.sections.productHistory.innerHTML = '<p style="color: #999;">No historical data available</p>';
      return;
    }

    const toPriceDollars = (val) => {
      const n = typeof val === 'number' ? val : Number(val);
      if (!Number.isFinite(n)) return null;
      // SellerApp often returns price in cents (e.g., 1221 => $12.21)
      return n > 100 ? n / 100 : n;
    };

    const toRating = (val) => {
      const n = typeof val === 'number' ? val : Number(val);
      if (!Number.isFinite(n)) return null;
      // SellerApp can return rating*10 (e.g., 44 => 4.4)
      return n > 10 ? n / 10 : n;
    };

    const buildSeries = (arr, valueTransform = (x) => x) => {
      return (Array.isArray(arr) ? arr : [])
        .map((p) => ({
          date: p?.time || p?.date || p?.timestamp || null,
          value: valueTransform(p?.value)
        }))
        .filter((p) => p.date && p.value !== null && p.value !== undefined && !Number.isNaN(p.value));
    };

    const priceHistory = buildSeries(priceHistoryRaw, toPriceDollars);
    const bsrHistory = buildSeries(bsrHistoryRaw, (x) => (typeof x === 'number' ? x : Number(x)));
    const ratingHistory = buildSeries(ratingsHistoryRaw, toRating);

    // Create canvas for chart
    const canvasId = 'historyChart';
    const html = `
      <div style="margin-bottom: 20px;">
        <h5 style="margin: 0 0 12px 0; color: #232f3e; font-size: 14px; font-weight: 600;">Price History</h5>
        <canvas id="${canvasId}" style="max-height: 300px;"></canvas>
      </div>
      ${bsrHistory.length > 0 ? `
        <div style="margin-bottom: 20px;">
          <h5 style="margin: 0 0 12px 0; color: #232f3e; font-size: 14px; font-weight: 600;">Best Seller Rank History</h5>
          <canvas id="bsrChart" style="max-height: 300px;"></canvas>
        </div>
      ` : ''}
      ${ratingHistory.length > 0 ? `
        <div>
          <h5 style="margin: 0 0 12px 0; color: #232f3e; font-size: 14px; font-weight: 600;">Rating History</h5>
          <canvas id="ratingChart" style="max-height: 300px;"></canvas>
        </div>
      ` : ''}
    `;
    
    this.sections.productHistory.innerHTML = html;

    // Render charts if Chart.js is available
    if (typeof Chart !== 'undefined' && priceHistory.length > 0) {
      setTimeout(() => {
        const ctx = document.getElementById(canvasId);
        if (ctx) {
          const labels = priceHistory.map(item => {
            const date = new Date(item.date);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          });
          const prices = priceHistory.map(item => item.value);

          new Chart(ctx, {
            type: 'line',
            data: {
              labels: labels,
              datasets: [{
                label: 'Price ($)',
                data: prices,
                borderColor: '#ff9900',
                backgroundColor: 'rgba(255, 153, 0, 0.1)',
                tension: 0.4,
                fill: true
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: true,
              plugins: {
                legend: {
                  display: true,
                  position: 'top'
                }
              },
              scales: {
                y: {
                  beginAtZero: false,
                  ticks: {
                    callback: function(value) {
                      return '$' + value.toFixed(2);
                    }
                  }
                }
              }
            }
          });
        }

        // BSR Chart
        if (bsrHistory.length > 0) {
          const bsrCtx = document.getElementById('bsrChart');
          if (bsrCtx) {
            const bsrLabels = bsrHistory.map(item => {
              const date = new Date(item.date);
              return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            });
            const bsrValues = bsrHistory.map(item => item.value);

            new Chart(bsrCtx, {
              type: 'line',
              data: {
                labels: bsrLabels,
                datasets: [{
                  label: 'BSR',
                  data: bsrValues,
                  borderColor: '#232f3e',
                  backgroundColor: 'rgba(35, 47, 62, 0.1)',
                  tension: 0.4,
                  fill: true
                }]
              },
              options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                  legend: {
                    display: true,
                    position: 'top'
                  }
                },
                scales: {
                  y: {
                    reverse: true,
                    beginAtZero: false
                  }
                }
              }
            });
          }
        }

        // Rating Chart
        if (ratingHistory.length > 0) {
          const ratingCtx = document.getElementById('ratingChart');
          if (ratingCtx) {
            const ratingLabels = ratingHistory.map(item => {
              const date = new Date(item.date);
              return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            });
            const ratings = ratingHistory.map(item => item.value);

            new Chart(ratingCtx, {
              type: 'line',
              data: {
                labels: ratingLabels,
                datasets: [{
                  label: 'Rating',
                  data: ratings,
                  borderColor: '#ff9900',
                  backgroundColor: 'rgba(255, 153, 0, 0.1)',
                  tension: 0.4,
                  fill: true
                }]
              },
              options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                  legend: {
                    display: true,
                    position: 'top'
                  }
                },
                scales: {
                  y: {
                    beginAtZero: false,
                    min: 0,
                    max: 5
                  }
                }
              }
            });
          }
        }
      }, 100);
    }
  }

  /**
   * Render category products section
   * @param {Object} categoryProducts - Category products from API
   */
  renderCategoryProducts(categoryProducts) {
    if (!this.sections.categoryProducts) return;
    
    if (!categoryProducts) {
      this.sections.categoryProducts.innerHTML = '<p style="color: #999;">No category products available</p>';
      return;
    }

    const dto = new CategoryProductsDTO(categoryProducts);
    const searchResults = Array.isArray(dto.search_results) ? dto.search_results : [];
    if (searchResults.length === 0) {
      this.sections.categoryProducts.innerHTML = '<p style="color: #999;">No category products available</p>';
      return;
    }

    // Each result has: asin, product_rank, is_sponsored, title, price (string), rating (string), etc.
    const topProducts = [...searchResults]
      .sort((a, b) => (a.product_rank || 0) - (b.product_rank || 0))
      .slice(0, 20);

    const html = `
      <div style="overflow-x: auto; background: #fff; border-radius: 8px; border: 1px solid #e0e0e0;">
        <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
          <thead>
            <tr style="background: #f3f3f3;">
              <th style="padding: 12px; text-align: left; color: #232f3e; font-weight: 600; border-bottom: 2px solid #e0e0e0;">Rank</th>
              <th style="padding: 12px; text-align: left; color: #232f3e; font-weight: 600; border-bottom: 2px solid #e0e0e0;">ASIN</th>
              <th style="padding: 12px; text-align: left; color: #232f3e; font-weight: 600; border-bottom: 2px solid #e0e0e0;">Title</th>
              <th style="padding: 12px; text-align: center; color: #232f3e; font-weight: 600; border-bottom: 2px solid #e0e0e0;">Price</th>
              <th style="padding: 12px; text-align: center; color: #232f3e; font-weight: 600; border-bottom: 2px solid #e0e0e0;">Rating</th>
              <th style="padding: 12px; text-align: center; color: #232f3e; font-weight: 600; border-bottom: 2px solid #e0e0e0;">Sponsored</th>
            </tr>
          </thead>
          <tbody>
            ${topProducts.map((item, index) => `
              <tr style="border-bottom: 1px solid #f0f0f0; ${index % 2 === 0 ? 'background: #fafafa;' : ''}">
                <td style="padding: 10px; color: #232f3e;">${item.product_rank || index + 1}</td>
                <td style="padding: 10px;">
                  <a href="https://www.amazon.com/dp/${item.asin}" target="_blank" style="color: #007185; text-decoration: none; font-weight: 500;">
                    ${item.asin}
                  </a>
                </td>
                <td style="padding: 10px; color: #232f3e;">${this.truncate(item.title || 'N/A', 60)}</td>
                <td style="padding: 10px; text-align: center; color: #c45500; font-weight: 600;">${item.price || 'N/A'}</td>
                <td style="padding: 10px; text-align: center; color: #232f3e;">${item.rating || 'N/A'}</td>
                <td style="padding: 10px; text-align: center; color: #232f3e;">${item.is_sponsored ? '✓' : '✗'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <p style="color: #666; font-size: 12px; margin-top: 10px;">
        Showing top ${Math.min(searchResults.length, 20)} products in this category. Total indexed products: ${dto.total_indexed_products ?? 'N/A'}.
      </p>
    `;
    
    this.sections.categoryProducts.innerHTML = html;
  }

  /**
   * Render offers section - only if promotions data exists
   * @param {Object} productDetails - Product details containing promotions
   */
  renderOffers(productDetails) {
    if (!this.sections.productOffers) return;
    
    if (!productDetails || (Array.isArray(productDetails) && productDetails.length === 0)) {
      const section = document.getElementById('offersSection');
      if (section) section.style.display = 'none';
      return;
    }

    const dto = new ProductDetailsDTO(productDetails);
    const promotions = dto.promotions;

    if (!promotions) {
      const section = document.getElementById('offersSection');
      if (section) section.style.display = 'none';
      return;
    }

    const html = `
      <div style="background: #fff; padding: 15px; border-radius: 8px; border: 1px solid #e0e0e0;">
        <pre style="margin: 0; font-size: 12px; overflow-x: auto; color: #232f3e;">${JSON.stringify(promotions, null, 2)}</pre>
      </div>
    `;
    
    this.sections.productOffers.innerHTML = html;
  }

  /**
   * Render reviews section - only if ratings data exists
   * @param {Object} productDetails - Product details containing ratings
   */
  renderReviews(productDetails) {
    if (!this.sections.productReviews) return;
    
    if (!productDetails || (Array.isArray(productDetails) && productDetails.length === 0)) {
      const section = document.getElementById('reviewsSection');
      if (section) section.style.display = 'none';
      return;
    }

    const dto = new ProductDetailsDTO(productDetails);
    const ratings = dto.ratings || {};
    const rating = ratings.average_rating;
    const reviewCount = ratings.number_of_ratings;

    if (!rating && !reviewCount) {
      const section = document.getElementById('reviewsSection');
      if (section) section.style.display = 'none';
      return;
    }

    const html = `
      <div style="background: #fff; padding: 15px; border-radius: 8px; border: 1px solid #e0e0e0;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div>
            <div style="color: #666; font-size: 12px; margin-bottom: 4px;">Average Rating</div>
            <div style="color: #232f3e; font-size: 24px; font-weight: 600;">${rating ? rating.toFixed(1) : 'N/A'}</div>
            ${rating ? `<div style="color: #ff9900; font-size: 14px; margin-top: 4px;">${'★'.repeat(Math.floor(rating))}${rating % 1 >= 0.5 ? '½' : ''}${'☆'.repeat(5 - Math.ceil(rating))}</div>` : ''}
          </div>
          <div>
            <div style="color: #666; font-size: 12px; margin-bottom: 4px;">Total Reviews</div>
            <div style="color: #232f3e; font-size: 24px; font-weight: 600;">${this.formatNumber(reviewCount) || 'N/A'}</div>
          </div>
        </div>
        ${ratings.rating_distribution ? `
          <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e0e0e0;">
            <div style="color: #666; font-size: 12px; margin-bottom: 8px;">Rating Distribution</div>
            <div style="display: flex; flex-direction: column; gap: 6px;">
              ${Object.entries(ratings.rating_distribution).reverse().map(([stars, count]) => `
                <div style="display: flex; align-items: center; gap: 10px;">
                  <div style="width: 60px; color: #232f3e; font-weight: 600;">${stars}★</div>
                  <div style="flex: 1; background: #f0f0f0; height: 20px; border-radius: 10px; overflow: hidden;">
                    <div style="background: #ff9900; height: 100%; width: ${(count / reviewCount) * 100}%;"></div>
                  </div>
                  <div style="width: 80px; text-align: right; color: #666; font-size: 12px;">${this.formatNumber(count)}</div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
    
    this.sections.productReviews.innerHTML = html;
  }

  /**
   * Main render method - populates all sections with data
   * @param {Object} data - Complete data object from API calls
   */
  render(data) {
    if (!data) {
      console.warn('[ProductDB] No data provided');
      return;
    }

    console.log('[ProductDB] Rendering with data:', {
      hasProductDetails: !!data.productDetails,
      hasProductHistory: !!data.productHistory,
      hasCategoryProducts: !!data.categoryProducts
    });

    if (data.productDetails) {
      console.log('[ProductDB] Product Details:', data.productDetails);
      this.renderProductDetails(data.productDetails);
    }

    if (data.productHistory) {
      console.log('[ProductDB] Product History:', data.productHistory);
      this.renderProductHistory(data.productHistory);
    }

    if (data.categoryProducts) {
      console.log('[ProductDB] Category Products:', data.categoryProducts);
      this.renderCategoryProducts(data.categoryProducts);
    }

    this.renderOffers(data.productDetails);
    this.renderReviews(data.productDetails);
  }

  // Utility methods
  truncate(str, length) {
    if (!str) return '';
    return str.length > length ? str.substring(0, length) + '...' : str;
  }

  formatNumber(num) {
    if (typeof num !== 'number') return 'N/A';
    return num.toLocaleString('en-US');
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProductDBTab;
}
