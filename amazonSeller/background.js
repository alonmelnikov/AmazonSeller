// background.js
// זיכרון זמני לשמירת תוצאות API לפי ASIN
let cachedData = {};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getCache") {
    sendResponse(cachedData[request.key] || null);
  }

  if (request.action === "setCache") {
    cachedData[request.key] = request.data;
    sendResponse({ success: true });
  }

  return true;
});
