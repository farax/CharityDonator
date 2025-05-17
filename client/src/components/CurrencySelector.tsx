import { useEffect } from 'react';
import { useDonation } from '@/components/DonationContext';
import { useCurrency } from '@/hooks/useCurrency';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { trackEvent } from '@/lib/analytics';

// Map of currency codes to their symbols
export const currencySymbols: Record<string, string> = {
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

// Map of currency codes to their regions for URL parameters
export const currencyRegions: Record<string, string> = {
  USD: 'us',
  EUR: 'eu',
  GBP: 'uk',
  JPY: 'jp',
  CAD: 'ca',
  AUD: 'au',
  CHF: 'ch',
  CNY: 'cn',
  HKD: 'hk',
  INR: 'in',
  PKR: 'pk',
  SAR: 'sa',
  AED: 'ae',
  MYR: 'my',
  SGD: 'sg',
  ZAR: 'za'
};

export default function CurrencySelector() {
  // Get donation context values and setters
  const { 
    currency, 
    setCurrency, 
    setCurrencySymbol, 
    setExchangeRate,
    availableCurrencies
  } = useDonation();
  
  // Get geo-detected currency
  const { 
    currency: detectedCurrency, 
    currencySymbol: detectedSymbol,
    exchangeRate: detectedRate,
    currencyData
  } = useCurrency();
  
  // Synchronize detected currency with donation context
  useEffect(() => {
    if (detectedCurrency && currencyData?.source) {
      console.log(`Setting currency from ${currencyData.source}: ${detectedCurrency} (${detectedSymbol})`);
                  
      setCurrency(detectedCurrency);
      setCurrencySymbol(detectedSymbol);
      setExchangeRate(detectedRate);
    }
  }, [detectedCurrency, detectedSymbol, detectedRate, currencyData, setCurrency, setCurrencySymbol, setExchangeRate]);

  // Handle manual currency selection from dropdown
  const handleCurrencyChange = (value: string) => {
    // Track the change
    trackEvent({
      category: 'Donation',
      action: 'CurrencyChange',
      label: value,
      attributes: {
        previousCurrency: currency,
        newCurrency: value
      }
    });
    
    // Update URL parameter to trigger the currency detection hook
    const region = currencyRegions[value] || value.toLowerCase();
    const url = new URL(window.location.href);
    url.searchParams.set('region', region);
    window.history.replaceState({}, '', url.toString());
    
    // The currency will be updated via the useCurrency hook and URL parameter detection
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