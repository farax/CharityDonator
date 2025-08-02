// New Relic browser agent utilities for tracking user actions
// This assumes the New Relic Browser script has been added to the HTML
import { isProduction } from "./utils";

type EventAttributes = Record<string, string | number | boolean>;

interface AnalyticsEvent {
  category: string;
  action: string;
  label?: string;
  value?: number;
  attributes?: Record<string, any>;
}

/**
 * Track a user interaction event
 */
export function trackEvent({
  category,
  action,
  label,
  value,
  attributes = {},
}: AnalyticsEvent): void {
  if (typeof window === 'undefined') return;
  
  // Format event name
  const eventName = `${category}:${action}`;
  
  // Clean up attributes to ensure they are valid for New Relic
  const cleanAttributes: EventAttributes = {};
  
  // Add timestamp to all events
  cleanAttributes.timestamp = new Date().toISOString();
  
  // Filter attributes that are non-null and have valid types
  Object.keys(attributes).forEach((key) => {
    const value = attributes[key];
    if (value !== null && value !== undefined) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        cleanAttributes[key] = value;
      } else {
        try {
          // Try to convert objects to JSON strings
          cleanAttributes[key] = JSON.stringify(value);
        } catch (e) {
          // Skip attributes that can't be converted
        }
      }
    }
  });
  
  // Add label and value if provided
  if (label) {
    cleanAttributes.label = label;
  }
  
  if (typeof value === 'number') {
    cleanAttributes.value = value;
  }
  
  // Always log to console for debugging
  console.log('Analytics Event:', eventName, cleanAttributes);
  
  // Try to send to New Relic - don't hide errors, but also don't let them break the app
  try {
    if ((window as any).newrelic && typeof (window as any).newrelic.addPageAction === 'function') {
      console.log('Sending to New Relic:', eventName);
      (window as any).newrelic.addPageAction(eventName, cleanAttributes);
      console.log('Successfully sent to New Relic');
    } else {
      console.warn('New Relic API not available for tracking');
    }
  } catch (error) {
    console.error('Error sending to New Relic:', error);
  }
  
  // Show event tracking notifications only in non-production mode
  if (!isProduction()) {
    const notificationDiv = document.createElement('div');
    notificationDiv.style.position = 'fixed';
    notificationDiv.style.bottom = '10px';
    notificationDiv.style.right = '10px';
    notificationDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    notificationDiv.style.color = 'white';
    notificationDiv.style.padding = '10px';
    notificationDiv.style.borderRadius = '5px';
    notificationDiv.style.zIndex = '9999';
    notificationDiv.style.maxWidth = '300px';
    notificationDiv.style.fontSize = '12px';
    notificationDiv.innerHTML = `<strong>Event Tracked:</strong><br/>${category}:${action}${label ? `<br/>${label}` : ''}`;
    
    document.body.appendChild(notificationDiv);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
      if (document.body.contains(notificationDiv)) {
        document.body.removeChild(notificationDiv);
      }
    }, 3000);
  }
}

/**
 * Track page view
 */
export function trackPageView(path?: string): void {
  if (typeof window === 'undefined') return;
  
  const currentPath = path || window.location.pathname;
  
  // Always log to console for debugging
  console.log('Page View:', currentPath);
  
  // Try to send to New Relic - will show errors if it fails
  try {
    if ((window as any).newrelic && typeof (window as any).newrelic.setPageViewName === 'function') {
      console.log('Sending page view to New Relic:', currentPath);
      
      // Set the page name in New Relic
      (window as any).newrelic.setPageViewName(currentPath);
      
      // Add custom attributes for the page view
      if (typeof (window as any).newrelic.setCustomAttribute === 'function') {
        (window as any).newrelic.setCustomAttribute('routePath', currentPath);
        (window as any).newrelic.setCustomAttribute('timestamp', new Date().toISOString());
      }
      
      console.log('Successfully sent page view to New Relic');
    } else {
      console.warn('New Relic API not available for page view tracking');
    }
  } catch (error) {
    console.error('Error sending page view to New Relic:', error);
  }
  
  // Show page view notifications only in non-production mode
  if (!isProduction()) {
    const notificationDiv = document.createElement('div');
    notificationDiv.style.position = 'fixed';
    notificationDiv.style.bottom = '10px';
    notificationDiv.style.left = '10px';
    notificationDiv.style.backgroundColor = 'rgba(0, 100, 0, 0.7)';
    notificationDiv.style.color = 'white';
    notificationDiv.style.padding = '10px';
    notificationDiv.style.borderRadius = '5px';
    notificationDiv.style.zIndex = '9999';
    notificationDiv.style.maxWidth = '300px';
    notificationDiv.style.fontSize = '12px';
    notificationDiv.innerHTML = `<strong>Page View Tracked:</strong><br/>${currentPath}`;
    
    document.body.appendChild(notificationDiv);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
      if (document.body.contains(notificationDiv)) {
        document.body.removeChild(notificationDiv);
      }
    }, 3000);
  }
}

