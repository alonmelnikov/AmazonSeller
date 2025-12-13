// popup.js - גרסה מלאה ועדכנית, כולל שמירה ל-storage לכל הטאבים (במיוחד ROI), ניהול טאבים, לוגים, קריאות API, ומטמון

document.addEventListener("DOMContentLoaded", () => {
  // ===== Utility =====
  const statusBar = document.getElementById("statusBar");
  const fmt = n => typeof n === "number" ? n.toLocaleString("en-US") : n || "N/A";
  const apiFieldMap = {
    "category": "category",
    "price": "price",
    "rating": "rating",
    "unitsSold": "approximate_30_day_units_sold",
    "dateAvailable": "date_first_available"
  };
  const updateStatus = (text, color = "#e2e3e5") => {
    if (statusBar) {
      statusBar.textContent = text;
      statusBar.style.background = color;
    }
  };
  const switchTab = i => {
    document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.id === "tab" + i));
    document.querySelectorAll(".tabs button").forEach(b => b.classList.toggle("active", b.id === "tabBtn" + i));
  };
  [0,1,2,3,4,5,6].forEach(i => {
    const btn = document.getElementById("tabBtn" + i);
    if (btn) btn.addEventListener("click", () => switchTab(i));
  });
  document.getElementById("refreshBtn")?.addEventListener("click", () =>
    chrome.storage.local.remove(["cache", "broadKeywordVolumeCache", "productData"], () => location.reload())
  );
  document.getElementById("expandBtn")?.addEventListener("click", () =>
    chrome.windows.create({
      url: chrome.runtime.getURL("full.html"),
      type: "popup",
      width: 1200,
      height: 900
    })
  );

  // ===== ASIN from content script =====
  function getASINFromContentScript(callback) {
    chrome.tabs.query({active: true, currentWindow: true}, tabs => {
      if (!tabs[0]?.id) {
        callback(null);
        return;
      }
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: "scrapeProductInfo" },
        res => {
          if (chrome.runtime.lastError || !res) {
            console.warn('[JS DEBUG] No content script found or not an Amazon page:', chrome.runtime.lastError);
            callback(null);
            return;
          }
          callback(res.asin || null, res);
        }
      );
    });
  }

  // ===== Price Tracker Chart =====
  function renderPriceTrackerSimple(asin, priceHistory) {
    const ctx = document.getElementById("priceChartSimple")?.getContext("2d");
    if (!ctx) return;
    const data = priceHistory[asin] || {};
    const labels = Object.keys(data).sort();
    const values = labels.map(d => data[d]);
    if (typeof Chart !== "undefined") {
      new Chart(ctx, {
        type: "line",
        data: { labels, datasets: [{ label: "Price", data: values, borderColor: "#007bff" }] }
      });
    }
  }

  // ===== broad keywords from title =====
  function extractBroadKeywords(title) {
    if (!title) return [];
    let clean = title.replace(/[^\w\s]/g, ' ').replace(/\d+/g, '').toLowerCase();
    let words = clean.split(/\s+/).filter(Boolean);
    const stopWords = ['the','and','for','with','of','by','to','in','on','a','an','is','at','as','not','or','but','be','are','from','set','pcs','pack','new'];
    words = words.filter(w => !stopWords.includes(w));
    // n-grams 2-4 words
    const ngrams = [];
    for (let n = 2; n <= 4; n++) {
      for (let i = 0; i <= words.length - n; i++) {
        const phrase = words.slice(i, i + n).join(' ');
        if (phrase.length > 4) ngrams.push(phrase);
      }
    }
    return Array.from(new Set(ngrams));
  }

  // ===== Search volume for broad keywords with cache + DEBUG LOGS =====
  async function getBroadKeywordsVolume(broadKeywords, headers) {
    if (!broadKeywords.length) return {};
    console.log("[JS DEBUG] getBroadKeywordsVolume: broadKeywords =", broadKeywords);

    return new Promise(resolve => {
      chrome.storage.local.get("broadKeywordVolumeCache", async cacheObj => {
        let cache = cacheObj.broadKeywordVolumeCache || {};
        const result = {};
        const toFetch = [];

        for (const kw of broadKeywords) {
          const low = kw.toLowerCase();
          if (cache[low] && typeof cache[low] === "number") {
            result[low] = cache[low];
          } else {
            toFetch.push(kw);
          }
        }

        console.log("[JS DEBUG] getBroadKeywordsVolume: toFetch (will be sent to API) =", toFetch);

        if (!toFetch.length) {
          console.log("[JS DEBUG] getBroadKeywordsVolume: All keywords from cache!", result);
          resolve(result);
          return;
        }

        // קריאה לשרת עבור כל המילים החסרות
        try {
          console.log("[JS DEBUG] Sending fetch to JungleScout API for broad keywords...", toFetch);
          const response = await fetch("https://developer.junglescout.com/api/keywords/search_volume_query?marketplace=us", {
            method: "POST",
            headers,
            body: JSON.stringify({
              data: {
                type: "search_volume_query",
                attributes: { keywords: toFetch }
              }
            })
          }).then(r => r.json());

          console.log("[JS DEBUG] API Response:", response);

          const apiResult = {};
          (response.data || []).forEach(item => {
            const kw = item.attributes.keyword.toLowerCase();
            const vol = item.attributes.search_volume || 0;
            apiResult[kw] = vol;
            cache[kw] = vol;
          });

          chrome.storage.local.set({ broadKeywordVolumeCache: cache });

          console.log("[JS DEBUG] getBroadKeywordsVolume: apiResult after parsing", apiResult);
          resolve({ ...result, ...apiResult });
        } catch (e) {
          console.error('[JS DEBUG] Failed to fetch search volume for broad keywords', e);
          resolve(result);
        }
      });
    });
  }

  // ===== Keywords Tab: API + broad =====
  async function fetchKeywordsAndMergeBroad(asin, productTitle, headers) {
    // 1. keywords from API
    const kwJ = await fetch("https://developer.junglescout.com/api/keywords/keywords_by_asin_query?marketplace=us", {
      method: "POST",
      headers,
      body: JSON.stringify({ data: { type: "keywords_by_asin_query", attributes: { asins: [asin] } } })
    }).then(r => r.json());
    let kwsApi = (kwJ.data || []).map(k => ({
      kw: k.attributes.name.toLowerCase(),
      v: k.attributes.monthly_search_volume_exact || 0,
      estSales: k.attributes.estimated_unit_sales_monthly || 0,
      source: "API"
    }));

    // 2. broad keywords from title
    const broadKeywords = extractBroadKeywords(productTitle);
    const apiKeywordSet = new Set(kwsApi.map(k=>k.kw));

    // Debug logs
    console.log("[JS DEBUG] API Keywords:", kwsApi);
    console.log("[JS DEBUG] Broad Keywords extracted from title:", broadKeywords);

    // 3. Send to server only what is not already in API
    const broadToQuery = broadKeywords.filter(kw => !apiKeywordSet.has(kw));
    let kwsBroad = [];
    if (broadToQuery.length) {
      console.log("[JS DEBUG] Calling getBroadKeywordsVolume for:", broadToQuery);
      const volumeMap = await getBroadKeywordsVolume(broadToQuery, headers);
      console.log("[JS DEBUG] volumeMap returned from server:", volumeMap);

      kwsBroad = broadToQuery.map(kw => ({
        kw,
        v: volumeMap[kw.toLowerCase()] || 0,
        estSales: 0,
        source: "Title"
      }));
    }

    const kwsAll = [...kwsApi, ...kwsBroad].sort((a, b) => b.v - a.v);

    // Final log
    console.log("[JS DEBUG] Final Keyword List (API+Title):", kwsAll);

    return kwsAll;
  }

  // ===== Render Keywords Tab =====
  function renderKeywordsTab(keywords) {
    return `
      <table>
        <thead>
          <tr>
            <th>Keyword</th>
            <th>Search Vol</th>
            <th>Est. Sales</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          ${keywords.map(k => `
            <tr>
              <td>${k.kw}</td>
              <td>${k.v > 0 ? k.v : '-'}</td>
              <td>${k.estSales > 0 ? k.estSales : '-'}</td>
              <td>${k.source}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  // ===== Overview Tab =====
  function loadOverviewTab(kws, p, asin, priceHistory, prods) {
    ["category","price","rating","unitsSold","dateAvailable"].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        const field = apiFieldMap[id];
        let val = p && p[field];
        if (id === "price" && val != null) val = `$${fmt(val)}`;
        else val = fmt(val);
        el.textContent = val;
      }
    });

    const top5 = kws.slice(0,5);
    const tbody = document.getElementById("overviewKeywords");
    if (tbody) {
      tbody.innerHTML = top5.map(k =>
        `<tr><td>${k.kw}</td><td>${fmt(k.v)}</td><td>${fmt(k.estSales)}</td></tr>`
      ).join("");
    }

    const nicheEl = document.getElementById("overviewNiche");
    if (nicheEl) nicheEl.innerHTML = renderNicheTab(prods);

    renderProductSalesPrice(p, priceHistory, "M");
  }

  function renderProductSalesPrice(p, priceHistory, period) {
    const tbl = document.getElementById("salesPriceTable");
    if (!tbl) return;
    const data = priceHistory[p.asin] || {};
    const now = Date.now(), day = 86400000;
    const cutoff = now - (period==="Y"?365:(period==="M"?30:7))*day;
    const rows = Object.entries(data)
      .filter(([d]) => new Date(d).getTime() >= cutoff)
      .map(([d,v]) => ({ date:d, price:v }));

    tbl.innerHTML = `<table><thead><tr><th>Date</th><th>Price</th></tr></thead><tbody>
      ${rows.map(r=>`<tr><td>${r.date}</td><td>${fmt(r.price)}</td></tr>`).join("")}
    </tbody></table>`;

    document.querySelectorAll(".product-periods .periodBtn")
      .forEach(b => {
        b.classList.toggle("active", b.dataset.period === period);
        b.addEventListener("click", () => renderProductSalesPrice(p, priceHistory, b.dataset.period));
      });
  }

  // ===== Niche Tab =====
  function renderNicheTab(prods) {
    const isAmazon = prod =>
      ((prod.brand||"").toLowerCase().includes("amazon") ||
       (prod.seller_name||"").toLowerCase().includes("amazon"));
    const amazonInNiche = prods.some(isAmazon);
    const chineseCount = prods.filter(p=>p.seller_country==="CN").length;
    const newSellers = prods.filter(p=>p.review_count<50);
    const oldSellers = prods.filter(p=>p.review_count>=50);
    const avg = arr => arr.length? arr.reduce((a,b)=>a+b,0)/arr.length : 0;

    return `<div class="card"><div class="card-header"><h3>📊 Niche Analysis</h3></div><ul>
      <li>Amazon in niche: <b style="color:${amazonInNiche?"green":"red"}">${amazonInNiche?"Yes":"No"}</b></li>
      <li>Chinese sellers: <b>${chineseCount}</b></li>
      <li>Avg price – new sellers: <b>$${fmt(avg(newSellers.map(p=>p.price)))}</b></li>
      <li>Avg price – veteran sellers: <b>$${fmt(avg(oldSellers.map(p=>p.price)))}</b></li>
      <li>Products >350 reviews: <b>${prods.filter(p=>p.review_count>350).length}</b></li>
      <li>Avg reviews per product: <b>${fmt(avg(prods.map(p=>p.review_count)))}</b></li>
      <li>Avg rating: <b>${fmt(avg(prods.map(p=>p.rating)))}</b></li>
    </ul></div>`;
  }

  // ===== Product Info =====
  function renderProductInfoCard(p, scrapeRes) {
    const getVal = (k, fallback) =>
      scrapeRes && scrapeRes[k] != null && scrapeRes[k] !== "N/A" ? scrapeRes[k] : fallback;

    const price = getVal('price', p.price);
    const rating = getVal('rating', p.rating);
    const reviews = getVal('reviews', p.reviews || p.review_count);
    const volWeight = (p.length_value && p.width_value && p.height_value)
      ? ((p.length_value * p.width_value * p.height_value) / 139).toFixed(2) : "N/A";
    const fba = p.fee_breakdown || {};
    const hasVariations = (p.variants && p.variants.length > 0) || (p.child_asins && p.child_asins.length > 0);
    const category = p.category || "N/A";
    const sellerCountry = p.seller_country || "N/A";
    const bsrRank = p.product_rank || p.bsr_rank || "N/A";
    const availableDate = p.date_first_available || "N/A";
    const dimensions = getVal("dimensions", (p.length_value && p.width_value && p.height_value)
      ? `${p.length_value}×${p.width_value}×${p.height_value}` : "N/A"
    );

    return `
    <div class="card">
      <div class="card-header"><h3>📦 Product Information</h3></div>
      <div class="product-metrics" style="display: flex; flex-wrap: wrap; gap: 20px;">
        <div style="flex: 1; min-width: 280px;">
          <ul style="list-style: none; padding: 0;">
            <li><strong>Brand:</strong> ${fmt(p.brand)}</li>
            <li><strong>Category:</strong> ${fmt(category)}</li>
            <li><strong>Price:</strong> $${fmt(price)}</li>
            <li><strong>Rating:</strong> ${fmt(rating)} / 5</li>
            <li><strong>Reviews:</strong> ${fmt(reviews)}</li>
            <li><strong>BSR Rank:</strong> ${fmt(bsrRank)}</li>
            <li><strong>Weight:</strong> ${fmt(p.weight_value)} lbs</li>
            <li><strong>Volumetric Weight:</strong> ${volWeight} lbs</li>
            <li><strong>Dimensions:</strong> ${Array.isArray(dimensions) ? dimensions.join("×") : fmt(dimensions)} in</li>
            <li><strong>Seller Country:</strong> ${fmt(sellerCountry)}</li>
            <li><strong>First Available:</strong> ${fmt(availableDate)}</li>
            <li><strong>Variations:</strong> ${hasVariations
              ? 'Yes <button id="showVariationsBtn">Show Variants</button>'
              : 'No'}</li>
          </ul>
          <ul id="variationList"
              style="display:none; padding-inline-start: 20px; font-size: 0.9em; margin-top: 10px;"></ul>
        </div>

        <div style="flex: 1; min-width: 280px;">
          <h4 style="margin-bottom: 5px;">Amazon Fees</h4>
          <ul style="list-style: none; padding: 0;">
            <li><strong>FBA Fee:</strong> $${fmt(fba.fba_fee)}</li>
            <li><strong>Referral Fee:</strong> $${fmt(fba.referral_fee)}</li>
            <li><strong>Variable Closing Fee:</strong> $${fmt(fba.variable_closing_fee)}</li>
            <li><strong>Total Fees:</strong> $${fmt(fba.total_fees)}</li>
          </ul>
        </div>
      </div>
    </div>
    ${hasVariations ? `<script>
      setTimeout(() => {
        const btn = document.getElementById("showVariationsBtn");
        const list = document.getElementById("variationList");
        btn?.addEventListener("click", () => {
          list.innerHTML = ${(JSON.stringify(p.variants || p.child_asins || [])).replace(/</g, '\\u003c')}.map(asin =>
            \`<li><a href="https://www.amazon.com/dp/\${asin}" target="_blank">\${asin}</a></li>\`
          ).join("");
          list.style.display = list.style.display === "none" ? "block" : "none";
        });
      }, 100);
    </script>` : ""}
    `;
  }

  // ===== MAIN: integrate all =====
  async function initWithASIN(asin, scrapeResFromContentScript = null) {
    if (!asin) {
      updateStatus("❌ No ASIN detected", "#f8d7da");
      return;
    }

    chrome.storage.local.get("cache", async stored => {
      if (stored.cache?.asin === asin) {
        if (stored.cache.keyHtml) document.getElementById("tab1Content").innerHTML = stored.cache.keyHtml;
        if (stored.cache.prodHtml) document.getElementById("tab2").innerHTML = stored.cache.prodHtml;
        if (stored.cache.priceChartHtml) document.getElementById("salesPriceTable").innerHTML = stored.cache.priceChartHtml;
        if (stored.cache.rawHtml) document.getElementById("tab4").innerHTML = stored.cache.rawHtml;
        if (stored.cache.nicheHtml) document.getElementById("overviewNiche").innerHTML = stored.cache.nicheHtml;
        loadOverviewTab(
          stored.cache.kws,
          stored.cache.productData,
          asin,
          stored.cache.priceHistory,
          stored.cache.prods
        );
        // שמירה ל-productData עבור מחשבון ROI
        chrome.storage.local.set({ productData: stored.cache.productData });
        updateStatus("⚡ Using cache", "#e2e3e5");
        return;
      }

      updateStatus("⏳ Loading data...", "#fff3cd");

      try {
        const headers = {
          Authorization: "tomer:414im1J_rdPyklZfbw21weCCzuKHDgdQxB--_QVB1qM",
          "X-API-Type": "junglescout",
          Accept: "application/vnd.junglescout.v1+json",
          "Content-Type": "application/vnd.api+json"
        };

        // fetch product database (to get title)
        const dbJ = await fetch("https://developer.junglescout.com/api/product_database_query?marketplace=us", {
          method: "POST",
          headers,
          body: JSON.stringify({ data: { type: "product_database_query", attributes: { include_keywords: [asin], min_price: 1 } } })
        }).then(r => r.json());
        const prods = (dbJ.data || []).map(d => d.attributes);
        const p = prods.find(x => x.asin?.toUpperCase() === asin.toUpperCase()) || prods[0] || {};
        const priceHistory = (await chrome.storage.local.get("priceHistory")).priceHistory || {};

        // get title
        const productTitle = p.title || (scrapeResFromContentScript && scrapeResFromContentScript.title) || "";

        // fetch keywords combined (API + broad incl. volume)
        const keywords = await fetchKeywordsAndMergeBroad(asin, productTitle, headers);

        // render keywords tab
        const keyHtml = renderKeywordsTab(keywords);
        document.getElementById("tab1Content").innerHTML = keyHtml;

        // Overview
        loadOverviewTab(keywords, p, asin, priceHistory, prods);

        // Product Info tab
        const prodHtml = renderProductInfoCard(p, scrapeResFromContentScript);
        document.getElementById("tab2").innerHTML = prodHtml;

        // Raw API tab
        const rawHtml = `<div class="card"><div class="card-header"><h3>Raw API</h3></div><pre style="overflow:auto; max-height:500px;">${JSON.stringify(p,null,2)}</pre></div>`;
        document.getElementById("tab4").innerHTML = rawHtml;

        // Niche tab
        const nicheHtml = renderNicheTab(prods);
        document.getElementById("overviewNiche").innerHTML = nicheHtml;

        // Chart (Price & Sales)
        renderPriceTrackerSimple(asin, priceHistory);

        // save cache
        chrome.storage.local.set({ cache: {
          asin,
          keyHtml, prodHtml,
          priceChartHtml: document.getElementById("salesPriceTable")?.innerHTML,
          rawHtml, nicheHtml,
          kws: keywords, productData: p,
          priceHistory, prods
        }});
        // שמור גם ל-productData עבור מחשבון ROI
        chrome.storage.local.set({ productData: p });

        updateStatus("✅ Data loaded", "#d4edda");

      } catch (err) {
        console.error(err);
        updateStatus("❌ Failed to load", "#f8d7da");
      }
    });
  }

  // ===== Startup =====
  // First check if ASIN was passed from flow selector
  chrome.storage.local.get(["flowASIN", "flowProductInfo"], (flowData) => {
    if (flowData.flowASIN) {
      // ASIN was passed from flow selector, use it
      const asin = flowData.flowASIN;
      const scrapeRes = flowData.flowProductInfo;
      // Clear the flow data after reading it
      chrome.storage.local.remove(["flowASIN", "flowProductInfo"], () => {
        chrome.storage.local.set({ asin }, () => {
          initWithASIN(asin, scrapeRes);
        });
      });
    } else {
      // No flow ASIN, try to get from content script
      getASINFromContentScript((asin, scrapeRes) => {
        if (asin) {
          chrome.storage.local.set({ asin }, () => {
            initWithASIN(asin, scrapeRes);
          });
        } else {
          updateStatus("❌ יש להפעיל את התוסף בדף מוצר באמזון (amazon.com)", "#f8d7da");
          chrome.storage.local.get("asin", res => {
            if (res.asin) {
              initWithASIN(res.asin, null);
            }
          });
        }
      });
    }
  });

  // ROI tab dynamic load (if needed)
  document.getElementById("tabBtn3")?.addEventListener("click", async () => {
    const tab = document.getElementById("tab3");
    if (!tab.dataset.loaded) {
      try {
        const htmlResp = await fetch(chrome.runtime.getURL("roi.html"));
        const html = await htmlResp.text();
        tab.innerHTML = html;

        const script = document.createElement("script");
        script.src = chrome.runtime.getURL("roi.js");
        script.onload = () => console.log("[JS DEBUG] ✅ ROI module loaded");
        document.body.appendChild(script);

        tab.dataset.loaded = "true";
      } catch (e) {
        console.error("[JS DEBUG] ❌ Failed to load ROI tab", e);
        tab.innerHTML = "<div class='card'><h3>🧮 ROI Calculator</h3><p>⚠️ Error loading ROI module.</p></div>";
      }
    }
  });

});