// content.js - מנגנון חכם לשליפת ASIN, כותרת, מחיר ועוד, עם לוגים לדיבאג

console.log("[JS DEBUG] content.js loaded!");

// Extract ASIN from URL
function extractASIN(url) {
  if (!url) return null;

  try {
    const u = new URL(url);

    // 1) Look for /dp/ASIN
    let match = u.pathname.match(/\/dp\/([A-Z0-9]{10})(?:[/?]|$)/i);
    if (match) {
      const asin = match[1].toUpperCase();
      console.log("[JS DEBUG] ✅ Found ASIN via /dp/ pattern:", asin);
      return asin;
    }

    // 2) Look for /gp/product/ASIN
    match = u.pathname.match(/\/product\/([A-Z0-9]{10})(?:[/?]|$)/i);
    if (match) {
      const asin = match[1].toUpperCase();
      console.log("[JS DEBUG] ✅ Found ASIN via /product/ pattern:", asin);
      return asin;
    }

    // 3) Look for "asin=" in query string
    match = u.search.match(/asin=([A-Z0-9]{10})/i);
    if (match) {
      const asin = match[1].toUpperCase();
      console.log("[JS DEBUG] ✅ Found ASIN via query param (asin=):", asin);
      return asin;
    }

    // 4) Look for data-asin inside URL fragments
    match = url.match(/([A-Z0-9]{10})(?=[/?&]|$)/i);
    if (match) {
      const asin = match[1].toUpperCase();
      // Validate it's likely an ASIN (starts with B, A, or 0-9)
      if (/^[BA0-9]/.test(asin)) {
        console.log("[JS DEBUG] ✅ Found ASIN via fallback pattern:", asin);
        return asin;
      }
    }

  } catch (e) {
    console.error("[JS DEBUG] Invalid URL:", e);
    return null;
  }

  return null;
}

function getASINFromURL() {
  console.log("[JS DEBUG] getASINFromURL - pathname:", window.location.pathname);
  console.log("[JS DEBUG] getASINFromURL - full URL:", window.location.href);
  
  // Use the extractASIN function
  const asin = extractASIN(window.location.href);
  
  if (asin) {
    return asin;
  }
  
  // Fallback: try decoded URL
  try {
    const decodedUrl = decodeURIComponent(window.location.href);
    const decodedAsin = extractASIN(decodedUrl);
    if (decodedAsin) {
      return decodedAsin;
    }
  } catch (e) {
    console.warn("[JS DEBUG] Could not decode URL:", e);
  }
  
  // Additional fallbacks: try page elements
  // Try data-asin attributes
  const dataAsinEl = document.querySelector('[data-asin]');
  if (dataAsinEl) {
    const asin = dataAsinEl.getAttribute('data-asin');
    if (asin && /^[A-Z0-9]{10}$/i.test(asin)) {
      console.log("[JS DEBUG] ✅ Found ASIN via data-asin attribute:", asin.toUpperCase());
      return asin.toUpperCase();
    }
  }
  
  // Try meta tags
  const metaAsin = document.querySelector('meta[name="ASIN"], meta[property="ASIN"]');
  if (metaAsin) {
    const asin = metaAsin.content || metaAsin.getAttribute('content');
    if (asin && /^[A-Z0-9]{10}$/i.test(asin)) {
      console.log("[JS DEBUG] ✅ Found ASIN via meta tag:", asin.toUpperCase());
      return asin.toUpperCase();
    }
  }
  
  // Try canonical URL
  const canonicalLink = document.querySelector('link[rel="canonical"]');
  if (canonicalLink) {
    const canonicalAsin = extractASIN(canonicalLink.href);
    if (canonicalAsin) {
      console.log("[JS DEBUG] ✅ Found ASIN via canonical URL:", canonicalAsin);
      return canonicalAsin;
    }
  }
  
  console.error("[JS DEBUG] ❌ Could not extract ASIN from URL");
  console.error("[JS DEBUG] Pathname:", window.location.pathname);
  console.error("[JS DEBUG] Full URL:", window.location.href);
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

    // Validate ASIN before sending
    if (asin) {
      if (!/^[A-Z0-9]{10}$/.test(asin)) {
        console.error("[JS DEBUG] ❌ Invalid ASIN format:", asin);
      } else {
        console.log("[JS DEBUG] ✅ Valid ASIN extracted:", asin);
      }
    } else {
      console.error("[JS DEBUG] ❌ No ASIN found on page");
    }

    console.log("[JS DEBUG] content.js got message scrapeProductInfo", {asin, title, price, rating, reviews, dimensions});

    sendResponse({
      asin,
      title,
      price,
      rating,
      reviews,
      dimensions
    });
    
    // Return true to indicate we will send a response asynchronously
    return true;
  }
});