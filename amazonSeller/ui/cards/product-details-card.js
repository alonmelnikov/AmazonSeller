/**
 * ProductDetailsCard.js
 * Dashboard card for the selected product.
 */

import { escapeHtml, iconSvg, renderInfoRow, renderCard } from './card-base.js';

export function renderProductDetailsCard({
  actionId = 'openProductDetails',
  title = '',
  imageUrl = '',
  brand = 'N/A',
  landedPrice = 'N/A',
  ratingText = 'N/A',
  salesHigh = 'N/A'
}) {
  const titleBlock = `
    <div style="display:flex; gap:14px; align-items:flex-start;">
      <div style="width:64px; height:64px; border-radius:16px; background:#f9fafb; border:1px solid #eef2f7; overflow:hidden; flex:0 0 auto; display:flex; align-items:center; justify-content:center;">
        ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" loading="lazy" referrerpolicy="no-referrer" style="width:100%; height:100%; object-fit:cover;" />` : `<div style="color:#6b7280; font-weight:950; font-size:11px;">No image</div>`}
      </div>
      <div style="min-width:0; flex:1;">
        <div style="
          font-weight:950;
          font-size:15px;
          color:#111827;
          letter-spacing:0.2px;
          line-height:1.25;
          display:-webkit-box;
          -webkit-line-clamp:2;
          -webkit-box-orient:vertical;
          overflow:hidden;
        ">${escapeHtml(title)}</div>
        <div style="margin-top:6px; font-size:12px; color:#6b7280; font-weight:800;">Product Details</div>
      </div>
    </div>
  `;

  const body = `
    <div style="margin-top:14px; display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
      ${renderInfoRow({ icon: iconSvg('tag', '#2563eb'), label: 'Brand', value: brand })}
      ${renderInfoRow({ icon: iconSvg('dollar', '#2563eb'), label: 'Landed price', value: landedPrice })}
      ${renderInfoRow({ icon: iconSvg('star', '#2563eb'), label: 'Rating', value: ratingText })}
      ${renderInfoRow({ icon: iconSvg('target', '#2563eb'), label: 'Sales est (high)', value: salesHigh })}
    </div>
  `;

  return renderCard({
    id: actionId,
    header: titleBlock,
    bodyHtml: body
  });
}


