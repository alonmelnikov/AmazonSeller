/**
 * keywords-tab.js
 * Module for displaying Keywords tab content
 * Handles: Reverse ASIN, Metrics, Trends
 */

import ReverseAsinKeywordsDTO from './dto/reverse-asin-keywords-dto.js';

class KeywordsTab {
  constructor() {
    this.sections = {
      reverseAsin: document.getElementById('reverseAsinSection'),
      keywordMetrics: document.getElementById('keywordMetricsSection'),
      keywordTrends: document.getElementById('keywordTrendsSection')
    };
  }

  /**
   * Render reverse ASIN keywords section
   * @param {Object} keywordData - Reverse ASIN keywords from API
   */
  renderReverseAsin(keywordData) {
    if (!this.sections.reverseAsin) return;
    
    if (!keywordData) {
      this.sections.reverseAsin.innerHTML = '<p style="color: #999;">No reverse ASIN keywords available</p>';
      return;
    }

    const dto = new ReverseAsinKeywordsDTO(keywordData);
    const keywordList = Array.isArray(dto.keyword_list) ? dto.keyword_list : [];
    if (keywordList.length === 0) {
      this.sections.reverseAsin.innerHTML = '<p style="color: #999;">No reverse ASIN keywords available</p>';
      return;
    }

    const topKeywords = [...keywordList]
      .sort((a, b) => this.scoreToWeight(b.relative_score) - this.scoreToWeight(a.relative_score))
      .slice(0, 50);

    const html = `
      ${dto.title ? `<div style="margin-bottom: 10px; color: #232f3e; font-weight: 600;">${dto.title}</div>` : ''}
      <div style="overflow-x: auto; background: #fff; border-radius: 8px; border: 1px solid #e0e0e0;">
        <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
          <thead>
            <tr style="background: #f3f3f3;">
              <th style="padding: 12px; text-align: left; color: #232f3e; font-weight: 600; border-bottom: 2px solid #e0e0e0;">Keyword</th>
              <th style="padding: 12px; text-align: center; color: #232f3e; font-weight: 600; border-bottom: 2px solid #e0e0e0;">Search Volume</th>
              <th style="padding: 12px; text-align: center; color: #232f3e; font-weight: 600; border-bottom: 2px solid #e0e0e0;">CPC</th>
              <th style="padding: 12px; text-align: center; color: #232f3e; font-weight: 600; border-bottom: 2px solid #e0e0e0;">Relative Score</th>
            </tr>
          </thead>
          <tbody>
            ${topKeywords.map((item, index) => `
              <tr style="border-bottom: 1px solid #f0f0f0; ${index % 2 === 0 ? 'background: #fafafa;' : ''}">
                <td style="padding: 10px; color: #232f3e; font-weight: 500;">${item.keyword || 'N/A'}</td>
                <td style="padding: 10px; text-align: center; color: #232f3e;">${this.formatNumber(item.search_volume)}</td>
                <td style="padding: 10px; text-align: center; color: #c45500; font-weight: 600;">${typeof item.cpc === 'number' ? `$${item.cpc.toFixed(2)}` : 'N/A'}</td>
                <td style="padding: 10px; text-align: center;">
                  <span style="background: ${this.getScoreColor(item.relative_score)}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">
                    ${item.relative_score || 'N/A'}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <p style="color: #666; font-size: 12px; margin-top: 10px;">
        Showing top ${Math.min(keywordList.length, 50)} keywords.
      </p>
    `;
    
    this.sections.reverseAsin.innerHTML = html;
  }

  /**
   * Render keyword metrics section
   * @param {Object} keywordData - Keyword data for metrics calculation
   */
  renderKeywordMetrics(keywordData) {
    if (!this.sections.keywordMetrics) return;
    
    if (!keywordData) {
      this.sections.keywordMetrics.innerHTML = '<p style="color: #999;">No keyword metrics available</p>';
      return;
    }

    const dto = new ReverseAsinKeywordsDTO(keywordData);
    const keywords = Array.isArray(dto.keyword_list) ? dto.keyword_list : [];
    if (keywords.length === 0) {
      this.sections.keywordMetrics.innerHTML = '<p style="color: #999;">No keyword metrics available</p>';
      return;
    }
    
    // Calculate metrics directly from keywords array
    const totalKeywords = keywords.length;
    const totalSearchVolume = keywords.reduce((sum, kw) => sum + this.parseSearchVolume(kw.search_volume), 0);
    const averageCPC = totalKeywords > 0 ? keywords.reduce((sum, kw) => sum + (kw.cpc || 0), 0) / totalKeywords : 0;
    const averageScoreWeight = totalKeywords > 0 ? keywords.reduce((sum, kw) => sum + this.scoreToWeight(kw.relative_score), 0) / totalKeywords : 0;
    const highVolumeKeywords = keywords.filter(kw => this.parseSearchVolume(kw.search_volume) > 1000);
    const lowCPCKeywords = keywords.filter(kw => (kw.cpc || 0) < 1);

    const html = `
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px;">
        <div style="padding: 20px; background: #fff; border-radius: 8px; border: 1px solid #e0e0e0; text-align: center;">
          <div style="font-size: 28px; font-weight: bold; color: #232f3e;">${this.formatNumber(totalKeywords)}</div>
          <div style="font-size: 13px; color: #666; margin-top: 8px;">Total Keywords</div>
        </div>
        <div style="padding: 20px; background: #fff; border-radius: 8px; border: 1px solid #e0e0e0; text-align: center;">
          <div style="font-size: 28px; font-weight: bold; color: #c45500;">${this.formatNumber(totalSearchVolume)}</div>
          <div style="font-size: 13px; color: #666; margin-top: 8px;">Total Search Volume</div>
        </div>
        <div style="padding: 20px; background: #fff; border-radius: 8px; border: 1px solid #e0e0e0; text-align: center;">
          <div style="font-size: 28px; font-weight: bold; color: #ff9900;">$${averageCPC.toFixed(2)}</div>
          <div style="font-size: 13px; color: #666; margin-top: 8px;">Average CPC</div>
        </div>
      </div>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 15px;">
        <div style="padding: 15px; background: #fff3cd; border-radius: 8px; border-left: 4px solid #ff9900;">
          <strong style="color: #232f3e;">High Volume Keywords:</strong> ${highVolumeKeywords.length} (${totalKeywords > 0 ? ((highVolumeKeywords.length/totalKeywords)*100).toFixed(1) : 0}%)
          <br><small style="color: #666;">Keywords with search volume > 1,000</small>
        </div>
        <div style="padding: 15px; background: #d1ecf1; border-radius: 8px; border-left: 4px solid #007185;">
          <strong style="color: #232f3e;">Low CPC Keywords:</strong> ${lowCPCKeywords.length} (${totalKeywords > 0 ? ((lowCPCKeywords.length/totalKeywords)*100).toFixed(1) : 0}%)
          <br><small style="color: #666;">Keywords with CPC < $1.00</small>
        </div>
      </div>
      <div style="padding: 15px; background: #e7f3ff; border-radius: 8px; border-left: 4px solid #007185;">
        <strong style="color: #232f3e;">Average Relative Score:</strong> ${averageScoreWeight.toFixed(2)} (weighted)
        <br><small style="color: #666;">Higher scores indicate better keyword relevance and conversion potential</small>
      </div>
    `;
    
    this.sections.keywordMetrics.innerHTML = html;
  }

  /**
   * Render keyword trends section
   * @param {Object} keywordData - Keyword data for trends analysis
   */
  renderKeywordTrends(keywordData) {
    if (!this.sections.keywordTrends) return;
    
    if (!keywordData) {
      this.sections.keywordTrends.innerHTML = '<p style="color: #999;">No keyword trends available</p>';
      return;
    }

    const dto = new ReverseAsinKeywordsDTO(keywordData);
    const keywords = Array.isArray(dto.keyword_list) ? dto.keyword_list : [];
    if (keywords.length === 0) {
      this.sections.keywordTrends.innerHTML = '<p style="color: #999;">No keyword trends available</p>';
      return;
    }

    const sortedByVolume = [...keywords].sort((a, b) => this.parseSearchVolume(b.search_volume) - this.parseSearchVolume(a.search_volume));
    const topKeywords = sortedByVolume.slice(0, 10);

    const html = `
      <div style="margin-bottom: 15px;">
        <h5 style="margin: 0 0 12px 0; color: #232f3e; font-size: 14px; font-weight: 600;">Top 10 Keywords by Search Volume</h5>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${topKeywords.map((item, index) => `
            <div style="display: flex; align-items: center; padding: 12px; background: #fff; border-radius: 8px; border: 1px solid #e0e0e0;">
              <div style="width: 40px; text-align: center; font-weight: bold; color: #ff9900; font-size: 16px;">#${index + 1}</div>
              <div style="flex: 1; font-weight: 500; color: #232f3e;">${item.keyword || 'N/A'}</div>
              <div style="width: 120px; text-align: right; color: #666; font-size: 13px;">
                ${this.formatNumber(item.search_volume)} searches
              </div>
              <div style="width: 100px; text-align: right; color: #c45500; font-size: 13px; font-weight: 600;">
                ${typeof item.cpc === 'number' ? `$${item.cpc.toFixed(2)}` : 'N/A'} CPC
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      <div style="padding: 15px; background: #e7f3ff; border-radius: 8px; border-left: 4px solid #007185;">
        <strong style="color: #232f3e;">Trend Analysis:</strong> These keywords represent the highest search volume opportunities.
        Focus on optimizing for these terms to maximize visibility and potential sales.
      </div>
    `;
    
    this.sections.keywordTrends.innerHTML = html;
  }

  /**
   * Main render method - populates all sections with data
   * @param {Object} data - Complete data object from API calls
   */
  render(data) {
    if (!data) {
      console.warn('[Keywords] No data provided');
      return;
    }

    const keywordData = data.keywordResearch || data.reverseAsin || null;
    
    console.log('[Keywords] Rendering with keyword data:', {
      hasKeywordResearch: !!data.keywordResearch,
      hasReverseAsin: !!data.reverseAsin,
      keywordDataLength: Array.isArray(keywordData) ? keywordData.length : 'not array',
      keywordData: keywordData
    });
    
    if (keywordData) {
      this.renderReverseAsin(keywordData);
      this.renderKeywordMetrics(keywordData);
      this.renderKeywordTrends(keywordData);
    } else {
      console.warn('[Keywords] No keyword data to render');
      this.sections.reverseAsin.innerHTML = '<p style="color: #999;">No keyword data available</p>';
      this.sections.keywordMetrics.innerHTML = '<p style="color: #999;">No keyword metrics available</p>';
      this.sections.keywordTrends.innerHTML = '<p style="color: #999;">No keyword trends available</p>';
    }
  }

  // Utility methods
  formatNumber(num) {
    if (num === null || num === undefined) return '0';
    if (typeof num === 'number' && !isNaN(num)) return num.toLocaleString('en-US');
    if (typeof num === 'string') {
      const trimmed = num.trim();
      if (trimmed.startsWith('<')) return trimmed; // e.g. "<100"
      const n = Number(trimmed.replace(/,/g, ''));
      if (!Number.isFinite(n)) return trimmed;
      return n.toLocaleString('en-US');
    }
    return '0';
  }

  getScoreColor(score) {
    const w = this.scoreToWeight(score);
    if (w >= 4) return '#28a745'; // Very High
    if (w >= 3) return '#ff9900'; // High
    if (w >= 2) return '#fd7e14'; // Medium
    if (w >= 1) return '#dc3545'; // Low
    return '#999';
  }

  scoreToWeight(score) {
    if (score === null || score === undefined) return 0;
    if (typeof score === 'number' && Number.isFinite(score)) return score;
    const s = String(score).trim().toLowerCase();
    if (s === 'very high') return 4;
    if (s === 'high') return 3;
    if (s === 'medium') return 2;
    if (s === 'low') return 1;
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }

  parseSearchVolume(v) {
    if (v === null || v === undefined) return 0;
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    const s = String(v).trim();
    if (s.startsWith('<')) return 50;
    const n = Number(s.replace(/,/g, ''));
    return Number.isFinite(n) ? n : 0;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = KeywordsTab;
}