/**
 * Track time spent on page when the user navigates away
 */
export function trackTimeOnPage(): (() => void) {
  const startTime = Date.now();
  
  return () => {
    const timeSpent = Math.floor((Date.now() - startTime) / 1000); // Time in seconds
    
    trackEvent({
      category: 'page',
      action: 'time-on-page',
      value: timeSpent,
      attributes: {
        path: window.location.pathname,
        timeSpentSeconds: timeSpent
      }
    });
  };
}

/**
 * Track button click
 */
export function trackButtonClick(buttonName: string, additionalAttributes?: EventAttributes): void {
  trackEvent({
    category: 'ui',
    action: 'button-click',
    label: buttonName,
    attributes: additionalAttributes
  });
}

/**
 * Track form submission
 */
export function trackFormSubmission(formName: string, additionalAttributes?: EventAttributes): void {
  trackEvent({
    category: 'form',
    action: 'submit',
    label: formName,
    attributes: additionalAttributes
  });
}

/**
 * Track donation action
 */
export function trackDonation(
  action: 'initiated' | 'completed' | 'failed',
  amount: number,
  currency: string,
  donationType: string,
  paymentMethod: string,
  additionalAttributes?: EventAttributes
): void {
  trackEvent({
    category: 'donation',
    action,
    value: amount,
    attributes: {
      amount,
      currency,
      donationType,
      paymentMethod,
      ...additionalAttributes
    }
  });
}

/**
 * Add New Relic browser monitoring script to head
 * Call this function once when the application loads
 * 
 * This uses the recommended New Relic snippet approach which is more reliable
 * than loading the SPA agent directly
 */
