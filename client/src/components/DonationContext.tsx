import React, { createContext, useContext, useState, useEffect } from 'react';
import { Case } from '@shared/schema';

type DonationType = 'zakaat' | 'sadqah' | 'interest';
type FrequencyType = 'one-off' | 'weekly' | 'monthly';
type PaymentMethodType = 'stripe' | 'paypal' | 'apple_pay' | 'google_pay';
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
  const [amount, setAmount] = useState<number>(0);
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
  
  // Initialize with currency based on location (handled by CurrencySelector component)
  useEffect(() => {
    // Currency is automatically set based on the user's location via API
    // This initialization is handled by the CurrencySelector component
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
    
    // Fixed fee calculation for all payment methods
    // Using a simplified flat rate of 3.5% + A$0.30
    switch (method) {
      case 'stripe':
        // All cards: 3.5% + A$0.30
        processingFee = baseAmount * 0.035 + 0.30;
        feeDescription = "Payment processing fees: 3.5% + A$0.30";
        break;
        
      case 'paypal':
        // All cards: 3.5% + A$0.30 (standardized for simplicity)
        processingFee = baseAmount * 0.035 + 0.30;
        feeDescription = "Payment processing fees: 3.5% + A$0.30";
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
