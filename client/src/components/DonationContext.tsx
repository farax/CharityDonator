import React, { createContext, useContext, useState, useEffect } from 'react';
import { Case } from '@shared/schema';

type DonationType = 'zakaat' | 'sadqah' | 'interest';
type FrequencyType = 'one-off' | 'weekly' | 'monthly';
type PaymentMethodType = 'stripe' | 'apple_pay' | 'paypal' | 'google_pay';
type DestinationProjectType = 'Clinic Operations' | 'Most deserving case';

interface DonationContextType {
  type: DonationType;
  setType: (type: DonationType) => void;
  amount: number;
  setAmount: (amount: number) => void;
  customAmount: string;
  setCustomAmount: (amount: string) => void;
  isCustomAmount: boolean;
  setIsCustomAmount: (isCustom: boolean) => void;
  frequency: FrequencyType;
  setFrequency: (frequency: FrequencyType) => void;
  currency: string;
  currencySymbol: string;
  exchangeRate: number;
  setCurrency: (currency: string) => void;
  setCurrencySymbol: (symbol: string) => void;
  setExchangeRate: (rate: number) => void;
  convertAmount: (amount: number) => string;
  paymentMethod: PaymentMethodType;
  setPaymentMethod: (method: PaymentMethodType) => void;
  selectedCase: Case | null;
  setSelectedCase: (donationCase: Case | null) => void;
  destinationProject: DestinationProjectType;
  setDestinationProject: (project: DestinationProjectType) => void;
  showCaseSelector: boolean;
  setShowCaseSelector: (show: boolean) => void;
  availableCurrencies: string[];
  coverFees: boolean;
  setCoverFees: (cover: boolean) => void;
  calculateFees: (amount: number, method: PaymentMethodType) => {
    processingFee: number;
    totalWithFees: number;
    donationAmount: number;
    feeDescription: string;
  };
}

const DonationContext = createContext<DonationContextType | undefined>(undefined);

