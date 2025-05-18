/**
 * Donation preset amounts by currency
 * 
 * This configuration defines culturally appropriate preset donation amounts
 * for different regions and currencies. When a user selects or is detected to be
 * in a specific region, these preset values will be used instead of direct currency conversion.
 * 
 * Format:
 * [currency code]: [tier1, tier2, tier3]
 * 
 * If a currency is not found, the system will fall back to AUD presets.
 */

export type PresetTiers = {
  tier1: number;
  tier2: number;
  tier3: number;
};

export const donationPresets: Record<string, PresetTiers> = {
  // Default / Australia
  AUD: { tier1: 5, tier2: 50, tier3: 100 },
  
  // North America
  USD: { tier1: 4, tier2: 40, tier3: 80 },
  CAD: { tier1: 5, tier2: 50, tier3: 100 },
  
  // Europe
  EUR: { tier1: 3, tier2: 30, tier3: 60 },
  GBP: { tier1: 3, tier2: 25, tier3: 50 },
  
  // Asia-Pacific
  NZD: { tier1: 5, tier2: 50, tier3: 100 },
  SGD: { tier1: 5, tier2: 40, tier3: 80 },
  JPY: { tier1: 500, tier2: 3000, tier3: 6000 },
  CNY: { tier1: 20, tier2: 100, tier3: 200 },
  
  // South Asia
  INR: { tier1: 100, tier2: 1000, tier3: 2000 },
  PKR: { tier1: 500, tier2: 2500, tier3: 5000 },
  BDT: { tier1: 200, tier2: 1000, tier3: 2000 },
  LKR: { tier1: 500, tier2: 2500, tier3: 5000 },
  
  // Southeast Asia
  IDR: { tier1: 10000, tier2: 100000, tier3: 200000 },
  PHP: { tier1: 100, tier2: 500, tier3: 1000 },
  THB: { tier1: 100, tier2: 500, tier3: 1000 },
  MYR: { tier1: 10, tier2: 50, tier3: 100 },
  
  // Africa
  ZAR: { tier1: 50, tier2: 300, tier3: 600 },
  NGN: { tier1: 1000, tier2: 5000, tier3: 10000 },
  KES: { tier1: 500, tier2: 1000, tier3: 2000 },
  
  // Latin America
  BRL: { tier1: 10, tier2: 50, tier3: 100 },
  
  // Scandinavia
  NOK: { tier1: 30, tier2: 300, tier3: 600 },
  SEK: { tier1: 30, tier2: 300, tier3: 600 },
  DKK: { tier1: 30, tier2: 300, tier3: 600 },
  
  // Other European countries
  CHF: { tier1: 20, tier2: 200, tier3: 400 },
  ISK: { tier1: 20, tier2: 200, tier3: 400 },
  
  // Euro-using countries (kept for potential future customization)
  // Currently using the same as EUR
};

// Map of region codes to currencies
export const regionToCurrency: Record<string, string> = {
  'us': 'USD',
  'ca': 'CAD',
  'eu': 'EUR',
  'uk': 'GBP',
  'au': 'AUD',
  'nz': 'NZD',
  'sg': 'SGD',
  'jp': 'JPY',
  'cn': 'CNY',
  'in': 'INR',
  'pk': 'PKR',
  'bd': 'BDT',
  'lk': 'LKR',
  'id': 'IDR',
  'ph': 'PHP',
  'th': 'THB',
  'my': 'MYR',
  'za': 'ZAR',
  'ng': 'NGN',
  'ke': 'KES',
  'br': 'BRL',
  'no': 'NOK',
  'se': 'SEK',
  'dk': 'DKK',
  'ch': 'CHF',
  'is': 'ISK',
  // Euro-using countries
  'fr': 'EUR',
  'de': 'EUR',
  'it': 'EUR',
  'es': 'EUR',
  'nl': 'EUR',
  'be': 'EUR',
  'at': 'EUR',
  'ie': 'EUR',
  'fi': 'EUR',
  'pt': 'EUR',
};

/**
 * Get preset donation amounts for a specific currency
 * @param currency The currency code (e.g., 'USD', 'EUR')
 * @returns Preset donation tiers for the given currency, or AUD presets if not found
 */
export function getPresetsForCurrency(currency: string): PresetTiers {
  return donationPresets[currency] || donationPresets.AUD;
}