// New Relic browser agent utilities for tracking user actions
// This assumes the New Relic Browser script has been added to the HTML

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
  // Only track events if New Relic is available
  if (typeof window !== 'undefined' && (window as any).newrelic) {
    const nr = (window as any).newrelic;
    
    // Format event name
    const eventName = `${category}:${action}`;
    
    // Clean up attributes to ensure they are valid for New Relic
    const cleanAttributes: EventAttributes = {};
    
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
    
    // Track the event with New Relic
    nr.addPageAction(eventName, cleanAttributes);
    
    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Analytics Event:', eventName, cleanAttributes);
    }
  }
}

/**
 * Track page view
 */
export function trackPageView(path?: string): void {
  if (typeof window !== 'undefined' && (window as any).newrelic) {
    const nr = (window as any).newrelic;
    const currentPath = path || window.location.pathname;
    
    // Set the page name in New Relic
    nr.setPageViewName(currentPath);
    
    // Add custom attributes for the page view
    nr.setCustomAttribute('routePath', currentPath);
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Page View:', currentPath);
    }
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
 */
export function initNewRelicBrowserAgent(accountId: string, licenseKey: string, applicationId: string): void {
  if (typeof window !== 'undefined' && !document.getElementById('newrelic-browser-agent')) {
    // Create a new script element for the full New Relic Browser agent
    const script = document.createElement('script');
    script.id = 'newrelic-browser-agent';
    script.type = 'text/javascript';
    script.src = `https://js-agent.newrelic.com/nr-spa-1.237.0.min.js`;
    script.async = true;
    
    // Setup the initialization configuration with TypeScript type assertions
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
      agentID: applicationId,
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
    
    // Add debugging to verify data is being sent
    const origNoticeError = (window as any).NREUM.noticeError || function() {};
    (window as any).NREUM.noticeError = function(err: Error) {
      console.log('New Relic tracking error:', err);
      return origNoticeError.apply(this, arguments);
    };
    
    // Append the script to the document head
    document.head.appendChild(script);
    
    console.log("New Relic Browser Agent initialized with", { accountId, applicationId });
    
    // Create a test event to verify the connection
    setTimeout(() => {
      if ((window as any).newrelic) {
        (window as any).newrelic.addPageAction('test_event', { 
          timestamp: new Date().toISOString(),
          environment: 'replit-webview'
        });
        console.log("Test event sent to New Relic");
      }
    }, 3000);
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
    
    // Get New Relic license key and account ID from environment variables
    const licenseKey = import.meta.env.VITE_NEW_RELIC_BROWSER_LICENSE_KEY;
    const accountId = import.meta.env.VITE_NEW_RELIC_ACCOUNT_ID;
    const applicationId = import.meta.env.VITE_NEW_RELIC_APPLICATION_ID;
    
    // Initialize New Relic if credentials are available
    if (licenseKey && accountId && applicationId) {
      initNewRelicBrowserAgent(accountId as string, licenseKey as string, applicationId as string);
    }
  }
}