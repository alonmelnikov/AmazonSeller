// Configuration
const isDebug = true; // Set to true to enable debug logging and cache status display

// Import repositories
import CacheManager from './cache-manager.js';
import ProductDetailsRepository from './repositories/product-details-repository.js';
import ProductHistoryRepository from './repositories/product-history-repository.js';
import ReverseAsinKeywordsRepository from './repositories/reverse-asin-keywords-repository.js';
import CategoryProductsRepository from './repositories/category-products-repository.js';
import SearchResultRepository from './repositories/search-result-repository.js';
import { renderProductDetailsCard } from './ui/cards/product-details-card.js';
import { renderKeywordsCard } from './ui/cards/keywords-card.js';
import { renderCompetitorsCard } from './ui/cards/competitors-card.js';
import { renderProductDetailsTraderScreen, productDetailsScreenTitleFromDto } from './ui/screens/product-details-screen.js';
import { renderCompetitorsScreen } from './ui/screens/competitors-screen.js';

// Initialize cache manager and repositories
const cacheManager = new CacheManager();
const productDetailsRepo = new ProductDetailsRepository(cacheManager, isDebug);
const productHistoryRepo = new ProductHistoryRepository(cacheManager, isDebug);
const reverseAsinKeywordsRepo = new ReverseAsinKeywordsRepository(cacheManager, isDebug);
const categoryProductsRepo = new CategoryProductsRepository(cacheManager, isDebug);
const searchResultRepo = new SearchResultRepository(cacheManager, isDebug);

// Clean expired caches when extension is triggered
cacheManager.cleanExpiredCaches().then(cleanedCount => {
  if (isDebug && cleanedCount > 0) {
    console.log(`[FlowSelector] Cleaned ${cleanedCount} expired cache entries`);
  }
});

console.log('========================================');
console.log('[FlowSelector] Module loaded at:', new Date().toISOString());
console.log('[FlowSelector] isDebug:', isDebug);
console.log('[FlowSelector] Repositories initialized');
console.log('========================================');

// ---------- Competitor selection helpers ----------
function parseMoney(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return Number.isFinite(val) ? val : null;
  const s = String(val);
  const m = s.replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  const n = parseFloat(m[0]);
  return Number.isFinite(n) ? n : null;
}

