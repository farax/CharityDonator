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

  // Fetch user's currency based on IP
  const { data: currencyData } = useQuery<CurrencyByIp>({
    queryKey: ['/api/currency-by-ip'],
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });

  // Fetch exchange rates
  const { data: exchangeRates } = useQuery<ExchangeRates>({
    queryKey: ['/api/exchange-rates'],
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  useEffect(() => {
    if (currencyData?.currency) {
      setCurrency(currencyData.currency);
      setCurrencySymbol(currencySymbols[currencyData.currency] || currencyData.currency);
    }
  }, [currencyData]);

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
