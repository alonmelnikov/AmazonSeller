/**
 * analysis-tab.js
 * Module for displaying In-Depth Analysis tab content
 * Handles: Image Comparison, Variations, Reviews Analysis
 */

import ProductDetailsDTO from './dto/product-details-dto.js';

class AnalysisTab {
  constructor() {
    this.sections = {
      imageComparison: document.getElementById('imageComparisonSection'),
      variations: document.getElementById('variationsSection'),
      reviewsAnalysis: document.getElementById('reviewsAnalysisSection')
    };
  }

  /**
   * Render image comparison section
   * @param {Object} productData - Product data containing images
   */
  renderImageComparison(productData) {
    if (!this.sections.imageComparison) return;
    
    if (!productData || !productData.productDetails) {
      const section = document.getElementById('imageSection');
      if (section) section.style.display = 'none';
      return;
    }

    const product = Array.isArray(productData.productDetails) 
      ? productData.productDetails[0] 
      : productData.productDetails;
    
    const dto = new ProductDetailsDTO([product]);
    const images = dto.images;
    
    if (images.length === 0) {
      const section = document.getElementById('imageSection');
      if (section) section.style.display = 'none';
      return;
    }

    const html = `
      <div style="margin-bottom: 20px;">
        <h5 style="margin: 0 0 12px 0; color: #232f3e; font-size: 14px; font-weight: 600;">Product Images (${images.length} total)</h5>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px;">
          ${images.map((url, index) => `
            <div style="position: relative;">
              <img 
                src="${url}" 
                alt="Product Image ${index + 1}"
                style="width: 100%; height: 140px; object-fit: cover; border-radius: 8px; border: 2px solid #e0e0e0; cursor: pointer; transition: transform 0.2s;"
                onclick="window.open('${url}', '_blank')"
                onmouseover="this.style.transform='scale(1.05)'; this.style.borderColor='#ff9900';"
                onmouseout="this.style.transform='scale(1)'; this.style.borderColor='#e0e0e0';"
                onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22140%22 height=%22140%22%3E%3Crect fill=%22%23ddd%22 width=%22140%22 height=%22140%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22%3EImage%3C/text%3E%3C/svg%3E'"
              />
              <div style="position: absolute; top: 8px; right: 8px; background: rgba(0,0,0,0.7); color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">
                ${index + 1}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      <div style="padding: 12px; background: #e7f3ff; border-radius: 8px; border-left: 4px solid #007185; font-size: 12px;">
        <strong style="color: #232f3e;">Image Analysis:</strong> Click on any image to view it in full size. 
        High-quality images with multiple angles improve conversion rates.
      </div>
    `;
    
    this.sections.imageComparison.innerHTML = html;
  }

  /**
   * Render product variations section
   * @param {Object} productData - Product data containing variations
   */
  renderVariations(productData) {
    if (!this.sections.variations) return;
    
    // Check for variations in product data
    const variations = productData?.variations || productData?.productDetails?.[0]?.variations || [];
    
    if (!variations || variations.length === 0) {
      const section = document.getElementById('variationsSectionContainer');
      if (section) section.style.display = 'none';
      return;
    }

    const html = `
      <div style="overflow-x: auto; background: #fff; border-radius: 8px; border: 1px solid #e0e0e0;">
        <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
          <thead>
            <tr style="background: #f3f3f3;">
              <th style="padding: 12px; text-align: left; color: #232f3e; font-weight: 600; border-bottom: 2px solid #e0e0e0;">ASIN</th>
              <th style="padding: 12px; text-align: left; color: #232f3e; font-weight: 600; border-bottom: 2px solid #e0e0e0;">Variation Type</th>
              <th style="padding: 12px; text-align: left; color: #232f3e; font-weight: 600; border-bottom: 2px solid #e0e0e0;">Value</th>
              <th style="padding: 12px; text-align: center; color: #232f3e; font-weight: 600; border-bottom: 2px solid #e0e0e0;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${variations.map((variation, index) => `
              <tr style="border-bottom: 1px solid #f0f0f0; ${index % 2 === 0 ? 'background: #fafafa;' : ''}">
                <td style="padding: 10px;">
                  <a href="https://www.amazon.com/dp/${variation.asin || 'N/A'}" target="_blank" style="color: #007185; text-decoration: none; font-weight: 500;">
                    ${variation.asin || 'N/A'}
                  </a>
                </td>
                <td style="padding: 10px; color: #232f3e;">${variation.type || 'N/A'}</td>
                <td style="padding: 10px; color: #232f3e;">${variation.value || 'N/A'}</td>
                <td style="padding: 10px; text-align: center; color: #c45500; font-weight: 600;">${variation.price ? `$${variation.price.toFixed(2)}` : 'N/A'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    
    this.sections.variations.innerHTML = html;
  }

  /**
   * Render reviews analysis section
   * @param {Object} productData - Product data containing reviews
   */
  renderReviewsAnalysis(productData) {
    if (!this.sections.reviewsAnalysis) return;
    
    if (!productData || !productData.productDetails) {
      const section = document.getElementById('reviewsAnalysisSectionContainer');
      if (section) section.style.display = 'none';
      return;
    }

    const product = Array.isArray(productData?.productDetails) 
      ? productData.productDetails[0] 
      : productData?.productDetails;
    
    const dto = new ProductDetailsDTO([product]);
    const reviewCount = dto.reviewCount;
    const avgRating = dto.rating;
    
    if (reviewCount === 0 && !avgRating) {
      const section = document.getElementById('reviewsAnalysisSectionContainer');
      if (section) section.style.display = 'none';
      return;
    }

    const ratings = dto.ratings || {};
    const ratingDistribution = ratings.rating_distribution || {};
    
    const html = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
        <div style="padding: 20px; background: #fff; border-radius: 8px; border: 1px solid #e0e0e0; text-align: center;">
          <div style="font-size: 36px; font-weight: bold; color: #ff9900;">${avgRating ? avgRating.toFixed(1) : 'N/A'}</div>
          <div style="font-size: 14px; color: #666; margin-top: 8px;">Average Rating</div>
          ${avgRating ? `
            <div style="margin-top: 10px;">
              ${this.renderStars(avgRating)}
            </div>
          ` : ''}
        </div>
        <div style="padding: 20px; background: #fff; border-radius: 8px; border: 1px solid #e0e0e0; text-align: center;">
          <div style="font-size: 36px; font-weight: bold; color: #232f3e;">${this.formatNumber(reviewCount)}</div>
          <div style="font-size: 14px; color: #666; margin-top: 8px;">Total Reviews</div>
        </div>
      </div>
      ${Object.keys(ratingDistribution).length > 0 ? `
        <div style="margin-top: 20px; background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #e0e0e0;">
          <h5 style="margin: 0 0 15px 0; color: #232f3e; font-size: 14px; font-weight: 600;">Rating Distribution</h5>
          ${[5, 4, 3, 2, 1].map(rating => {
            const count = ratingDistribution[rating] || 0;
            const percentage = reviewCount > 0 ? (count / reviewCount) * 100 : 0;
            return `
              <div style="display: flex; align-items: center; margin-bottom: 12px;">
                <div style="width: 80px; text-align: right; margin-right: 12px;">
                  ${rating} ${this.renderStars(rating, 14)}
                </div>
                <div style="flex: 1; background: #f0f0f0; border-radius: 4px; height: 24px; position: relative; overflow: hidden;">
                  <div style="background: #ff9900; height: 100%; width: ${percentage}%; border-radius: 4px; transition: width 0.3s;"></div>
                </div>
                <div style="width: 100px; text-align: right; margin-left: 12px; font-size: 13px; color: #666; font-weight: 500;">
                  ${count} (${percentage.toFixed(1)}%)
                </div>
              </div>
            `;
          }).join('')}
        </div>
      ` : ''}
      ${avgRating ? `
        <div style="margin-top: 20px; padding: 15px; background: #e7f3ff; border-radius: 8px; border-left: 4px solid #007185; font-size: 13px;">
          <strong style="color: #232f3e;">Review Insights:</strong> 
          ${avgRating >= 4.5 ? 'Excellent product with high customer satisfaction.' : 
            avgRating >= 4.0 ? 'Good product with positive customer feedback.' :
            avgRating >= 3.5 ? 'Average product with mixed reviews.' :
            'Product may need improvement based on customer feedback.'}
        </div>
      ` : ''}
    `;
    
    this.sections.reviewsAnalysis.innerHTML = html;
  }

  /**
   * Main render method - populates all sections with data
   * @param {Object} data - Complete data object from API calls
   */
  render(data) {
    if (!data) {
      console.warn('[Analysis] No data provided');
      return;
    }

    console.log('[Analysis] Rendering with data:', {
      hasProductDetails: !!data.productDetails,
      productDetails: data.productDetails
    });

    this.renderImageComparison(data);
    this.renderVariations(data);
    this.renderReviewsAnalysis(data);
  }

  // Utility methods
  renderStars(rating, size = 16) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    return '★'.repeat(fullStars) + 
           (hasHalfStar ? '½' : '') + 
           '☆'.repeat(emptyStars);
  }

  formatNumber(num) {
    if (typeof num !== 'number' || isNaN(num)) return '0';
    return num.toLocaleString('en-US');
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AnalysisTab;
}