function normalizeTitle(title) {
  return String(title ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleTokens(title) {
  const t = normalizeTitle(title);
  if (!t) return [];
  const stop = new Set(['the','and','for','with','of','by','to','in','on','a','an','is','at','as','not','or','but','be','are','from','set','pack','new']);
  return t.split(' ').filter(w => w && w.length >= 3 && !stop.has(w));
}

function titleSimilarity(a, b) {
  const ta = titleTokens(a);
  const tb = titleTokens(b);
  if (!ta.length || !tb.length) return 0;
  const sa = new Set(ta);
  const sb = new Set(tb);
  let inter = 0;
  sa.forEach(x => { if (sb.has(x)) inter++; });
  const union = new Set([...sa, ...sb]).size || 1;
  let jaccard = inter / union;
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  const containBonus = (na && nb && (na.includes(nb) || nb.includes(na))) ? 0.2 : 0;
  return Math.min(1, jaccard + containBonus);
}

function extractTitlePrice(productInfo, productDetailsRaw) {
  const raw = Array.isArray(productDetailsRaw) ? productDetailsRaw[0] : productDetailsRaw;
  const title =
    productInfo?.title ||
    raw?.title ||
    raw?.product_title ||
    '';
  const price =
    parseMoney(productInfo?.price) ??
    parseMoney(raw?.price) ??
    parseMoney(raw?.current_price) ??
    parseMoney(raw?.product_price) ??
    null;
  return { title, price };
}

function pickSearchTermFromTitle(title) {
  const toks = titleTokens(title);
  const term = toks.slice(0, 3).join(' ');
  return term || normalizeTitle(title).split(' ').slice(0, 3).join(' ') || '';
}

// NOTE: renderCompetitorsSection moved to ui/screens/CompetitorsScreen.js

// ---------- Full-screen UI / navigation ----------
const ui = {
  mode: 'home', // home | dashboard | details | keywords | competitors | error
  stack: [],
  ctx: null, // { asin, productDetailsResult, keywordResearchResult, competitors, searchResultResult, originalTitle, originalPrice }
};

function enterResultsMode() {
  document.body.classList.add('results-mode');
}

function exitResultsMode() {
  document.body.classList.remove('results-mode');
  const statusDisplay = document.getElementById('statusDisplay');
  if (statusDisplay) {
    statusDisplay.style.display = 'none';
    statusDisplay.innerHTML = '';
    statusDisplay.className = '';
  }
}

function pushMode(nextMode) {
  ui.stack.push(ui.mode);
  ui.mode = nextMode;
}

function popMode() {
  const prev = ui.stack.pop();
  ui.mode = prev || 'home';
}

function getProductDetailsSummary(dto) {
  const toScalar = (v) => {
    if (v === null || v === undefined) return '';
    if (typeof v === 'number') return v;
    if (typeof v === 'string') return v;
    // sometimes APIs nest like { ratings: 4.7 } etc.
    if (typeof v === 'object') {
      if ('ratings' in v) return v.ratings;
      if ('rating' in v) return v.rating;
      if ('number_of_ratings' in v) return v.number_of_ratings;
      if ('review_count' in v) return v.review_count;
    }
    return String(v);
  };

  const d = dto || {};
  const pa = d.product_attributes || {};
  const pd = d.price_details || {};
  const rt = d.ratings || {};
  const pot = d.product_potential || {};

  const title = pa.title || pa.product_title || pa.name || '';
  const brand = pa.brand || '';
  const bsr = Array.isArray(pa?.bsr) ? (pa.bsr[0]?.rank ?? '') : (pa.product_rank || pa.bsr_rank || pa.rank || '');

  // SellerApp DTO example:
  // price_details: { landed_price_new, listing_price_new, currency_code }
  const price = parseMoney(pd.landed_price_new ?? pd.listing_price_new) ?? null;
  const listingPrice = parseMoney(pd.listing_price_new) ?? null;

  // ratings: { ratings, number_of_ratings }
  const rating = toScalar(rt.ratings ?? rt.rating ?? '');
  const reviews = toScalar(rt.number_of_ratings ?? rt.review_count ?? '');

  const salesHigh = pot.sales_estimate_high ?? '';
  const revHigh = pot.revenue_estimate_high ?? '';

  return {
    title: title || '(unknown title)',
    brand: brand || 'N/A',
    price: price != null ? `$${price.toFixed(2)}` : 'N/A',
    listingPrice: listingPrice != null ? `$${listingPrice.toFixed(2)}` : 'N/A',
    rating: rating !== '' && rating != null ? String(rating) : 'N/A',
    reviews: reviews !== '' && reviews != null ? String(reviews) : 'N/A',
    bsr: bsr ? String(bsr) : 'N/A',
    salesHigh: salesHigh ? String(salesHigh) : 'N/A',
    revenueHigh: revHigh ? String(revHigh) : 'N/A',
  };
}

function getKeywordsSummary(dto) {
  const list = Array.isArray(dto?.keyword_list) ? dto.keyword_list : [];
  const first = list[0] || {};
  const key = first.keyword || first.kw || first.name || '';
  const vol = first.search_volume || first.volume || first.v || '';
  return {
    count: list.length,
    topKeyword: key ? String(key) : 'N/A',
    topVolume: vol !== '' && vol != null ? String(vol) : 'N/A',
    preview: list.slice(0, 6),
  };
}

// NOTE: dashboard card previews were refactored into `ui/cards/*`

// NOTE: Product details screen rendering moved to `ui/screens/ProductDetailsScreen.js`

function renderTopBar({ title, subtitle, backAction, homeAction }) {
  return `
    <div style="position:sticky; top:0; z-index:10; background:#111827; color:#fff; padding:16px 18px; display:flex; align-items:center; justify-content:space-between; gap:12px; box-shadow:0 10px 26px rgba(0,0,0,0.18);">
      <div style="display:flex; align-items:center; gap:10px;">
        ${backAction ? `<button data-action="${escapeHtml(backAction)}" style="border:none; background:#374151; color:#fff; padding:10px 14px; border-radius:12px; font-weight:900; cursor:pointer;">← Back</button>` : ''}
        ${homeAction ? `<button data-action="${escapeHtml(homeAction)}" style="border:none; background:#1f2937; color:#fff; padding:10px 14px; border-radius:12px; font-weight:900; cursor:pointer;">Flows</button>` : ''}
        <div>
          <div style="font-weight:950; letter-spacing:0.2px; font-size:14px;">${escapeHtml(title || '')}</div>
          ${subtitle ? `<div style="opacity:0.82; font-size:12px; margin-top:3px;">${escapeHtml(subtitle)}</div>` : ''}
        </div>
      </div>
      <div style="font-size:12px; opacity:0.85;">ASIN: <b>${escapeHtml(ui.ctx?.asin || '')}</b></div>
    </div>
  `;
}

// NOTE: dashboard cards were refactored into `ui/cards/*`

function showDashboard() {
  enterResultsMode();
  pushMode('dashboard');

  const pdSum = getProductDetailsSummary(ui.ctx.productDetailsResult?.data);
  const kwSum = getKeywordsSummary(ui.ctx.keywordResearchResult?.data);
  const compCount = Array.isArray(ui.ctx.competitors) ? ui.ctx.competitors.length : 0;

  const keywordPreviewWords = kwSum.preview.map((k) => (k.keyword || k.kw || k.name || '')).filter(Boolean);
  const competitorPreviewItems = (ui.ctx.competitors || []).slice(0, 3).map(c => ({
    asin: c.asin,
    title: c.searchTitle || ''
  })).filter(x => x && x.asin);
  const competitorPreviewImages = (ui.ctx.competitors || []).slice(0, 3).map(c => {
    const raw = c.rawDetails;
    const r0 = Array.isArray(raw) ? raw[0] : raw;
    const urls = r0?.product_attributes?.image_urls;
    return Array.isArray(urls) ? urls[0] : null;
  }).filter(Boolean);

  const originalTitleForCard = ui.ctx?.originalTitle || pdSum.title || ui.ctx?.asin || '';
  const detailsDto = ui.ctx.productDetailsResult?.data;
  const selectedImageUrl = detailsDto?.product_attributes?.image_urls?.[0] || '';

  const html = `
    <div style="height:100vh; display:flex; flex-direction:column;">
      ${renderTopBar({ title: 'Results Dashboard', subtitle: 'Tap a card to explore', backAction: 'backToFlows' })}
      <div style="flex:1; min-height:0; overflow:auto; background:#f3f4f6; padding:22px 18px;">
        <div style="max-width:1100px; margin:0 auto;">
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(380px, 1fr)); gap:22px;">
            ${renderProductDetailsCard({
              title: originalTitleForCard,
              imageUrl: selectedImageUrl,
              brand: pdSum.brand,
              landedPrice: pdSum.price,
              ratingText: `${pdSum.rating} (${pdSum.reviews})`,
              salesHigh: pdSum.salesHigh
            })}
            ${renderKeywordsCard({
              count: kwSum.count,
              previewWords: keywordPreviewWords
            })}
            ${renderCompetitorsCard({
              count: compCount,
              previewItems: competitorPreviewItems,
              previewImageUrls: competitorPreviewImages
            })}
          </div>
        </div>
      </div>
    </div>
  `;

  displayStatusHtml(html, false);
}

function showProductDetailsScreen() {
  enterResultsMode();
  pushMode('details');
  const dto = ui.ctx.productDetailsResult?.data;
  const url = ui.ctx.productDetailsResult?.url || '';
  const topBarHtml = renderTopBar({
    title: productDetailsScreenTitleFromDto(dto),
    subtitle: 'Trader view',
    backAction: 'backToDashboard',
    homeAction: 'backToFlows'
  });
  displayStatusHtml(renderProductDetailsTraderScreen({ dto, url, topBarHtml, asinOverride: ui.ctx?.asin }), false);
}

function showCompetitorDetailsScreen(asin) {
  enterResultsMode();
  pushMode('competitorDetails');
  const comp = (ui.ctx?.competitors || []).find(c => String(c.asin).toUpperCase() === String(asin).toUpperCase());
  const dto = comp?.details;
  const url = comp?.url || '';
  const topBarHtml = renderTopBar({
    title: productDetailsScreenTitleFromDto(dto),
    subtitle: `Competitor • ${String(asin).toUpperCase()}`,
    backAction: 'backToCompetitors',
    homeAction: 'backToFlows'
  });
  displayStatusHtml(renderProductDetailsTraderScreen({ dto, url, topBarHtml, asinOverride: String(asin).toUpperCase() }), false);
}

function showKeywordsScreen() {
  enterResultsMode();
  pushMode('keywords');

  const dto = ui.ctx.keywordResearchResult?.data;
  const url = ui.ctx.keywordResearchResult?.url || '';
  const raw = ui.ctx.keywordResearchResult?.raw ?? dto;
  const kwSum = getKeywordsSummary(dto);

  const list = Array.isArray(raw?.keyword_list) ? raw.keyword_list : (Array.isArray(dto?.keyword_list) ? dto.keyword_list : []);
  const preview = list.slice(0, 12).map((k, idx) => {
    const key = k.keyword || k.kw || k.name || '';
    const vol = k.search_volume || k.volume || k.v || '';
    const cpc = k.cpc || k.avg_cpc || '';
    return `<tr>
      <td style="padding:8px; border-bottom:1px solid #eef2f7;">${idx + 1}</td>
      <td style="padding:8px; border-bottom:1px solid #eef2f7; font-weight:800;">${escapeHtml(key)}</td>
      <td style="padding:8px; border-bottom:1px solid #eef2f7;">${escapeHtml(String(vol || ''))}</td>
      <td style="padding:8px; border-bottom:1px solid #eef2f7;">${escapeHtml(String(cpc || ''))}</td>
    </tr>`;
  }).join('');

  const html = `
    ${renderTopBar({ title: 'ASIN Keywords', subtitle: `${kwSum.count} keywords`, backAction: 'backToDashboard', homeAction: 'backToFlows' })}
    <div style="height: calc(100vh - 56px); overflow:auto; background:#f3f4f6; padding:16px;">
      <div style="max-width:980px; margin:0 auto;">
        <div style="background:#fff; border:1px solid #e5e7eb; border-radius:14px; padding:14px;">
          <div style="display:flex; justify-content:space-between; gap:12px; align-items:flex-start;">
            <div>
              <div style="font-weight:900; color:#111827;">Top keywords preview</div>
              <div style="margin-top:4px; color:#6b7280; font-size:12px;">Tap “Raw JSON” below to see everything</div>
            </div>
            ${url ? `<a href="${escapeHtml(url)}" target="_blank" style="color:#007185; font-weight:900; text-decoration:none;">Open API URL</a>` : ''}
          </div>
          <div style="margin-top:12px; overflow:auto;">
            <table style="width:100%; border-collapse:collapse; font-size:12px;">
              <thead>
                <tr style="text-align:left; background:#f9fafb;">
                  <th style="padding:8px; border-bottom:1px solid #eef2f7;">#</th>
                  <th style="padding:8px; border-bottom:1px solid #eef2f7;">Keyword</th>
                  <th style="padding:8px; border-bottom:1px solid #eef2f7;">Volume</th>
                  <th style="padding:8px; border-bottom:1px solid #eef2f7;">CPC</th>
                </tr>
              </thead>
              <tbody>${preview || ''}</tbody>
            </table>
          </div>
        </div>
        <div style="margin-top:14px; background:#fff; border:1px solid #e5e7eb; border-radius:14px; padding:14px;">
          <details>
            <summary style="cursor:pointer; font-weight:900; color:#111827;">Raw JSON</summary>
            <pre style="margin:10px 0 0 0; padding:12px; background:#f6f7f9; border:1px solid #e6e8eb; border-radius:10px; overflow:auto; font-size:12px; color:#111;">${escapeHtml(safeJsonStringify(raw))}</pre>
          </details>
        </div>
      </div>
    </div>
  `;
  displayStatusHtml(html, false);
}

function showCompetitorsScreen() {
  enterResultsMode();
  pushMode('competitors');

  const topBarHtml = renderTopBar({ 
    title: 'Competitors', 
    subtitle: 'Selected by title similarity + price proximity', 
    backAction: 'backToDashboard', 
    homeAction: 'backToFlows' 
  });

  const html = renderCompetitorsScreen({
    originalAsin: ui.ctx.asin,
    originalTitle: ui.ctx.originalTitle,
    originalPrice: ui.ctx.originalPrice,
    competitors: ui.ctx.competitors || [],
    topBarHtml
  });

  displayStatusHtml(html, false);
}

function handleUiAction(action) {
  if (!action) return;
  if (action === 'backToFlows') {
    ui.stack = [];
    ui.mode = 'home';
    ui.ctx = null;
    exitResultsMode();
    return;
  }
  if (action === 'backToDashboard') {
    // pop until dashboard (or go straight)
    ui.mode = 'dashboard';
    ui.stack = [];
    showDashboard();
    return;
  }
  if (action === 'backToCompetitors') return showCompetitorsScreen();
  if (action === 'openProductDetails') return showProductDetailsScreen();
  if (action === 'openKeywords') return showKeywordsScreen();
  if (action === 'openCompetitors') return showCompetitorsScreen();
  if (action.startsWith('openCompetitorDetails:')) {
    const asin = action.split(':')[1] || '';
    return showCompetitorDetailsScreen(asin);
  }
}

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
        console.error('Status display not found! Message preview:', message.substring(0, 100));
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

// ---------- HTML status rendering (for elegant API result display) ----------
function escapeHtml(value) {
  const s = value === null || value === undefined ? '' : String(value);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function safeJsonStringify(obj) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch (e) {
    return `"<unserializable: ${String(e?.message || e)}>"`;
  }
}

function truncate(text, max = 80) {
  const s = text === null || text === undefined ? '' : String(text);
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '…';
}

function displayStatusHtml(html, isError = false) {
  const statusDisplay = document.getElementById('statusDisplay');
  if (!statusDisplay) return;
  updateStatusDisplayHtml(statusDisplay, html, isError);
}

function updateStatusDisplayHtml(element, html, isError) {
  element.innerHTML = html;
  element.className = isError ? 'error' : 'success';
  element.style.display = 'block';
  element.style.visibility = 'visible';
  element.style.opacity = '1';
  element.style.background = isError ? '#ffe0e0' : 'rgba(255, 255, 255, 0.95)';
  element.style.color = isError ? '#c92a2a' : '#111';
  element.style.padding = '18px';
  element.style.marginTop = '24px';
  element.style.fontSize = '13px';
  element.style.textAlign = 'left';
  element.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif";
  element.style.border = '3px solid #fff';
  element.style.borderRadius = '12px';
  element.style.maxWidth = '95%';
  element.style.maxHeight = '70vh';
  element.style.overflowY = 'auto';
  element.style.whiteSpace = 'normal';
  element.style.wordWrap = 'break-word';
  element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderApiCard({ asin, stepTitle, apiName, url, fromCache, data, raw }) {
  const cachePill = fromCache ? 'CACHE' : 'API';
  const cacheColor = fromCache ? '#007185' : '#c45500';

  const header = `
    <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:10px;">
      <div>
        <div style="font-weight:700; color:#232f3e; font-size:14px;">${escapeHtml(stepTitle)}</div>
        <div style="color:#555; margin-top:3px;">
          <span style="font-weight:600;">ASIN:</span> ${escapeHtml(asin || 'N/A')}
          <span style="margin:0 8px; color:#aaa;">•</span>
          <span style="font-weight:600;">API:</span> ${escapeHtml(apiName)}
        </div>
      </div>
      <div style="display:flex; align-items:center; gap:10px;">
        <span style="padding:4px 8px; border-radius:999px; font-weight:700; font-size:11px; color:#fff; background:${cacheColor};">
          ${escapeHtml(cachePill)}
        </span>
      </div>
    </div>
  `;

  const urlBlock = url
    ? `<div style="margin-bottom:12px;">
         <a href="${escapeHtml(url)}" target="_blank" style="color:#007185; text-decoration:none; font-weight:600;">Open API URL</a>
         <div style="color:#777; font-size:12px; margin-top:4px;">${escapeHtml(url)}</div>
       </div>`
    : '';

  const body = renderApiBody(apiName, data);

  const rawJson = `
    <details style="margin-top:12px;">
      <summary style="cursor:pointer; color:#232f3e; font-weight:700;">Raw JSON</summary>
      <pre style="margin:10px 0 0 0; padding:12px; background:#f6f7f9; border:1px solid #e6e8eb; border-radius:8px; overflow:auto; font-size:12px; color:#111;">${escapeHtml(safeJsonStringify(raw ?? data))}</pre>
    </details>
  `;

  return `
    <div style="background:#fff; border:1px solid #e6e8eb; border-radius:12px; padding:14px;">
      ${header}
      ${urlBlock}
      ${body}
      ${rawJson}
    </div>
  `;
}

function renderErrorCard({ title, subtitle, error }) {
  const message = error?.message || String(error || 'Unknown error');
  const stack = error?.stack || '';
  const raw = safeJsonStringify(error);

  return `
    <div style="background:#fff; border:1px solid #ffd1d1; border-radius:12px; padding:14px;">
      <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px;">
        <div>
          <div style="font-weight:900; font-size:15px; color:#b42318;">${escapeHtml(title || '❌ Error')}</div>
          ${subtitle ? `<div style="color:#7a271a; margin-top:4px;">${escapeHtml(subtitle)}</div>` : ''}
        </div>
        <span style="padding:4px 8px; border-radius:999px; font-weight:800; font-size:11px; color:#fff; background:#b42318;">ERROR</span>
      </div>
      <div style="margin-top:10px; padding:12px; background:#fff5f5; border:1px solid #ffe3e3; border-radius:10px; color:#7a271a;">
        <div style="font-weight:800; margin-bottom:6px;">Message</div>
        <div style="white-space:pre-wrap;">${escapeHtml(message)}</div>
      </div>
      ${stack ? `
        <details style="margin-top:10px;">
          <summary style="cursor:pointer; color:#7a271a; font-weight:800;">Stack</summary>
          <pre style="margin:10px 0 0 0; padding:12px; background:#f6f7f9; border:1px solid #e6e8eb; border-radius:8px; overflow:auto; font-size:12px; color:#111;">${escapeHtml(stack)}</pre>
        </details>
      ` : ''}
      <details style="margin-top:10px;">
        <summary style="cursor:pointer; color:#7a271a; font-weight:800;">Raw error</summary>
        <pre style="margin:10px 0 0 0; padding:12px; background:#f6f7f9; border:1px solid #e6e8eb; border-radius:8px; overflow:auto; font-size:12px; color:#111;">${escapeHtml(raw)}</pre>
      </details>
    </div>
  `;
}

function renderApiBody(apiName, data) {
  // Product Details DTO shape
  if (apiName === 'getProductDetails') {
    const attrs = data?.product_attributes || {};
    const price = data?.price_details?.landed_price_new;
    const rating = data?.ratings?.ratings;
    const nr = data?.ratings?.number_of_ratings;
    return `
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
        <div style="padding:12px; background:#f8f9fb; border:1px solid #eef0f3; border-radius:10px;">
          <div style="color:#666; font-size:12px;">Title</div>
          <div style="font-weight:700; color:#232f3e; margin-top:4px;">${escapeHtml(truncate(attrs.title || 'N/A', 90))}</div>
          <div style="color:#666; font-size:12px; margin-top:8px;">Brand</div>
          <div style="color:#232f3e; font-weight:600; margin-top:4px;">${escapeHtml(attrs.brand || 'N/A')}</div>
        </div>
        <div style="padding:12px; background:#f8f9fb; border:1px solid #eef0f3; border-radius:10px;">
          <div style="display:flex; justify-content:space-between; gap:10px;">
            <div>
              <div style="color:#666; font-size:12px;">Price</div>
              <div style="font-weight:800; color:#c45500; margin-top:4px;">${price !== undefined && price !== null ? `$${Number(price).toFixed(2)}` : 'N/A'}</div>
            </div>
            <div style="text-align:right;">
              <div style="color:#666; font-size:12px;">Rating</div>
              <div style="font-weight:800; color:#232f3e; margin-top:4px;">${rating !== undefined && rating !== null ? String(rating) : 'N/A'}</div>
              <div style="color:#666; font-size:12px; margin-top:2px;">${nr ? `${escapeHtml(String(nr))} ratings` : ''}</div>
            </div>
          </div>
          <div style="color:#666; font-size:12px; margin-top:10px;">Category depth</div>
          <div style="color:#232f3e; font-weight:600; margin-top:4px;">${Array.isArray(attrs.category) ? attrs.category.length : 0}</div>
        </div>
      </div>
    `;
  }

  // Product History DTO shape
  if (apiName === 'getProductHistory') {
    const priceCount = Array.isArray(data?.price_history) ? data.price_history.length : 0;
    const bsrCount = Array.isArray(data?.bsr_history) ? data.bsr_history.length : 0;
    const ratingsCount = Array.isArray(data?.ratings_history) ? data.ratings_history.length : 0;
    const reviewsCount = Array.isArray(data?.review_count_history) ? data.review_count_history.length : 0;
    const newSellersCount = Array.isArray(data?.new_product_sellers_history) ? data.new_product_sellers_history.length : 0;
    const usedSellersCount = Array.isArray(data?.used_product_sellers_history) ? data.used_product_sellers_history.length : 0;
    return `
      <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:10px;">
        ${renderMetricCard('Price points', priceCount)}
        ${renderMetricCard('BSR points', bsrCount)}
        ${renderMetricCard('Rating points', ratingsCount)}
        ${renderMetricCard('Review count points', reviewsCount)}
        ${renderMetricCard('New sellers points', newSellersCount)}
        ${renderMetricCard('Used sellers points', usedSellersCount)}
      </div>
    `;
  }

  // Reverse ASIN Keywords DTO shape
  if (apiName === 'getReverseAsinKeywords') {
    const list = Array.isArray(data?.keyword_list) ? data.keyword_list : [];
    const top = list.slice(0, 10);
    return `
      ${data?.title ? `<div style="margin-bottom:10px; font-weight:700; color:#232f3e;">${escapeHtml(truncate(data.title, 110))}</div>` : ''}
      <div style="margin-bottom:10px;">${renderMetricCard('Keywords returned', list.length)}</div>
      <div style="overflow:auto; border:1px solid #e6e8eb; border-radius:10px;">
        <table style="width:100%; border-collapse:collapse; font-size:12px;">
          <thead>
            <tr style="background:#f6f7f9; color:#232f3e;">
              <th style="text-align:left; padding:10px; border-bottom:1px solid #e6e8eb;">Keyword</th>
              <th style="text-align:center; padding:10px; border-bottom:1px solid #e6e8eb;">Search Volume</th>
              <th style="text-align:center; padding:10px; border-bottom:1px solid #e6e8eb;">CPC</th>
              <th style="text-align:center; padding:10px; border-bottom:1px solid #e6e8eb;">Relative Score</th>
            </tr>
          </thead>
          <tbody>
            ${top.map((k, idx) => `
              <tr style="background:${idx % 2 === 0 ? '#fff' : '#fafafa'};">
                <td style="padding:10px; color:#232f3e;">${escapeHtml(k?.keyword || 'N/A')}</td>
                <td style="padding:10px; text-align:center; color:#232f3e;">${escapeHtml(k?.search_volume ?? 'N/A')}</td>
                <td style="padding:10px; text-align:center; color:#c45500; font-weight:700;">${typeof k?.cpc === 'number' ? `$${k.cpc.toFixed(2)}` : 'N/A'}</td>
                <td style="padding:10px; text-align:center; color:#232f3e; font-weight:700;">${escapeHtml(k?.relative_score ?? 'N/A')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // Category Products DTO shape
  if (apiName === 'getCategoryProducts') {
    const results = Array.isArray(data?.search_results) ? data.search_results : [];
    const top = results.slice(0, 10);
    return `
      <div style="display:flex; gap:10px; margin-bottom:10px;">
        ${renderMetricCard('Total indexed products', data?.total_indexed_products ?? 'N/A')}
        ${renderMetricCard('Results returned', results.length)}
      </div>
      <div style="overflow:auto; border:1px solid #e6e8eb; border-radius:10px;">
        <table style="width:100%; border-collapse:collapse; font-size:12px;">
          <thead>
            <tr style="background:#f6f7f9; color:#232f3e;">
              <th style="text-align:left; padding:10px; border-bottom:1px solid #e6e8eb;">Rank</th>
              <th style="text-align:left; padding:10px; border-bottom:1px solid #e6e8eb;">ASIN</th>
              <th style="text-align:left; padding:10px; border-bottom:1px solid #e6e8eb;">Title</th>
              <th style="text-align:center; padding:10px; border-bottom:1px solid #e6e8eb;">Price</th>
              <th style="text-align:center; padding:10px; border-bottom:1px solid #e6e8eb;">Rating</th>
              <th style="text-align:center; padding:10px; border-bottom:1px solid #e6e8eb;">Sponsored</th>
            </tr>
          </thead>
          <tbody>
            ${top.map((p, idx) => `
              <tr style="background:${idx % 2 === 0 ? '#fff' : '#fafafa'};">
                <td style="padding:10px; color:#232f3e;">${escapeHtml(p?.product_rank ?? (idx + 1))}</td>
                <td style="padding:10px;">
                  <a href="https://www.amazon.com/dp/${escapeHtml(p?.asin || '')}" target="_blank" style="color:#007185; text-decoration:none; font-weight:700;">
                    ${escapeHtml(p?.asin || 'N/A')}
                  </a>
                </td>
                <td style="padding:10px; color:#232f3e;">${escapeHtml(truncate(p?.title || 'N/A', 70))}</td>
                <td style="padding:10px; text-align:center; color:#c45500; font-weight:700;">${escapeHtml(p?.price || 'N/A')}</td>
                <td style="padding:10px; text-align:center; color:#232f3e;">${escapeHtml(p?.rating || 'N/A')}</td>
                <td style="padding:10px; text-align:center; color:#232f3e;">${p?.is_sponsored ? '✓' : '✗'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  return `
    <div style="padding:12px; background:#f8f9fb; border:1px solid #eef0f3; border-radius:10px; color:#232f3e;">
      <div style="font-weight:700; margin-bottom:6px;">Response</div>
      <div style="color:#555;">${escapeHtml(truncate(safeJsonStringify(data), 300))}</div>
    </div>
  `;
}

function renderMetricCard(label, value) {
  return `
    <div style="padding:12px; background:#f8f9fb; border:1px solid #eef0f3; border-radius:10px;">
      <div style="color:#666; font-size:12px;">${escapeHtml(label)}</div>
      <div style="font-weight:800; color:#232f3e; margin-top:4px;">${escapeHtml(value)}</div>
    </div>
  `;
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
    
    // Check if repositories are available
    if (!productDetailsRepo || !productHistoryRepo) {
      const errorMsg = '❌ Repositories not loaded. Please reload the extension.';
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
        const productDetailsResult = await productDetailsRepo.get(asin, 'us');
        console.log('[Flow 1] getProductDetails() returned:', productDetailsResult);
        const productDetails = productDetailsResult.data;
        const productDetailsUrl = productDetailsResult.url;
        const fromCache1 = productDetailsResult.fromCache;
        console.log('[Flow 1] Product Details:', productDetails);
        
        displayStatusHtml(renderApiCard({
          asin,
          stepTitle: '✅ Step 1/3 Complete',
          apiName: 'getProductDetails',
          url: productDetailsUrl,
          fromCache: fromCache1,
          data: productDetails,
          raw: productDetailsResult.raw
        }));
        
        // Step 2: Call productHistory API
        console.log('========================================');
        console.log('[Flow 1] Step 2/3: Calling getProductHistory()');
        console.log('[Flow 1] ASIN:', asin);
        console.log('[Flow 1] Geo: us, Days: 30');
        console.log('[Flow 1] Time:', new Date().toISOString());
        console.log('========================================');
        displayStatus('🔍 ASIN: ' + asin + '\n\n✅ Step 1/3 Complete\n\nFlow 1: Step 2/3 - Calling getProductHistory...\n⏳ Loading...');
        const productHistoryResult = await productHistoryRepo.get(asin, 'us', 30);
        console.log('[Flow 1] getProductHistory() returned:', productHistoryResult);
        const productHistory = productHistoryResult.data;
        const productHistoryUrl = productHistoryResult.url;
        const fromCache2 = productHistoryResult.fromCache;
        console.log('[Flow 1] Product History:', productHistory);
        
        displayStatusHtml(renderApiCard({
          asin,
          stepTitle: '✅ Step 2/3 Complete',
          apiName: 'getProductHistory',
          url: productHistoryUrl,
          fromCache: fromCache2,
          data: productHistory,
          raw: productHistoryResult.raw
        }));
        
        // Step 3: Call keywordResearch (reverse ASIN) API
        console.log('========================================');
        console.log('[Flow 1] Step 3/3: Calling getReverseAsinKeywords()');
        console.log('[Flow 1] ASIN:', asin);
        console.log('[Flow 1] Geo: us');
        console.log('[Flow 1] Time:', new Date().toISOString());
        console.log('========================================');
        displayStatus('🔍 ASIN: ' + asin + '\n\n✅ Step 1/3 Complete\n✅ Step 2/3 Complete\n\nFlow 1: Step 3/3 - Calling getReverseAsinKeywords...\n⏳ Loading...');
        const keywordResearchResult = await reverseAsinKeywordsRepo.get(asin, 'us');
        console.log('[Flow 1] getReverseAsinKeywords() returned:', keywordResearchResult);
        const keywordResearch = keywordResearchResult.data;
        const keywordResearchUrl = keywordResearchResult.url;
        const fromCache3 = keywordResearchResult.fromCache;
        console.log('[Flow 1] Keyword Research:', keywordResearch);
        
        // Step 4: Call keyword_search_result and fetch competitors
        const original = extractTitlePrice(productInfo, productDetailsResult.raw);
        const searchTerm = pickSearchTermFromTitle(original.title || '');

        displayStatus('🔍 ASIN: ' + asin + '\n\n✅ Step 1/3 Complete\n✅ Step 2/3 Complete\n✅ Step 3/3 Complete\n\nFlow 1: Competitors - Calling keyword_search_result...\nSearch: ' + (searchTerm || '(empty)') + '\n⏳ Loading...');

        const searchResultResult = await searchResultRepo.get(searchTerm || asin, 'us', 1, {
          extendedResponse: 1,
          includeSponsoredResults: 1
        });

        const searchResult = searchResultResult.data;
        const searchResultUrl = searchResultResult.url;
        const fromCache4 = searchResultResult.fromCache;

        // Candidate ASINs from search results
        const rawSearchResults = searchResultResult.raw || searchResult;
        const list = Array.isArray(rawSearchResults?.search_results) ? rawSearchResults.search_results : [];
        const candidates = list
          .filter(r => r && r.asin)
          .map(r => ({
            asin: String(r.asin).toUpperCase(),
            title: r.title || '',
            searchPrice: parseMoney(r.price) ?? parseMoney(r.listing_price),
            isSponsored: !!r.is_sponsored,
            raw: r
          }))
          .filter(r => r.asin && r.asin !== String(asin).toUpperCase());

        const scored = candidates.map(c => {
          const sim = titleSimilarity(original.title, c.title);
          let priceScore = 0.5;
          if (original.price != null && c.searchPrice != null) {
            const denom = Math.max(1, original.price);
            priceScore = Math.max(0, Math.min(1, 1 - (Math.abs(c.searchPrice - original.price) / denom)));
          }
          // Penalize sponsored a bit
          const sponsorAdj = c.isSponsored ? -0.05 : 0.02;
          const score = Math.max(0, Math.min(1, (0.75 * sim) + (0.25 * priceScore) + sponsorAdj));
          return { ...c, sim, priceScore, score };
        });

        const selected = scored.length < 10
          ? scored
          : scored.sort((a, b) => b.score - a.score).slice(0, 10);

        // Fetch product details for selected competitors
        const competitorResults = [];
        for (let i = 0; i < selected.length; i++) {
          const c = selected[i];
          displayStatus('🔍 ASIN: ' + asin + '\n\nCompetitors: fetching details ' + (i + 1) + '/' + selected.length + '\nASIN: ' + c.asin + '\nScore: ' + (c.score * 100).toFixed(1) + '%\n⏳ Loading...');
          try {
            const det = await productDetailsRepo.get(c.asin, 'us');
            competitorResults.push({
              asin: c.asin,
              score: c.score,
              sim: c.sim,
              priceScore: c.priceScore,
              searchTitle: c.title,
              searchPrice: c.searchPrice,
              url: det.url,
              fromCache: det.fromCache,
              details: det.data,
              rawDetails: det.raw
            });
          } catch (e) {
            competitorResults.push({
              asin: c.asin,
              score: c.score,
              sim: c.sim,
              priceScore: c.priceScore,
              searchTitle: c.title,
              searchPrice: c.searchPrice,
              error: e?.message || String(e)
            });
          }
        }

        // Store all API results
        apiResults = {
          productDetails,
          productHistory,
          keywordResearch,
          searchResult,
          competitors: competitorResults
        };
        
        if (statusEl) {
          statusEl.textContent = 'Flow 1: APIs loaded successfully!';
        }

        // Build full-screen dashboard context and show it
        ui.ctx = {
          asin,
          originalTitle: original.title,
          originalPrice: original.price,
          productDetailsResult,
          productHistoryResult,
          keywordResearchResult,
          searchResultResult,
          competitors: competitorResults
        };
        ui.mode = 'home';
        ui.stack = [];
        showDashboard();
        
        // Store results (dashboard navigation intentionally disabled)
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
        displayStatusHtml(renderErrorCard({
          title: '❌ Flow 1 Error',
          subtitle: 'One of the API calls failed',
          error
        }), true);
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
        const productDetails1Result = await productDetailsRepo.get(asin, 'us');
        console.log('[Flow 2] getProductDetails() (Step 1) returned:', productDetails1Result);
        const productDetails1 = productDetails1Result.data;
        const productDetails1Url = productDetails1Result.url;
        const fromCache1_flow2 = productDetails1Result.fromCache;
        console.log('[Flow 2] Product Details (Step 1):', productDetails1);
        
        displayStatusHtml(renderApiCard({
          asin,
          stepTitle: '✅ Step 1/4 Complete',
          apiName: 'getProductDetails',
          url: productDetails1Url,
          fromCache: fromCache1_flow2,
          data: productDetails1,
          raw: productDetails1Result.raw
        }));
        
        // Step 2: Call productHistory API
        console.log('========================================');
        console.log('[Flow 2] Step 2/4: Calling getProductHistory()');
        console.log('[Flow 2] ASIN:', asin);
        console.log('[Flow 2] Geo: us, Days: 30');
        console.log('[Flow 2] Time:', new Date().toISOString());
        console.log('========================================');
        displayStatus('🔍 ASIN: ' + asin + '\n\n✅ Step 1/4 Complete\n\nFlow 2: Step 2/4 - Calling getProductHistory...\n⏳ Loading...');
        const productHistoryResult = await productHistoryRepo.get(asin, 'us', 30);
        console.log('[Flow 2] getProductHistory() returned:', productHistoryResult);
        const productHistory = productHistoryResult.data;
        const productHistoryUrl = productHistoryResult.url;
        const fromCache2_flow2 = productHistoryResult.fromCache;
        console.log('[Flow 2] Product History:', productHistory);
        displayStatusHtml(renderApiCard({
          asin,
          stepTitle: '✅ Step 2/4 Complete',
          apiName: 'getProductHistory',
          url: productHistoryUrl,
          fromCache: fromCache2_flow2,
          data: productHistory,
          raw: productHistoryResult.raw
        }));
        
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
        let categoryProductsResult = null;
        let fromCache3_flow2 = false;
        if (categoryId) {
          console.log('========================================');
          console.log('[Flow 2] Step 3/4: Calling getCategoryProducts()');
          console.log('[Flow 2] categoryId:', categoryId);
          console.log('[Flow 2] Geo: us, Limit: 20, Page: 1');
          console.log('[Flow 2] Time:', new Date().toISOString());
          console.log('========================================');
          displayStatus('🔍 ASIN: ' + asin + '\n\n✅ Step 1/4 Complete\n✅ Step 2/4 Complete\n\nFlow 2: Step 3/4 - Calling getCategoryProducts...\nCategoryId: ' + categoryId + '\n⏳ Loading...');
          categoryProductsResult = await categoryProductsRepo.get(categoryId, 'us', 1, 1);
          console.log('[Flow 2] getCategoryProducts() returned:', categoryProductsResult);
          categoryProducts = categoryProductsResult.data;
          categoryProductsUrl = categoryProductsResult.url;
          fromCache3_flow2 = categoryProductsResult.fromCache;
          console.log('[Flow 2] Category Products:', categoryProducts);
          
          displayStatusHtml(renderApiCard({
            asin,
            stepTitle: '✅ Step 3/4 Complete',
            apiName: 'getCategoryProducts',
            url: categoryProductsUrl,
            fromCache: fromCache3_flow2,
            data: categoryProducts,
            raw: categoryProductsResult.raw
          }));
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
        const productDetails2Result = await productDetailsRepo.get(asin, 'us');
        console.log('[Flow 2] getProductDetails() (Step 4) returned:', productDetails2Result);
        const productDetails2 = productDetails2Result.data;
        const productDetails2Url = productDetails2Result.url;
        const fromCache4_flow2 = productDetails2Result.fromCache;
        console.log('[Flow 2] Product Details (Step 4):', productDetails2);

        displayStatusHtml(renderApiCard({
          asin,
          stepTitle: '✅ Step 4/4 Complete',
          apiName: 'getProductDetails',
          url: productDetails2Url,
          fromCache: fromCache4_flow2,
          data: productDetails2,
          raw: productDetails2Result.raw
        }));
        
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

        displayStatusHtml(`
          <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:12px;">
            <div>
              <div style="font-weight:900; font-size:16px; color:#232f3e;">✅ Flow 2 Complete</div>
              <div style="color:#555; margin-top:4px;"><span style="font-weight:700;">ASIN:</span> ${escapeHtml(asin)}</div>
            </div>
          </div>
          <div style="display:grid; grid-template-columns: 1fr; gap:12px;">
            ${renderApiCard({ asin, stepTitle: 'Result 1/4', apiName: 'getProductDetails', url: productDetails1Url, fromCache: fromCache1_flow2, data: productDetails1, raw: productDetails1Result.raw })}
            ${renderApiCard({ asin, stepTitle: 'Result 2/4', apiName: 'getProductHistory', url: productHistoryUrl, fromCache: (typeof fromCache2_flow2 === 'boolean' ? fromCache2_flow2 : false), data: productHistory, raw: (productHistoryResult?.raw ?? null) })}
            ${categoryProducts ? renderApiCard({ asin, stepTitle: 'Result 3/4', apiName: 'getCategoryProducts', url: categoryProductsUrl, fromCache: (typeof fromCache3_flow2 === 'boolean' ? fromCache3_flow2 : false), data: categoryProducts, raw: (categoryProductsResult?.raw ?? null) }) : `
              <div style="background:#fff; border:1px solid #e6e8eb; border-radius:12px; padding:14px;">
                <div style="font-weight:800; color:#232f3e;">⚠️ Step 3/4 Skipped</div>
                <div style="color:#555; margin-top:4px;">Could not extract <span style="font-weight:700;">categoryId</span> from product details.</div>
              </div>
            `}
            ${renderApiCard({ asin, stepTitle: 'Result 4/4', apiName: 'getProductDetails', url: productDetails2Url, fromCache: fromCache4_flow2, data: productDetails2, raw: productDetails2Result.raw })}
          </div>
        `, false);
        
        // Store results (dashboard navigation intentionally disabled)
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
        displayStatusHtml(renderErrorCard({
          title: '❌ Flow 2 Error',
          subtitle: 'One of the API calls failed',
          error
        }), true);
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

  // Event delegation for full-screen UI buttons/cards rendered into #statusDisplay
  if (statusDisplay) {
    statusDisplay.addEventListener('click', (e) => {
      // Allow normal navigation for links inside screens/cards
      const anchor = e.target?.closest?.('a[href]');
      if (anchor) return;

      const el = e.target?.closest?.('[data-action]');
      const action = el?.getAttribute?.('data-action');
      if (action) {
        e.preventDefault();
        e.stopPropagation();
        handleUiAction(action);
      }
    });
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

