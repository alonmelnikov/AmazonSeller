// ROI Calculator – חישוב לפי הטבלה ששלחת (image 3)

// ברירת מחדל
const DEFAULTS = {
  marketingPct: 25,
  refundsPct: 5,
  inspectionFee: 150,
  alibabaCost: null, // יחושב לפי sellPrice אם לא הוזן
  shipPerKg: 1.25,
  shipCustom: 0,
  couponsPct: 0,
  couponsRedeemedPct: 0,
  fulfillFee: 0,
  storageFee: 0
};

function formatCurrency(n) {
  n = Number(n) || 0;
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function formatPercent(n) {
  n = Number(n) || 0;
  return n.toFixed(1) + '%';
}
function setStatus(message, success = true) {
  const bar = document.getElementById('statusMessage');
  bar.textContent = message;
  bar.style.color = success ? 'green' : 'red';
  bar.style.display = 'block';
}
function getVal(id, fallback = 0) {
  const v = document.getElementById(id)?.value;
  return v === '' || v === undefined ? fallback : parseFloat(v);
}

// טען ברירות מחדל
document.addEventListener('DOMContentLoaded', () => {
  const html = id => document.getElementById(id);

  // שלב 1: קבע ברירת מחדל בכל שדה
  Object.entries(DEFAULTS).forEach(([key, def]) => {
    if (html(key)) html(key).value = def ?? '';
  });
  // שדות מיוחדים שאין להם דיפולט ב-DEFAULTS
  if (html('price1')) html('price1').value = '';
  if (html('weight')) html('weight').value = '';
  if (html('monthlySales')) html('monthlySales').value = '';
  if (html('alibabaCost')) html('alibabaCost').value = '';
  
  // הפעל חישוב אוטומטי בכל שינוי
  document.querySelectorAll('input').forEach(inp => inp.addEventListener('input', manualRecalc));
  
  // חישוב ראשוני
  manualRecalc();
});

function manualRecalc() {
  const html = id => document.getElementById(id);

  // קריאת נתונים מהשדות
  const sellPrice = getVal('price1', 0);           // מחיר מכירה ליחידה
  const weight = getVal('weight', 0);              // משקל ליחידה
  const monthlySales = getVal('monthlySales', 0);  // מכירות חודשיות

  // חישוב units (חודש אחד כפול 5 = 5 חודשים)
  const units = monthlySales * 5;

  // עלויות
  const marketingPct = getVal('marketingPct', DEFAULTS.marketingPct);
  const refundsPct = getVal('refundsPct', DEFAULTS.refundsPct);
  const inspectionFee = getVal('inspectionFee', DEFAULTS.inspectionFee);
  let alibabaCost = getVal('alibabaCost');
  if (isNaN(alibabaCost) || alibabaCost === 0) alibabaCost = sellPrice * 0.2;

  const shipPerKg = getVal('shipPerKg', DEFAULTS.shipPerKg);
  const shipCustom = getVal('shipCustom', DEFAULTS.shipCustom);

  // Referral Fee: 15% מהמחיר ליחידה
  const referral = sellPrice * 0.15;

  // Shipping ליחידה
  const shippingPerUnit = (shipPerKg * weight) + shipCustom;

  // Inspection לליחידה
  const inspectionPerUnit = units > 0 ? (inspectionFee / units) : 0;

  // עלות כניסה כוללת ליחידה (entryWith)
  const entryWith = alibabaCost + shippingPerUnit + referral + inspectionPerUnit;

  // רווח ליחידה
  const netIncome = sellPrice - entryWith;

  // ROI אחוז
  const roiPerc = entryWith ? (netIncome / entryWith) * 100 : 0;

  // הכנסות/הוצאות/רווח כולל
  const totalRevenue = sellPrice * units;
  const totalExpenses = entryWith * units;
  const totalProfit = totalRevenue - totalExpenses;

  // תוצאה מהירה
  html('fastResults').style.display = 'block';
  html('netIncome_val').textContent = formatCurrency(netIncome);
  html('roi_val').textContent = formatPercent(roiPerc);

  // כרטיסים
  html('netIncome_val_card').textContent = formatCurrency(totalProfit / (units || 1));
  html('roi_val_card').textContent = formatPercent(roiPerc);
  html('totrev_val_card').textContent = formatCurrency(totalRevenue);
  html('totexp_val_card').textContent = formatCurrency(totalExpenses);
  html('totprofit_val_card').textContent = formatCurrency(totalProfit);

  // טבלה
  html('qty_val').textContent = units.toLocaleString();
  html('cogs_val').textContent = formatCurrency(alibabaCost * units);
  html('supship_val').textContent = formatCurrency(shippingPerUnit * units);
  html('totrev_val').textContent = formatCurrency(totalRevenue);
  html('totexp_val').textContent = formatCurrency(totalExpenses);
  html('totprofit_val').textContent = formatCurrency(totalProfit);

  document.getElementById('cardView').style.display = 'flex';
  document.getElementById('tableView').style.display = 'none';

  setStatus('החישוב בוצע בהצלחה ✅', true);
}

function switchToCards() {
  document.getElementById('cardView').style.display = 'flex';
  document.getElementById('tableView').style.display = 'none';
}
function switchToTable() {
  document.getElementById('cardView').style.display = 'none';
  document.getElementById('tableView').style.display = 'block';
}

// זמינות גלובלית (לאירועים מ-HTML)
window.manualRecalc = manualRecalc;
window.switchToCards = switchToCards;
window.switchToTable = switchToTable;