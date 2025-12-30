/**
 * CompetitorsCard.js
 * Dashboard card for competitor preview.
 */

import { escapeHtml, renderCard } from './card-base.js';

function rowsPreview(items) {
  const rows = (items || []).filter(Boolean).slice(0, 3);
  const finalRows = rows.length ? rows : [{ asin: 'N/A', title: '' }];
  return `
    <div style="
      margin-top:12px;
      display:flex;
      flex-direction:column;
      gap:10px;
      align-items:center;
      justify-content:center;
      padding:10px 6px;
      width:100%;
      box-sizing:border-box;
    ">
      ${finalRows.map(w => `
        <div
          ${w?.asin && w.asin !== 'N/A' ? `data-action="openCompetitorDetails:${escapeHtml(String(w.asin))}"` : ''}
          style="
          max-width:92%;
          padding:10px 14px;
          border-radius:999px;
          background:#ecfeff;
          border:1px solid #cffafe;
          color:#0f172a;
          font-weight:950;
          font-size:12px;
          text-align:center;
          line-height:1.2;
          word-break:break-word;
          overflow-wrap:anywhere;
          white-space:normal;
          cursor:${w?.asin && w.asin !== 'N/A' ? 'pointer' : 'default'};
        ">
          <div style="font-weight:950;">${escapeHtml(w.asin || String(w))}</div>
          ${w.title ? `<div style="margin-top:4px; font-weight:800; color:#155e75;">${escapeHtml(w.title)}</div>` : ''}
        </div>
      `).join('')}
    </div>
  `;
}

function thumbsRow(urls) {
  const pics = (urls || []).filter(Boolean).slice(0, 3);
  if (!pics.length) return '';
  return `
    <div style="display:flex; gap:10px; margin-top:12px; align-items:center;">
      ${pics.map(u => `
        <div style="width:44px; height:44px; border-radius:14px; overflow:hidden; background:#f9fafb; border:1px solid #eef2f7; flex:0 0 auto;">
          <img src="${escapeHtml(u)}" style="width:100%; height:100%; object-fit:cover;" />
        </div>
      `).join('')}
    </div>
  `;
}

export function renderCompetitorsCard({
  actionId = 'openCompetitors',
  count = 0,
  previewItems = [],
  previewImageUrls = []
}) {
  const header = `
    <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px;">
      <div>
        <div style="font-weight:950; font-size:15px; color:#111827; letter-spacing:0.2px;">Competitors</div>
        <div style="margin-top:6px; font-size:12px; color:#6b7280; font-weight:900;">${escapeHtml(String(count))} selected</div>
      </div>
    </div>
  `;

  const body = `
    ${thumbsRow(previewImageUrls)}
    ${rowsPreview(previewItems)}
  `;

  return renderCard({
    id: actionId,
    header,
    bodyHtml: body
  });
}


