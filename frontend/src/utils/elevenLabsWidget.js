// ============================================================================
// ELEVENLABS CONVAI WIDGET SETUP
// ============================================================================
// 
// CHANGE THESE VALUES FOR YOUR SITE:
// ============================================================================

// REQUIRED: Replace with your ElevenLabs agent ID
const AGENT_ID = 'agent_3001kehxwqnzfwr9wc1mgkan1tn6';

// OPTIONAL: Change navigation behavior
const OPEN_IN_NEW_TAB = false; // true = new tab, false = same tab (React SPA uses same tab)

// OPTIONAL: Change widget position
const WIDGET_POSITION = 'bottom-right'; // 'bottom-right', 'bottom-left', 'top-right', 'top-left'

// OPTIONAL: Base URL for navigation (leave empty for auto-detection)
const BASE_URL = ''; // e.g., 'https://mysite.framer.app' or 'https://mysite.wixsite.com/mysite'

// ============================================================================
// DON'T CHANGE ANYTHING BELOW THIS LINE
// ============================================================================

// Create and inject the widget with client tools
function injectElevenLabsWidget() {
  const ID = 'elevenlabs-convai-widget';
  
  // Check if the widget is already loaded
  if (document.getElementById(ID)) {
    console.log('[ElevenLabs] Widget already loaded, skipping injection');
    return;
  }

  console.log('[ElevenLabs] Starting widget injection process');

  // Create widget script
  const script = document.createElement('script');
  script.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed';
  script.async = true;
  script.type = 'text/javascript';
  script.onload = () => {
    console.log('[ElevenLabs] Widget embed script loaded successfully');
  };
  script.onerror = (err) => {
    console.error('[ElevenLabs] Failed to load widget embed script:', err);
  };
  document.head.appendChild(script);
  console.log('[ElevenLabs] Widget script injection initiated');

  // Create wrapper and widget
  const wrapper = document.createElement('div');
  wrapper.className = `convai-widget ${WIDGET_POSITION}`;

  const widget = document.createElement('elevenlabs-convai');
  widget.id = ID;
  widget.setAttribute('agent-id', AGENT_ID);
  widget.setAttribute('variant', 'full');
  console.log('[ElevenLabs] Widget element created with agent ID:', AGENT_ID);

  // Listen for the widget's "call" event to inject client tools
  widget.addEventListener('elevenlabs-convai:call', (event) => {
    console.log('[ElevenLabs] Widget call event received');
    event.detail.config.clientTools = {
      redirectToExternalURL: ({ url }) => {
        console.log('redirectToExternalURL called with url:', url);
        
        // Build full URL - handles any base URL
        let fullUrl = url;
        if (!url.startsWith('http')) {
          // Use custom base URL if provided, otherwise auto-detect
          const baseUrl = BASE_URL || window.location.origin;
          fullUrl = `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
        }
        
        console.log('Navigating to:', fullUrl);
        
        // Navigate based on config
        if (OPEN_IN_NEW_TAB) {
          window.open(fullUrl, '_blank', 'noopener,noreferrer');
        } else {
          window.location.href = fullUrl;
        }
      },
    };
  });

  // Add widget styles
  const style = document.createElement('style');
  style.textContent = `
    .convai-widget {
      position: fixed;
      z-index: 9999;
      visibility: visible !important;
      opacity: 1 !important;
      display: block !important;
    }
    .convai-widget.bottom-right {
      bottom: 20px;
      right: 20px;
    }
    .convai-widget.bottom-left {
      bottom: 20px;
      left: 20px;
    }
    .convai-widget.top-right {
      top: 20px;
      right: 20px;
    }
    .convai-widget.top-left {
      top: 20px;
      left: 20px;
    }
    elevenlabs-convai {
      width: 100% !important;
      height: 100% !important;
    }
  `;
  document.head.appendChild(style);

  // Attach widget to the DOM
  wrapper.appendChild(widget);
  document.body.appendChild(wrapper);
  console.log('[ElevenLabs] Widget successfully injected into DOM');
}

// Export function to initialize widget
export function initElevenLabsWidget() {
  console.log('[ElevenLabs] Module loaded. Current DOM state:', document.readyState);
  if (document.readyState === 'loading') {
    console.log('[ElevenLabs] DOM still loading, waiting for DOMContentLoaded');
    document.addEventListener('DOMContentLoaded', injectElevenLabsWidget);
  } else {
    console.log('[ElevenLabs] DOM already loaded, injecting widget immediately');
    injectElevenLabsWidget();
  }
}
