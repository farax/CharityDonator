import { useState, useEffect } from 'react';
import { useDonation } from '@/components/DonationContext';
import { useQuery } from '@tanstack/react-query';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { trackEvent } from '@/lib/analytics';

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
};

export default function CurrencySelector() {
  const { 
    currency, 
    setCurrency, 
    setCurrencySymbol, 
    setExchangeRate,
    availableCurrencies
  } = useDonation();

  // Define types for API responses
  interface ExchangeRateData {
    rates: Record<string, number>;
    base: string;
  }
  
  interface LocationCurrencyData {
    currency: string;
  }

  // Fetch exchange rates from API
  const { data: exchangeRates } = useQuery<ExchangeRateData>({
    queryKey: ['/api/exchange-rates'],
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  // Fetch user's default currency based on IP
  const { data: locationCurrency } = useQuery<LocationCurrencyData>({
    queryKey: ['/api/currency-by-ip'],
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });

  // Set default currency based on user's location
  useEffect(() => {
    if (locationCurrency?.currency) {
      setCurrency(locationCurrency.currency);
      setCurrencySymbol(currencySymbols[locationCurrency.currency] || locationCurrency.currency);
    }
  }, [locationCurrency, setCurrency, setCurrencySymbol]);

  // Update exchange rate when currency changes
  useEffect(() => {
    if (exchangeRates?.rates && currency !== 'USD') {
      setExchangeRate(exchangeRates.rates[currency] || 1);
    } else {
      setExchangeRate(1);
    }
  }, [exchangeRates, currency, setExchangeRate]);

  const handleCurrencyChange = (value: string) => {
    const previousCurrency = currency;
    
    // Track currency change
    trackEvent({
      category: 'Donation',
      action: 'CurrencyChange',
      label: value,
      attributes: {
        previousCurrency,
        newCurrency: value,
        exchangeRate: exchangeRates?.rates?.[value] || 1
      }
    });
    
    setCurrency(value);
    setCurrencySymbol(currencySymbols[value] || value);
  };

  return (
    <div className="w-full max-w-[150px]">
      <Select value={currency} onValueChange={handleCurrencyChange}>
        <SelectTrigger>
          <SelectValue placeholder="Currency" />
        </SelectTrigger>
        <SelectContent>
          {availableCurrencies.map((curr) => (
            <SelectItem key={curr} value={curr}>
              {currencySymbols[curr] || curr} {curr}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}