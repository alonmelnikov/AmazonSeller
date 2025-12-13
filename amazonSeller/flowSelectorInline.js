// flowSelectorInline.js - Inline script handlers moved here to comply with CSP
console.log('[FlowSelectorInline] Script starting...');

// Wait for DOM
function setupClicks() {
  console.log('[FlowSelectorInline] Setting up clicks...');
  const btn1 = document.getElementById('flow1');
  const btn2 = document.getElementById('flow2');
  const status = document.getElementById('statusDisplay');
  
  console.log('[FlowSelectorInline] Buttons found:', { btn1: !!btn1, btn2: !!btn2, status: !!status });
  
  if (btn1) {
    btn1.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('[FlowSelectorInline] FLOW 1 CLICKED!!! (inline handler)');
      if (window.selectFlow) {
        if (status) {
          status.style.display = 'block';
          status.style.visibility = 'visible';
          status.textContent = '✅ BUTTON CLICKED!\n\nFlow 1 button was clicked successfully.\n\n🔍 Now searching for ASIN...\n\nPlease wait...';
          status.className = 'success';
          status.style.background = 'rgba(255, 255, 255, 0.95)';
          status.style.color = '#333';
        }
        window.selectFlow(1).catch(err => {
          console.error('[FlowSelectorInline] Error in selectFlow:', err);
          if (status) {
            status.textContent = '❌ ERROR: ' + err.message;
            status.className = 'error';
          }
        });
      } else {
        if (status) {
          status.style.display = 'block';
          status.textContent = '❌ ERROR: selectFlow not available yet. Please wait for module to load.';
          status.className = 'error';
        }
        console.error('[FlowSelectorInline] selectFlow not available');
      }
    };
    console.log('[FlowSelectorInline] Flow1 onclick set');
  }
  
  if (btn2) {
    btn2.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('[FlowSelectorInline] FLOW 2 CLICKED!!! (inline handler)');
      if (window.selectFlow) {
        if (status) {
          status.style.display = 'block';
          status.style.visibility = 'visible';
          status.textContent = '✅ BUTTON CLICKED!\n\nFlow 2 button was clicked successfully.\n\n🔍 Now searching for ASIN...\n\nPlease wait...';
          status.className = 'success';
          status.style.background = 'rgba(255, 255, 255, 0.95)';
          status.style.color = '#333';
        }
        window.selectFlow(2).catch(err => {
          console.error('[FlowSelectorInline] Error in selectFlow:', err);
          if (status) {
            status.textContent = '❌ ERROR: ' + err.message;
            status.className = 'error';
          }
        });
      } else {
        if (status) {
          status.style.display = 'block';
          status.textContent = '❌ ERROR: selectFlow not available yet. Please wait for module to load.';
          status.className = 'error';
        }
        console.error('[FlowSelectorInline] selectFlow not available');
      }
    };
    console.log('[FlowSelectorInline] Flow2 onclick set');
  }
  
  // Also add mousedown for extra feedback
  if (btn1) {
    btn1.onmousedown = function() {
      console.log('[FlowSelectorInline] Flow1 mousedown');
      btn1.style.transform = 'scale(0.9)';
    };
    btn1.onmouseup = function() {
      btn1.style.transform = 'scale(1)';
    };
  }
  
  if (btn2) {
    btn2.onmousedown = function() {
      console.log('[FlowSelectorInline] Flow2 mousedown');
      btn2.style.transform = 'scale(0.9)';
    };
    btn2.onmouseup = function() {
      btn2.style.transform = 'scale(1)';
    };
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupClicks);
} else {
  setupClicks();
}

// Also try immediately
setTimeout(setupClicks, 100);
setTimeout(setupClicks, 500);
setTimeout(setupClicks, 1000);

console.log('[FlowSelectorInline] Setup complete');

// Check for module errors
window.addEventListener('error', (e) => {
  console.error('[FlowSelectorInline] Global error:', e);
  const statusDisplay = document.getElementById('statusDisplay');
  if (statusDisplay) {
    statusDisplay.textContent = 'Error: ' + e.message;
    statusDisplay.style.display = 'block';
    statusDisplay.className = 'error';
  }
});