export function initNewRelicBrowserAgent(accountId: string, licenseKey: string, applicationId: string): void {
  if (typeof window !== 'undefined' && !document.getElementById('newrelic-browser-agent')) {
    // Use the official New Relic approach with the current browser agent script
    (function(w: any, d: any, t: any, r: any, u: any) {
      let f: any, n: any;
      w[u] = w[u] || function() {
        (w[u].q = w[u].q || []).push(arguments);
      };
      f = function() {
        const s = d.createElement(t) as HTMLScriptElement;
        s.id = 'newrelic-browser-agent';
        s.async = true;
        s.src = r;
        const x = d.getElementsByTagName(t)[0];
        if (x && x.parentNode) {
          x.parentNode.insertBefore(s, x);
        }
      };
      
      if (d.readyState === 'complete') {
        f();
      } else {
        n = function() {
          if (d.readyState === 'complete') {
            f();
          }
        };
        if ((w as any).attachEvent) {
          (w as any).attachEvent('onload', n);
        } else {
          w.addEventListener('load', n, false);
        }
      }
    })(
      window,
      document,
      'script',
      'https://js-agent.newrelic.com/nr-spa-1.242.0.min.js',
      'newrelic'
    );
    
    // Initialize the agent with configuration
    const nr = (window as any).newrelic || {};
    nr('setApplicationVersion', '1.0.0');
    nr('setErrorHandler', (err: Error) => {
      console.log('New Relic tracking error:', err);
      return true; // Allow normal error processing to continue
    });
    
    // Configure the New Relic agent
    (window as any).NREUM = (window as any).NREUM || {};
    (window as any).NREUM.init = {
      distributed_tracing: {enabled: true},
      privacy: {cookies_enabled: true},
      ajax: {deny_list: ["bam.nr-data.net"]},
      session_trace: {enabled: true},
      session_replay: {enabled: false}
    };
    
    (window as any).NREUM.loader_config = {
      accountID: accountId,
      trustKey: accountId,
      agentID: "browser",
      licenseKey: licenseKey,
      applicationID: applicationId
    };

    (window as any).NREUM.info = {
      beacon: "bam.nr-data.net",
      errorBeacon: "bam.nr-data.net",
      licenseKey: licenseKey,
      applicationID: applicationId,
      sa: 1
    };
    
    console.log("New Relic Browser Agent initialized with", { 
      accountId, 
      licenseKey: licenseKey.substring(0, 8) + "...", // Show just the prefix for security
      applicationId 
    });
    
    // Create a retry mechanism to check for New Relic initialization
    let initAttempts = 0;
    const maxAttempts = 5;
    const checkNewRelicInitialization = () => {
      initAttempts++;
      console.log(`Checking New Relic initialization (attempt ${initAttempts}/${maxAttempts})...`);
      
      if ((window as any).newrelic) {
        // Check available methods
        const availableMethods = Object.keys((window as any).newrelic).filter(key => 
          typeof (window as any).newrelic[key] === 'function'
        );
        
        console.log(`New Relic object available with ${availableMethods.length} methods:`, 
          availableMethods.slice(0, 5).join(', ') + (availableMethods.length > 5 ? '...' : '')
        );
        
        if (availableMethods.includes('addPageAction')) {
          try {
            (window as any).newrelic.addPageAction('test_event', { 
              timestamp: new Date().toISOString(),
              environment: 'replit-webview',
              attempt: initAttempts
            });
            console.log("✅ Test event sent to New Relic successfully");
            
            // Set global flag to indicate New Relic is ready
            (window as any).newRelicReady = true;
            console.log("🎉 New Relic initialized and ready to use!");
            
            return; // Success - stop retrying
          } catch (err) {
            console.error("Failed to send test event to New Relic:", err);
          }
        } else {
          console.warn("New Relic addPageAction method not available yet");
        }
      } else {
        console.warn("New Relic object not available yet");
      }
      
      // Retry with exponential backoff if not exceeded max attempts
      if (initAttempts < maxAttempts) {
        const delay = Math.min(1000 * Math.pow(2, initAttempts), 30000); // exponential backoff with 30s max
        console.log(`Retrying in ${delay/1000} seconds...`);
        setTimeout(checkNewRelicInitialization, delay);
      } else {
        console.warn(`New Relic failed to initialize properly after ${maxAttempts} attempts. Analytics may be limited.`);
      }
    };
    
    // Start checking after initial delay
    setTimeout(checkNewRelicInitialization, 3000);
    
    // Add a global testing function that can be called from the browser console
    (window as any).testNewRelic = () => {
      console.log("Testing New Relic connection...");
      if ((window as any).newrelic) {
        console.log("New Relic object is available in window");
        try {
          console.log("Available New Relic methods:", Object.keys((window as any).newrelic));
          
          if (typeof (window as any).newrelic.addPageAction === 'function') {
            (window as any).newrelic.addPageAction('manual_test_event', { 
              timestamp: new Date().toISOString(),
              source: 'console_test'
            });
            console.log("Manual test event sent to New Relic");
            return true;
          } else {
            console.error("New Relic addPageAction method not available");
          }
        } catch (err) {
          console.error("Error testing New Relic:", err);
        }
      } else {
        console.error("New Relic object not found in window");
      }
      return false;
    };
  }
}

/**
 * Initialize analytics
 * Call this function once when the application loads
 */
export function initAnalytics(): void {
  // Listen for page navigation events
  if (typeof window === 'undefined') return;

  // Track initial page view
  trackPageView();
}