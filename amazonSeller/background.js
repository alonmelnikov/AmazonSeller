// background.js
// זיכרון זמני לשמירת תוצאות API לפי ASIN
let cachedData = {};
let flowSelectorWindowId = null;

// Handle extension icon click - open window at 3/4 screen size
chrome.action.onClicked.addListener(async () => {
  // Check if window already exists
  if (flowSelectorWindowId) {
    try {
      await chrome.windows.get(flowSelectorWindowId);
      // Window exists, focus it
      chrome.windows.update(flowSelectorWindowId, { focused: true });
      return;
    } catch (e) {
      // Window doesn't exist anymore, reset ID
      flowSelectorWindowId = null;
    }
  }
  
  // Get current window to estimate screen size
  try {
    const currentWindow = await chrome.windows.getCurrent();
    // Estimate screen size (Chrome windows API doesn't give screen size directly)
    // Use a reasonable default (3/4 of 1920x1080) or calculate from current window
    const estimatedScreenWidth = currentWindow.width ? Math.max(currentWindow.width * 1.33, 1440) : 1440;
    const estimatedScreenHeight = currentWindow.height ? Math.max(currentWindow.height * 1.33, 810) : 810;
    
    // Calculate 3/4 of estimated screen size
    const width = Math.floor(estimatedScreenWidth * 0.75);
    const height = Math.floor(estimatedScreenHeight * 0.75);
    
    // Center the window (approximate)
    const left = Math.floor((estimatedScreenWidth - width) / 2);
    const top = Math.floor((estimatedScreenHeight - height) / 2);
    
    // Create new window
    chrome.windows.create({
      url: chrome.runtime.getURL('flowSelector.html'),
      type: 'popup',
      width: width,
      height: height,
      left: left,
      top: top,
      focused: true
    }, (window) => {
      flowSelectorWindowId = window.id;
    });
  } catch (error) {
    // Fallback: use fixed size (3/4 of 1920x1080)
    chrome.windows.create({
      url: chrome.runtime.getURL('flowSelector.html'),
      type: 'popup',
      width: 1440,
      height: 810,
      focused: true
    }, (window) => {
      flowSelectorWindowId = window.id;
    });
  }
});

// Clean up when window is closed
chrome.windows.onRemoved.addListener((removedWindowId) => {
  if (removedWindowId === flowSelectorWindowId) {
    flowSelectorWindowId = null;
  }
});

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
