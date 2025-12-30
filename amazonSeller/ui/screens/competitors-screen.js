/**
 * CompetitorsScreen.js
 * Screen for displaying all competitors with trader-focused data.
 */

import { escapeHtml } from '../cards/card-base.js';

function parseMoney(value) {
  if (value == null || value === '') return null;
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(num) ? num : null;
}

export function renderCompetitorsScreen({ originalAsin, originalTitle, originalPrice, competitors, topBarHtml }) {
  const origPriceStr = originalPrice != null ? `$${Number(originalPrice).toFixed(2)}` : 'N/A';

  const fmtNum = (n) => {
    const num = Number(n);
    if (!Number.isFinite(num)) return String(n ?? 'N/A');
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
    return String(num);
  };

  const fmtMoney = (n) => {
    const num = Number(n);
    if (!Number.isFinite(num)) return 'N/A';
    return `$${num.toFixed(2)}`;
  };

  const cards = competitors.map((c, idx) => {
    const scorePct = c.score != null ? `${(c.score * 100).toFixed(1)}%` : 'N/A';
    const searchPriceStr = c.searchPrice != null ? `$${Number(c.searchPrice).toFixed(2)}` : 'N/A';
    const raw = c.rawDetails;
    const r0 = Array.isArray(raw) ? raw[0] : raw;

    // SellerApp ProductDetails shape
    const pa = r0?.product_attributes || {};
    const pd = r0?.price_details || {};
    const pot = r0?.product_potential || {};
    const rt = r0?.ratings || {};
    const bsrArr = Array.isArray(pa?.bsr) ? pa.bsr : [];

    const img = Array.isArray(pa.image_urls) ? pa.image_urls[0] : '';
    const title = pa.title || c.searchTitle || c.asin;
    const brand = pa.brand || '';
    const sellers = pa.number_of_sellers ?? '';
    const bsrTop = bsrArr[0]?.rank != null ? `#${bsrArr[0].rank}` : 'N/A';

    const landed = parseMoney(pd.landed_price_new ?? pd.listing_price_new);
    const priceStr = landed != null ? fmtMoney(landed) : searchPriceStr;

    const rating = rt.ratings ?? rt.rating ?? '';
    const reviews = rt.number_of_ratings ?? rt.review_count ?? '';

    const salesHigh = pot.sales_estimate_high ?? '';
    const revHigh = pot.revenue_estimate_high ?? '';

    const err = c.error
      ? `<div style="margin-top:8px; padding:10px; background:#fff5f5; border:1px solid #ffe3e3; border-radius:10px; color:#7a271a;">
           <div style="font-weight:800; margin-bottom:4px;">Error fetching details</div>
           <div style="white-space:pre-wrap;">${escapeHtml(c.error)}</div>
         </div>`
      : '';

    return `
      <div data-action="openCompetitorDetails:${escapeHtml(c.asin)}" style="background:#fff; border:1px solid #e6e8eb; border-radius:12px; padding:14px; margin-bottom:14px; cursor:pointer;">
        <div style="display:flex; justify-content:space-between; gap:12px; align-items:flex-start;">
          <div style="flex:1;">
            <div style="display:flex; gap:12px; align-items:flex-start;">
              <div style="width:64px; height:64px; border-radius:14px; overflow:hidden; background:#f9fafb; border:1px solid #eef2f7; flex:0 0 auto; display:flex; align-items:center; justify-content:center;">
                ${img ? `<img src="${escapeHtml(img)}" style="width:100%; height:100%; object-fit:cover;" loading="lazy" referrerpolicy="no-referrer" />` : `<div style="color:#6b7280; font-weight:900; font-size:11px;">No image</div>`}
              </div>
              <div style="min-width:0; flex:1;">
                <div style="font-weight:950; color:#111827; font-size:14px; line-height:1.25;">
                  #${idx + 1} • ${escapeHtml(title)}
                </div>
                <div style="color:#6b7280; margin-top:4px; font-size:12px;">
                  ASIN: <a href="https://www.amazon.com/dp/${escapeHtml(c.asin)}" target="_blank" style="color:#007185; text-decoration:none; font-weight:900;">${escapeHtml(c.asin)}</a>
                  ${brand ? ` • Brand: <b>${escapeHtml(brand)}</b>` : ''}
                </div>
                <div style="margin-top:10px; display:grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap:10px;">
                  <div style="padding:10px 12px; border-radius:14px; background:#f9fafb; border:1px solid #eef2f7;">
                    <div style="font-size:11px; color:#6b7280; font-weight:900;">Price</div>
                    <div style="font-size:13px; color:#111827; font-weight:950; margin-top:4px;">${escapeHtml(priceStr)}</div>
                  </div>
                  <div style="padding:10px 12px; border-radius:14px; background:#f9fafb; border:1px solid #eef2f7;">
                    <div style="font-size:11px; color:#6b7280; font-weight:900;">BSR (top)</div>
                    <div style="font-size:13px; color:#111827; font-weight:950; margin-top:4px;">${escapeHtml(String(bsrTop))}</div>
                  </div>
                  <div style="padding:10px 12px; border-radius:14px; background:#f9fafb; border:1px solid #eef2f7;">
                    <div style="font-size:11px; color:#6b7280; font-weight:900;">Sellers</div>
                    <div style="font-size:13px; color:#111827; font-weight:950; margin-top:4px;">${escapeHtml(sellers !== '' && sellers != null ? String(sellers) : 'N/A')}</div>
                  </div>
                  <div style="padding:10px 12px; border-radius:14px; background:#f9fafb; border:1px solid #eef2f7;">
                    <div style="font-size:11px; color:#6b7280; font-weight:900;">Sales est (high)</div>
                    <div style="font-size:13px; color:#111827; font-weight:950; margin-top:4px;">${escapeHtml(salesHigh !== '' ? fmtNum(salesHigh) : 'N/A')}</div>
                  </div>
                  <div style="padding:10px 12px; border-radius:14px; background:#f9fafb; border:1px solid #eef2f7;">
                    <div style="font-size:11px; color:#6b7280; font-weight:900;">Revenue est (high)</div>
                    <div style="font-size:13px; color:#111827; font-weight:950; margin-top:4px;">${escapeHtml(revHigh !== '' ? fmtNum(revHigh) : 'N/A')}</div>
                  </div>
                  <div style="padding:10px 12px; border-radius:14px; background:#f9fafb; border:1px solid #eef2f7;">
                    <div style="font-size:11px; color:#6b7280; font-weight:900;">Rating</div>
                    <div style="font-size:13px; color:#111827; font-weight:950; margin-top:4px;">${escapeHtml(rating !== '' ? String(rating) : 'N/A')} ${reviews !== '' ? `(${escapeHtml(String(reviews))})` : ''}</div>
                  </div>
                </div>

                <div style="margin-top:10px; color:#6b7280; font-size:12px;">
                  Title match: <b>${(c.sim * 100).toFixed(0)}%</b> • Price match: <b>${(c.priceScore * 100).toFixed(0)}%</b>
                </div>
                ${c.url ? `<div style="margin-top:10px;"><a href="${escapeHtml(c.url)}" target="_blank" style="color:#007185; text-decoration:none; font-weight:900;">Open Product Details API</a></div>` : ''}
              </div>
            </div>
            ${err}
          </div>
          <div style="min-width:110px; text-align:right;">
            <div style="font-size:12px; color:#555;">Score</div>
            <div style="font-size:18px; font-weight:900; color:#0f766e;">${escapeHtml(scorePct)}</div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div style="height:100vh; display:flex; flex-direction:column;">
      ${topBarHtml || ''}
      <div style="flex:1; min-height:0; overflow:auto; background:#f3f4f6; padding:16px;">
        <div style="max-width:980px; margin:0 auto;">
          <div style="margin-top:14px;">
            <div style="display:flex; align-items:flex-end; justify-content:space-between; gap:12px; margin-bottom:10px;">
              <div>
                <div style="font-weight:900; font-size:16px; color:#232f3e;">Competitors</div>
                <div style="color:#555; margin-top:4px; font-size:12px;">
                  Relative to: <b>${escapeHtml(originalTitle || originalAsin)}</b>
                  ${originalPrice != null ? ` • Price: <b>${origPriceStr}</b>` : ''}
                </div>
              </div>
              <div style="font-size:12px; color:#6b7280;">
                ${competitors.length} competitor${competitors.length !== 1 ? 's' : ''}
              </div>
            </div>
            ${cards || '<div style="padding:20px; text-align:center; color:#6b7280;">No competitors found</div>'}
          </div>
        </div>
      </div>
    </div>
  `;
}