export function DonationProvider({ children }: { children: React.ReactNode }) {
  const [type, setType] = useState<DonationType>('sadqah');
  const [amount, setAmount] = useState<number>(10);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isCustomAmount, setIsCustomAmount] = useState<boolean>(false);
  const [frequency, setFrequency] = useState<FrequencyType>('one-off');
  const [currency, setCurrency] = useState<string>('USD');
  const [currencySymbol, setCurrencySymbol] = useState<string>('$');
  const [exchangeRate, setExchangeRate] = useState<number>(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('stripe');
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [destinationProject, setDestinationProject] = useState<DestinationProjectType>(
    'Clinic Operations'
  );
  const [showCaseSelector, setShowCaseSelector] = useState<boolean>(false);
  const [coverFees, setCoverFees] = useState<boolean>(true);
  
  // List of available currencies
  const availableCurrencies = [
    'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'HKD', 'SGD', 
    'SEK', 'KRW', 'NOK', 'NZD', 'INR', 'MXN', 'TWD', 'ZAR', 'BRL', 'DKK',
    'PLN', 'THB', 'IDR', 'HUF', 'CZK', 'ILS', 'CLP', 'PHP', 'AED', 'COP',
    'SAR', 'MYR', 'RON', 'TRY', 'PKR'  // Added PKR for Pakistan
  ];
  
  // Initialize with some default values
  useEffect(() => {
    console.log('Location detection would happen here');
    // We'd usually detect the user's location and set currency accordingly
    // For now, just log this and use USD as the default
    console.log('User currency detected as: USD');
  }, []);

  // Effect to update destination project based on donation type
  useEffect(() => {
    if (type === 'zakaat') {
      setDestinationProject('Most deserving case');
    } else {
      setDestinationProject('Clinic Operations');
    }
  }, [type]);

  const convertAmount = (amt: number): string => {
    return `${(amt * exchangeRate).toFixed(2)}`;
  };
  
  // Calculate payment processing fees based on payment method and amount
  const calculateFees = (amt: number, method: PaymentMethodType) => {
    // Base donation amount
    let baseAmount = amt;
    let processingFee = 0;
    let totalWithFees = 0;
    let finalDonationAmount = 0;
    let feeDescription = "";
    
    // Fee calculation based on payment method
    // These fee structures are based on published rates from each provider
    switch (method) {
      case 'stripe':
        // Stripe fee structure varies by region and currency
        const isStripeLocalUSD = ['USD'].includes(currency);
        const isStripeLocalOther = ['CAD', 'EUR', 'GBP'].includes(currency);
        
        if (isStripeLocalUSD) {
          // US cards in USD: 2.9% + $0.30
          processingFee = baseAmount * 0.029 + 0.30;
          feeDescription = "Stripe charges 2.9% + $0.30 per successful card charge";
        } else if (isStripeLocalOther) {
          // European/Canadian cards: 2.9% + local fixed fee
          processingFee = baseAmount * 0.029 + 0.30;
          feeDescription = `Stripe charges 2.9% + ${currencySymbol}0.30 per successful card charge`;
        } else {
          // International cards: 3.9% + fixed fee
          processingFee = baseAmount * 0.039 + 0.30;
          feeDescription = `Stripe charges 3.9% + ${currencySymbol}0.30 for international transactions`;
        }
        break;
        
      case 'paypal':
        // PayPal fee structure
        const isPayPalUS = ['USD'].includes(currency);
        const isPayPalEurope = ['EUR', 'GBP'].includes(currency);
        
        if (isPayPalUS) {
          // US PayPal: 2.9% + $0.30
          processingFee = baseAmount * 0.029 + 0.30;
          feeDescription = "PayPal charges 2.9% + $0.30 for domestic transactions";
        } else if (isPayPalEurope) {
          // European PayPal: 3.4% + fixed fee
          processingFee = baseAmount * 0.034 + 0.30;
          feeDescription = `PayPal charges 3.4% + ${currencySymbol}0.30 for European transactions`;
        } else {
          // International PayPal: 4.4% + fixed fee
          processingFee = baseAmount * 0.044 + 0.30;
          feeDescription = `PayPal charges 4.4% + ${currencySymbol}0.30 for international transactions`;
        }
        break;
        
      case 'apple_pay':
        // Apple Pay uses the underlying card network fees
        processingFee = baseAmount * 0.029 + 0.30;
        feeDescription = "Apple Pay transactions incur standard card processing fees (2.9% + $0.30)";
        break;
        
      case 'google_pay':
        // Google Pay uses the underlying card network fees
        processingFee = baseAmount * 0.029 + 0.30;
        feeDescription = "Google Pay transactions incur standard card processing fees (2.9% + $0.30)";
        break;
        
      default:
        processingFee = 0;
        feeDescription = "No fee information available for this payment method";
    }
    
    // Round to 2 decimal places
    processingFee = Math.round(processingFee * 100) / 100;
    
    // If user chooses to cover fees, they pay donation + fees
    // Otherwise, the organization still receives the full donation amount,
    // but we show the breakdown for transparency
    if (coverFees) {
      totalWithFees = baseAmount + processingFee;
      finalDonationAmount = baseAmount;
    } else {
      totalWithFees = baseAmount;
      // When user doesn't cover fees, charity still gets full amount in our display
      // The actual deduction would happen on the payment provider's side
      finalDonationAmount = baseAmount;
    }
    
    return {
      processingFee,
      totalWithFees,
      donationAmount: finalDonationAmount,
      feeDescription
    };
  };

  const contextValue: DonationContextType = {
    type,
    setType,
    amount,
    setAmount,
    customAmount,
    setCustomAmount,
    isCustomAmount,
    setIsCustomAmount,
    frequency,
    setFrequency,
    currency,
    currencySymbol,
    exchangeRate,
    setCurrency,
    setCurrencySymbol,
    setExchangeRate,
    convertAmount,
    paymentMethod,
    setPaymentMethod,
    selectedCase,
    setSelectedCase,
    destinationProject,
    setDestinationProject,
    showCaseSelector,
    setShowCaseSelector,
    availableCurrencies,
    coverFees,
    setCoverFees,
    calculateFees
  };

  return (
    <DonationContext.Provider value={contextValue}>
      {children}
    </DonationContext.Provider>
  );
}

export function useDonation() {
  const context = useContext(DonationContext);
  if (context === undefined) {
    throw new Error('useDonation must be used within a DonationProvider');
  }
  return context;
}
