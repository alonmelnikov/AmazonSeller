/**
 * KeywordsCard.js
 * Dashboard card for ASIN keywords preview.
 */

import { escapeHtml, renderCard } from './card-base.js';

function rowsPreview(words) {
  const rows = (words || []).filter(Boolean).slice(0, 3);
  const finalRows = rows.length ? rows : ['N/A'];
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
        <div style="
          max-width:92%;
          padding:10px 14px;
          border-radius:999px;
          background:#f5f3ff;
          border:1px solid #ede9fe;
          color:#2e1065;
          font-weight:950;
          font-size:13px;
          text-align:center;
          line-height:1.2;
          word-break:break-word;
          overflow-wrap:anywhere;
          white-space:normal;
        ">${escapeHtml(String(w))}</div>
      `).join('')}
    </div>
  `;
}

export function renderKeywordsCard({
  actionId = 'openKeywords',
  count = 0,
  previewWords = []
}) {
  const header = `
    <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px;">
      <div>
        <div style="font-weight:950; font-size:15px; color:#111827; letter-spacing:0.2px;">ASIN Keywords</div>
        <div style="margin-top:6px; font-size:12px; color:#6b7280; font-weight:900;">${escapeHtml(String(count))} keywords</div>
      </div>
    </div>
  `;

  const body = rowsPreview(previewWords);

  return renderCard({
    id: actionId,
    header,
    bodyHtml: body
  });
}


