import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

interface ExchangeRates {
  rates: Record<string, number>;
  base: string;
}

interface CurrencyByIp {
  currency: string;
}

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
  // Add more currency symbols as needed
};

export function useCurrency() {
  const [currency, setCurrency] = useState('USD');
  const [currencySymbol, setCurrencySymbol] = useState('$');
  const [exchangeRate, setExchangeRate] = useState(1);

  // Fetch user's currency based on IP with no cache
  const { data: currencyData } = useQuery<CurrencyByIp>({
    queryKey: ['/api/currency-by-ip'],
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

  // Set currency and symbol immediately when data is available
  useEffect(() => {
    if (currencyData?.currency) {
      console.log("Setting currency to:", currencyData.currency);
      setCurrency(currencyData.currency);
      setCurrencySymbol(currencySymbols[currencyData.currency] || currencyData.currency);
    }
  }, [currencyData]);

  // Update exchange rate when currency changes
  useEffect(() => {
    if (exchangeRates?.rates && currency !== 'USD') {
      setExchangeRate(exchangeRates.rates[currency] || 1);
    } else {
      setExchangeRate(1);
    }
  }, [exchangeRates, currency]);

  return { 
    currency, 
    currencySymbol, 
    exchangeRate,
    convertAmount: (amount: number) => (amount * exchangeRate).toFixed(2)
  };
}
