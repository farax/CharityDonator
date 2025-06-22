import { useEffect } from 'react';

export default function TawkToChat() {
  useEffect(() => {
    // Get Tawk.to credentials from environment variables
    const propertyId = import.meta.env.VITE_TAWK_TO_PROPERTY_ID;
    const widgetId = import.meta.env.VITE_TAWK_TO_WIDGET_ID;
    
    // Only load Tawk.to if credentials are provided
    if (!propertyId || !widgetId) {
      console.warn('Tawk.to credentials not found. Please add VITE_TAWK_TO_PROPERTY_ID and VITE_TAWK_TO_WIDGET_ID to your environment variables.');
      return;
    }
    
    // Tawk.to Live Chat integration
    const tawkScript = document.createElement('script');
    tawkScript.async = true;
    tawkScript.src = `https://embed.tawk.to/${propertyId}/${widgetId}`;
    tawkScript.charset = 'UTF-8';
    tawkScript.setAttribute('crossorigin', '*');
    
    // Add the script to the document head
    document.head.appendChild(tawkScript);
    
    // Optional: Configure Tawk.to settings
    (window as any).Tawk_API = (window as any).Tawk_API || {};
    (window as any).Tawk_LoadStart = new Date();
    
    // Optional: Set visitor attributes for better context
    (window as any).Tawk_API.onLoad = function() {
      // You can set visitor attributes here
      (window as any).Tawk_API.setAttributes({
        'website': 'Aafiyaa Charity Clinics',
        'page': window.location.pathname
      }, function(error: any) {
        if (error) {
          console.error('Tawk.to attribute error:', error);
        }
      });
    };
    
    // Cleanup function
    return () => {
      // Remove the script when component unmounts
      const existingScript = document.querySelector('script[src*="embed.tawk.to"]');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  return null; // This component doesn't render anything visible
}