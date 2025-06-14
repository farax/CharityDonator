// Donation preset amounts for different currencies
// Based on culturally appropriate values for each region

// Define preset tiers structure
export interface CurrencyPresets {
  tier1: number;
  tier2: number;
  tier3: number;
}

// Map ISO currency codes to preset donation amounts
export const donationPresets: Record<string, CurrencyPresets> = {
  // Default currency and English-speaking regions
  AUD: { tier1: 5, tier2: 50, tier3: 100 },
  USD: { tier1: 4, tier2: 40, tier3: 80 },
  CAD: { tier1: 5, tier2: 50, tier3: 100 },
  NZD: { tier1: 5, tier2: 50, tier3: 100 },
  
  // European currencies
  EUR: { tier1: 3, tier2: 30, tier3: 60 },
  GBP: { tier1: 3, tier2: 25, tier3: 50 },
  CHF: { tier1: 20, tier2: 200, tier3: 400 },
  NOK: { tier1: 30, tier2: 300, tier3: 600 },
  SEK: { tier1: 30, tier2: 300, tier3: 600 },
  DKK: { tier1: 30, tier2: 300, tier3: 600 },
  ISK: { tier1: 20, tier2: 200, tier3: 400 },
  
  // Asian currencies
  SGD: { tier1: 5, tier2: 40, tier3: 80 },
  INR: { tier1: 100, tier2: 1000, tier3: 2000 },
  IDR: { tier1: 10000, tier2: 100000, tier3: 200000 },
  PHP: { tier1: 100, tier2: 500, tier3: 1000 },
  BDT: { tier1: 200, tier2: 1000, tier3: 2000 },
  PKR: { tier1: 500, tier2: 2500, tier3: 5000 },
  LKR: { tier1: 500, tier2: 2500, tier3: 5000 },
  CNY: { tier1: 20, tier2: 100, tier3: 200 },
  JPY: { tier1: 500, tier2: 3000, tier3: 6000 },
  THB: { tier1: 100, tier2: 500, tier3: 1000 },
  MYR: { tier1: 10, tier2: 50, tier3: 100 },
  
  // African currencies
  ZAR: { tier1: 50, tier2: 300, tier3: 600 },
  NGN: { tier1: 1000, tier2: 5000, tier3: 10000 },
  KES: { tier1: 500, tier2: 1000, tier3: 2000 },
  
  // South American currencies
  BRL: { tier1: 10, tier2: 50, tier3: 100 },
};

// Fallback presets for currencies not specifically defined
const fallbackPresets: CurrencyPresets = { tier1: 5, tier2: 50, tier3: 100 };

/**
 * Get preset donation amounts for a specific currency
 * @param currency ISO currency code
 * @returns Object with tier1, tier2, and tier3 preset amounts
 */
export function getPresetsForCurrency(currency: string): CurrencyPresets {
  return donationPresets[currency] || fallbackPresets;
}