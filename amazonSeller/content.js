// content.js - מנגנון חכם לשליפת ASIN, כותרת, מחיר ועוד, עם לוגים לדיבאג

console.log("[JS DEBUG] content.js loaded!");

function getASINFromURL() {
  // URL דוגמת https://www.amazon.com/dp/B012345678/
  const match = window.location.pathname.match(/\/dp\/([A-Z0-9]{10})(?:[/?]|$)/i);
  if (match) return match[1];
  // URL דוגמת https://www.amazon.com/gp/product/B012345678/
  const match2 = window.location.pathname.match(/\/product\/([A-Z0-9]{10})(?:[/?]|$)/i);
  if (match2) return match2[1];
  // ניסוי נוסף: חיפוש ב-id של הדף
  const asinInput = document.getElementById("ASIN");
  if (asinInput && asinInput.value) return asinInput.value.trim();
  // נסה לחפש באלמנטים נפוצים
  const el = document.querySelector('[data-asin]');
  if (el && el.getAttribute('data-asin')) return el.getAttribute('data-asin');
  return null;
}

function getTitle() {
  // מוצא את הכותרת של המוצר
  const h1 = document.getElementById("productTitle");
  if (h1) return h1.textContent.trim();
  // גרסה כללית
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) return ogTitle.content.trim();
  return document.title.trim();
}

function getPrice() {
  // נסה למצוא מחיר מהדף
  let price = null;
  const selectors = [
    "#priceblock_ourprice",
    "#priceblock_dealprice",
    "#priceblock_saleprice",
    '[data-a-color="price"] .a-offscreen',
    ".a-price .a-offscreen"
  ];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) {
      price = el.textContent.replace(/[^\d.,]/g, '');
      break;
    }
  }
  // הוצאת מספר בלבד
  if (price) {
    price = price.replace(/,/g, '').replace(/^\$/, '');
    const num = parseFloat(price);
    if (!isNaN(num)) return num;
  }
  return null;
}

function getRating() {
  const el = document.querySelector('[data-asin][data-avg-rating]');
  if (el && el.getAttribute('data-avg-rating')) {
    return parseFloat(el.getAttribute('data-avg-rating'));
  }
  // נסה למצוא בקלאסיק
  const el2 = document.querySelector('.a-icon-star span.a-icon-alt');
  if (el2) {
    const m = el2.textContent.match(/([\d.]+)/);
    if (m) return parseFloat(m[1]);
  }
  return null;
}

function getReviews() {
  // מספר הביקורות
  const el = document.getElementById("acrCustomerReviewText");
  if (el) {
    const m = el.textContent.replace(/,/g,'').match(/(\d+)/);
    if (m) return parseInt(m[1], 10);
  }
  return null;
}

function getDimensions() {
  const labels = ["Product Dimensions", "Dimensions", "Package Dimensions"];
  for (const label of labels) {
    let row = Array.from(document.querySelectorAll("#productDetails_techSpec_section_1 tr, #prodDetails tr, .a-section .a-spacing-small"))
      .find(tr => tr.textContent.includes(label));
    if (row) {
      const text = row.textContent.split(label)[1] || row.textContent;
      const m = text.match(/\d+(\.\d+)?\s*x\s*\d+(\.\d+)?\s*x\s*\d+(\.\d+)?/i);
      if (m) return m[0].replace(/\s/g,"");
    }
  }
  return null;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "scrapeProductInfo") {
    const asin = getASINFromURL();
    const title = getTitle();
    const price = getPrice();
    const rating = getRating();
    const reviews = getReviews();
    const dimensions = getDimensions();

    console.log("[JS DEBUG] content.js got message scrapeProductInfo", {asin, title, price, rating, reviews, dimensions});

    sendResponse({
      asin,
      title,
      price,
      rating,
      reviews,
      dimensions
    });
  }
});