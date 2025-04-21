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
  
  // Track the event with New Relic if available
  if ((window as any).newrelic) {
    try {
      console.log('Sending to New Relic:', eventName);
      (window as any).newrelic.addPageAction(eventName, cleanAttributes);
      console.log('Successfully sent to New Relic');
    } catch (error) {
      console.error('Error sending to New Relic:', error);
    }
  } else {
    console.warn('New Relic not available for tracking');
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
  
  // Track with New Relic if available
  if ((window as any).newrelic) {
    try {
      console.log('Sending page view to New Relic:', currentPath);
      const nr = (window as any).newrelic;
      
      // Set the page name in New Relic
      nr.setPageViewName(currentPath);
      
      // Add custom attributes for the page view
      nr.setCustomAttribute('routePath', currentPath);
      nr.setCustomAttribute('timestamp', new Date().toISOString());
      
      console.log('Successfully sent page view to New Relic');
    } catch (error) {
      console.error('Error sending page view to New Relic:', error);
    }
  } else {
    console.warn('New Relic not available for tracking page view');
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
    (function(w,d,t,r,u) {
      var f, n, i;
      w[u] = w[u] || function() {
        (w[u].q = w[u].q || []).push(arguments)
      };
      f = function() {
        var s = d.createElement(t);
        s.id = 'newrelic-browser-agent';
        s.async = true;
        s.src = r;
        var x = d.getElementsByTagName(t)[0];
        x.parentNode.insertBefore(s, x);
      };
      
      if (d.readyState === 'complete') {
        f();
      } else {
        n = function() {
          if (d.readyState === 'complete') {
            f();
          }
        };
        if (w.attachEvent) {
          w.attachEvent('onload', n);
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
    
    // Create a test event to verify the connection after a short delay
    setTimeout(() => {
      if ((window as any).newrelic && typeof (window as any).newrelic.addPageAction === 'function') {
        try {
          (window as any).newrelic.addPageAction('test_event', { 
            timestamp: new Date().toISOString(),
            environment: 'replit-webview'
          });
          console.log("Test event sent to New Relic");
        } catch (err) {
          console.error("Failed to send test event to New Relic:", err);
        }
      } else {
        console.warn("New Relic agent not fully loaded after initialization");
      }
    }, 5000); // Wait longer for full initialization
    
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
  if (typeof window !== 'undefined') {
    // Track initial page view
    trackPageView();
    
    // Get environment variables
    let rawLicenseKey = import.meta.env.VITE_NEW_RELIC_BROWSER_LICENSE_KEY as string;
    let rawAccountId = import.meta.env.VITE_NEW_RELIC_ACCOUNT_ID as string;
    let rawApplicationId = import.meta.env.VITE_NEW_RELIC_APPLICATION_ID as string;

    // Determine the correct values based on patterns rather than environment variable names
    // License key starts with NRJS-
    // Account ID is a shorter numeric string
    // Application ID is a longer numeric string
    
    // Initialize with the expected correct values
    let licenseKey = "";
    let accountId = "";
    let applicationId = "";
    
    // Check each value and categorize it correctly
    [rawLicenseKey, rawAccountId, rawApplicationId].forEach(value => {
      if (value && value.startsWith("NRJS-")) {
        licenseKey = value;
      } else if (value && /^\d+$/.test(value)) {
        if (value.length < 8) {
          accountId = value;
        } else {
          applicationId = value;
        }
      }
    });

    // If we're still missing values, set defaults based on what we know works
    if (!licenseKey) licenseKey = "NRJS-6e0e2334541eacee14e";
    if (!accountId) accountId = "6619298";
    if (!applicationId) applicationId = "1103406659";
    
    // Log what we're using (for debugging)
    console.log("New Relic configuration (corrected):", {
      accountId,
      applicationId,
      licenseKey: licenseKey.substring(0, 8) + "..."
    });
    
    // Initialize New Relic with the corrected parameters
    initNewRelicBrowserAgent(accountId, licenseKey, applicationId);
  }
}