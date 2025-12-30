/**
 * ProductDetailsScreen.js
 * Reusable "Trader View" screen renderer for SellerApp ProductDetails DTO.
 *
 * Used by:
 * - Selected product details screen
 * - Competitor details screen
 */

import { escapeHtml } from '../cards/card-base.js';

function truncate(str, max = 60) {
  const s = str == null ? '' : String(str);
  if (s.length <= max) return s;
  return s.slice(0, Math.max(0, max - 1)) + '…';
}

function safeJsonStringify(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function parseMoney(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const s = String(v).replace(/[^0-9.]/g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {object} params
 * @param {object} params.dto ProductDetailsDTO (or compatible plain object)
 * @param {string} params.url API URL
 * @param {string} params.topBarHtml HTML string for the top bar (rendered by caller)
 * @param {string} [params.asinOverride] optional ASIN for display
 * @returns {string} full-screen HTML
 */
export function renderProductDetailsTraderScreen({ dto, url, topBarHtml, asinOverride }) {
  const d = dto || {};
  const pa = d.product_attributes || {};
  const pd = d.price_details || {};
  const rt = d.ratings || {};
  const pot = d.product_potential || {};
  const spec = d.product_specifications || {};
  const promo = d.promotions || {};

  const title = pa.title || pa.product_title || pa.name || '';
  const asin = asinOverride || pa.asin || '';
  const brand = pa.brand || '';
  const img = Array.isArray(pa.image_urls) ? pa.image_urls[0] : '';

  const landed = parseMoney(pd.landed_price_new) ?? parseMoney(pd.listing_price_new) ?? null;
  const listing = parseMoney(pd.listing_price_new) ?? null;
  const currency = pd.currency_code || 'USD';

  const rating = rt.ratings ?? rt.rating ?? '';
  const reviews = rt.number_of_ratings ?? rt.review_count ?? '';

  const salesLow = pot.sales_estimate_low ?? '';
  const salesHigh = pot.sales_estimate_high ?? '';
  const revLow = pot.revenue_estimate_low ?? '';
  const revHigh = pot.revenue_estimate_high ?? '';

  const cats = Array.isArray(pa.category) ? pa.category : [];
  const bsr = Array.isArray(pa.bsr) ? pa.bsr : [];
  const deals = Array.isArray(promo.deals) ? promo.deals : [];
  const promoDetails = Array.isArray(promo.promo_details) ? promo.promo_details : [];
  const sellersCount = pa.number_of_sellers ?? '';
  const dateFirstAvailable = pa.date_first_available || '';
  const weightLb = spec?.item_dimensions?.weight ?? spec?.package_dimensions?.weight ?? null;
  const dims = spec?.item_dimensions || spec?.package_dimensions || null;
  const parentAsins = Array.isArray(spec.parent_asins) ? spec.parent_asins : [];
  const relationships = Array.isArray(pa.relationships) ? pa.relationships : [];

  const pill = (label, value) => `
    <div style="padding:10px 12px; border-radius:14px; border:1px solid #e5e7eb; background:#fff; min-width:0;">
      <div style="font-size:11px; color:#6b7280; font-weight:900;">${escapeHtml(label)}</div>
      <div style="font-size:13px; color:#111827; font-weight:950; margin-top:4px; overflow-wrap:anywhere;">${escapeHtml(value)}</div>
    </div>
  `;

  const priceStr = landed != null ? `${currency} $${landed.toFixed(2)}` : 'N/A';
  const listingStr = listing != null ? `${currency} $${listing.toFixed(2)}` : 'N/A';
  const bsrTop = bsr?.[0]?.rank != null ? `#${bsr[0].rank}` : 'N/A';
  const categoryTop = cats?.[cats.length - 1]?.name || cats?.[0]?.name || 'N/A';
  const dimsStr = dims
    ? `${dims.length ?? '?'}×${dims.width ?? '?'}×${dims.height ?? '?'} ${dims.length_unit || ''}`.trim()
    : 'N/A';
  const weightStr = (weightLb != null) ? `${weightLb} ${dims?.weight_unit || 'lb'}` : 'N/A';

  return `
    <div style="height:100vh; display:flex; flex-direction:column;">
      ${topBarHtml || ''}
      <div style="flex:1; min-height:0; overflow:auto; background:#f3f4f6; padding:18px;">
        <div style="max-width:1100px; margin:0 auto;">
          <div style="background:#fff; border:1px solid #e5e7eb; border-radius:18px; padding:18px;">
            <div style="display:flex; gap:16px; align-items:flex-start; flex-wrap:wrap;">
              <div style="width:140px; height:140px; border-radius:16px; background:#f9fafb; border:1px solid #eef2f7; display:flex; align-items:center; justify-content:center; overflow:hidden;">
                ${img ? `<img src="${escapeHtml(img)}" loading="lazy" referrerpolicy="no-referrer" style="width:100%; height:100%; object-fit:contain;" />` : `<div style="color:#6b7280; font-weight:900;">No image</div>`}
              </div>
              <div style="flex:1; min-width:280px;">
                <div style="font-weight:950; font-size:16px; color:#111827; line-height:1.25;">${escapeHtml(title || '')}</div>
                <div style="margin-top:8px; color:#6b7280; font-size:12px;">
                  ASIN: <b>${escapeHtml(asin)}</b>${brand ? ` • Brand: <b>${escapeHtml(brand)}</b>` : ''}${dateFirstAvailable ? ` • First available: <b>${escapeHtml(dateFirstAvailable)}</b>` : ''}
                </div>
                <div style="margin-top:12px; display:grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap:10px;">
                  ${pill('Landed price', priceStr)}
                  ${pill('Listing price', listingStr)}
                  ${pill('BSR (top)', bsrTop)}
                  ${pill('Category', categoryTop)}
                  ${pill('Sellers', sellersCount !== '' ? String(sellersCount) : 'N/A')}
                  ${pill('Sales est (high)', salesHigh !== '' ? String(salesHigh) : 'N/A')}
                  ${pill('Revenue est (high)', revHigh !== '' ? String(revHigh) : 'N/A')}
                  ${pill('Weight', weightStr)}
                  ${pill('Dims', dimsStr)}
                  ${pill('Rating', rating !== '' ? String(rating) : 'N/A')}
                  ${pill('Reviews', reviews !== '' ? String(reviews) : 'N/A')}
                </div>
                ${url ? `<div style="margin-top:12px;"><a href="${escapeHtml(url)}" target="_blank" style="color:#007185; font-weight:950; text-decoration:none;">Open API URL</a></div>` : ''}
              </div>
            </div>
          </div>

          <div style="margin-top:14px; display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:14px;">
            <div style="background:#fff; border:1px solid #e5e7eb; border-radius:18px; padding:16px;">
              <div style="font-weight:950; color:#111827;">Sales & revenue range</div>
              <div style="margin-top:12px; display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
                ${pill('Sales (low)', salesLow !== '' ? String(salesLow) : 'N/A')}
                ${pill('Sales (high)', salesHigh !== '' ? String(salesHigh) : 'N/A')}
                ${pill('Revenue (low)', revLow !== '' ? String(revLow) : 'N/A')}
                ${pill('Revenue (high)', revHigh !== '' ? String(revHigh) : 'N/A')}
              </div>
            </div>

            <div style="background:#fff; border:1px solid #e5e7eb; border-radius:18px; padding:16px;">
              <div style="font-weight:950; color:#111827;">Category path</div>
              <div style="margin-top:10px; display:flex; flex-direction:column; gap:8px;">
                ${(cats.slice(0, 6)).map(c => `
                  <div style="padding:10px 12px; border-radius:14px; background:#f9fafb; border:1px solid #eef2f7; font-size:12px; font-weight:900; color:#111827; overflow-wrap:anywhere;">
                    ${escapeHtml(c.name || '')}
                  </div>
                `).join('') || `<div style="color:#6b7280;">N/A</div>`}
              </div>
            </div>
          </div>

          <div style="margin-top:14px; background:#fff; border:1px solid #e5e7eb; border-radius:18px; padding:16px;">
            <div style="font-weight:950; color:#111827;">BSR ranks</div>
            <div style="margin-top:10px; display:grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap:10px;">
              ${(bsr.slice(0, 8)).map(b => `
                <div style="padding:10px 12px; border-radius:14px; background:#f9fafb; border:1px solid #eef2f7; font-size:12px; color:#111827;">
                  <b>#${escapeHtml(b.rank)}</b> • ${escapeHtml(b.name || '')}
                </div>
              `).join('') || `<div style="color:#6b7280;">N/A</div>`}
            </div>
          </div>

          ${(deals.length || promoDetails.length) ? `
            <div style="margin-top:14px; background:#fff; border:1px solid #e5e7eb; border-radius:18px; padding:16px;">
              <div style="font-weight:950; color:#111827;">Promotions</div>
              ${deals.length ? `<div style="margin-top:10px; display:flex; gap:10px; flex-wrap:wrap;">
                ${deals.slice(0, 8).map(d => `<div style="padding:8px 12px; border-radius:999px; background:#ecfeff; border:1px solid #cffafe; color:#155e75; font-weight:950; font-size:12px;">${escapeHtml(d)}</div>`).join('')}
              </div>` : ''}
              ${promoDetails.length ? `<div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap;">
                ${promoDetails.slice(0, 8).map(p => `<div style="padding:8px 12px; border-radius:14px; background:#fff7ed; border:1px solid #ffedd5; color:#7c2d12; font-weight:950; font-size:12px;">
                  ${escapeHtml(p.promo_code || '')} • ${escapeHtml(String(p.discount_percentage || ''))}%
                </div>`).join('')}
              </div>` : ''}
            </div>
          ` : ''}

          ${(parentAsins.length || relationships.length) ? `
            <div style="margin-top:14px; background:#fff; border:1px solid #e5e7eb; border-radius:18px; padding:16px;">
              <div style="font-weight:950; color:#111827;">Variations / relationships</div>
              ${parentAsins.length ? `<div style="margin-top:10px; color:#6b7280; font-size:12px;">Parent ASINs</div>
                <div style="margin-top:8px; display:flex; flex-wrap:wrap; gap:10px;">
                  ${parentAsins.slice(0, 10).map(a => `<a href="https://www.amazon.com/dp/${escapeHtml(a)}" target="_blank" style="padding:8px 12px; border-radius:999px; background:#f9fafb; border:1px solid #eef2f7; color:#111827; font-weight:950; font-size:12px; text-decoration:none;">${escapeHtml(a)}</a>`).join('')}
                </div>` : ''}
              ${relationships.length ? `<details style="margin-top:12px;">
                <summary style="cursor:pointer; font-weight:950; color:#111827;">Show relationship JSON</summary>
                <pre style="margin:10px 0 0 0; padding:12px; background:#f6f7f9; border:1px solid #e6e8eb; border-radius:10px; overflow:auto; font-size:12px; color:#111;">${escapeHtml(safeJsonStringify(relationships))}</pre>
              </details>` : ''}
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

export function productDetailsScreenTitleFromDto(dto) {
  const pa = dto?.product_attributes || {};
  const title = pa.title || pa.product_title || pa.name || 'Product Details';
  return truncate(title, 60);
}


