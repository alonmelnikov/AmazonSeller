/**
 * CardBase.js
 * Shared card rendering helpers for the Flow Selector dashboard.
 */

export function escapeHtml(value) {
  const s = value === null || value === undefined ? '' : String(value);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function iconSvg(name, color = '#111827') {
  const common = `width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${escapeHtml(color)}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`;
  if (name === 'tag') return `<svg ${common}><path d="M20.59 13.41 12 22 2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z"/><path d="M7 7h.01"/></svg>`;
  if (name === 'dollar') return `<svg ${common}><path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6"/></svg>`;
  if (name === 'star') return `<svg ${common}><polygon points="12 2 15 9 22 9 16.5 13.5 18.5 21 12 16.8 5.5 21 7.5 13.5 2 9 9 9 12 2"/></svg>`;
  if (name === 'users') return `<svg ${common}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
  if (name === 'list') return `<svg ${common}><path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/></svg>`;
  if (name === 'target') return `<svg ${common}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`;
  return `<svg ${common}><circle cx="12" cy="12" r="10"/></svg>`;
}

export function renderInfoRow({ icon, label, value }) {
  return `
    <div style="display:flex; align-items:center; gap:8px; padding:10px 12px; background:#f9fafb; border:1px solid #eef2f7; border-radius:14px; min-width:0; box-sizing:border-box;">
      <div style="display:flex; align-items:center; justify-content:center; width:28px; height:28px; border-radius:12px; background:#fff; border:1px solid #eef2f7; flex:0 0 auto;">
        ${icon}
      </div>
      <div style="min-width:0;">
        <div style="font-size:11px; color:#6b7280; font-weight:900; letter-spacing:0.2px;">${escapeHtml(label)}</div>
        <div style="font-size:12px; color:#111827; font-weight:950; margin-top:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(value)}</div>
      </div>
    </div>
  `;
}

export function renderCard({ id, header, bodyHtml }) {
  return `
    <button data-action="${escapeHtml(id)}" style="
      text-align:left;
      border:1px solid #e5e7eb;
      background:#fff;
      border-radius:22px;
      padding:22px;
      cursor:pointer;
      width:100%;
      max-width:100%;
      box-sizing:border-box;
      overflow:hidden;
      box-shadow:0 14px 34px rgba(0,0,0,0.10);
    ">
      ${header}
      ${bodyHtml}
    </button>
  `;
}


