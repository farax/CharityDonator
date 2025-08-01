import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { donationPresets, getPresetsForCurrency } from '@/lib/donationPresets';

interface ExchangeRates {
  rates: Record<string, number>;
  base: string;
}

interface CurrencyByIp {
  currency: string;
  source?: string;
}

// Expanded list of currency symbols
const currencySymbols: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  INR: '₹',
  AUD: 'A$',
  CAD: 'C$',
  CHF: 'CHF',
  CNY: '¥',
  HKD: 'HK$',
  PKR: '₨',
  SAR: '﷼',
  AED: 'د.إ',
  MYR: 'RM',
  SGD: 'S$',
  ZAR: 'R',
  // Add more currency symbols as needed
};

// Helper to get URL parameters
const getUrlParam = (param: string): string | null => {
  if (typeof window === 'undefined') return null;
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
};

export function useCurrency() {
  const [currency, setCurrency] = useState('AUD'); // Default to AUD
  const [currencySymbol, setCurrencySymbol] = useState('A$');
  const [exchangeRate, setExchangeRate] = useState(1);
  const [baseCurrency, setBaseCurrency] = useState('AUD'); // Our base currency is AUD
  const [location] = useLocation();

  // Check for URL parameter to override detected currency
  const regionParam = getUrlParam('region'); 

  // Fetch user's currency based on IP or URL param with no cache
  const { data: currencyData, refetch: refetchCurrency } = useQuery<CurrencyByIp>({
    queryKey: ['/api/currency-by-ip', regionParam], // Include region param in query key to refetch when it changes
    queryFn: async () => {
      // Construct URL with region parameter if present
      const url = regionParam 
        ? `/api/currency-by-ip?region=${regionParam}` 
        : '/api/currency-by-ip';
      
      const response = await fetch(url);
      return response.json();
    },
    staleTime: 0, // Don't cache to always get fresh location data
    retry: 3, // Retry 3 times if the request fails
    refetchOnMount: true, // Ensure we always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window gets focus
  });

  // Fetch exchange rates - still cache these as they don't change often
  const { data: exchangeRates } = useQuery<ExchangeRates>({
    queryKey: ['/api/exchange-rates'],
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  // Refetch currency when location/URL changes
  useEffect(() => {
    // Always refetch when location changes as we might have a different region param
    refetchCurrency();
    console.log("Location changed, refetching currency with region:", regionParam);
  }, [location, regionParam, refetchCurrency]);

  // Set currency and symbol immediately when data is available
  useEffect(() => {
    if (currencyData?.currency) {
      console.log("Setting currency to:", currencyData.currency, "Source:", currencyData.source);
      setCurrency(currencyData.currency);
      setCurrencySymbol(currencySymbols[currencyData.currency] || currencyData.currency);
    }
  }, [currencyData]);

  // Update exchange rate when currency or exchange rates change
  useEffect(() => {
    if (exchangeRates?.rates) {
      if (currency === baseCurrency) {
        setExchangeRate(1); // No conversion needed
      } else {
        // Calculate cross rate: from AUD → USD → target currency
        const audToUsd = 1 / (exchangeRates.rates['AUD'] || 1);
        const usdToTarget = exchangeRates.rates[currency] || 1;
        setExchangeRate(audToUsd * usdToTarget);
      }
    }
  }, [exchangeRates, currency, baseCurrency]);

  // Format amount with proper currency formatting (no conversion)
  const formatAmount = useCallback((amount: number, convert = true) => {
    // We're no longer doing mathematical conversion - just formatting
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  }, [currency]);

  // Get preset amount for the current currency based on tier
  const getPresetAmount = useCallback((tier: 'tier1' | 'tier2' | 'tier3'): number => {
    const presets = getPresetsForCurrency(currency);
    return presets[tier];
  }, [currency]);
  
  // This is maintained for backward compatibility but shouldn't be used
  // with the new preset system
  const convertAmount = useCallback((amount: number): number => {
    return parseFloat((amount * exchangeRate).toFixed(2));
  }, [exchangeRate]);

  return { 
    currency, 
    currencySymbol, 
    exchangeRate,
    convertAmount,
    formatAmount,
    getPresetAmount,
    baseCurrency,
    currencyData
  };
}
