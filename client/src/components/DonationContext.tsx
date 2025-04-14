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
    // Base donation amount (not a constant since we might need to adjust it)
    let baseAmount = amt;
    let processingFee = 0;
    let totalWithFees = 0;
    let finalDonationAmount = 0;
    
    // Fee calculation based on payment method
    // These are approximate fee structures and should be adjusted based on actual rates
    switch (method) {
      case 'stripe':
        // Stripe typically charges 2.9% + $0.30 for US/Canada transactions
        const isLocal = ['USD', 'CAD'].includes(currency);
        if (isLocal) {
          processingFee = baseAmount * 0.029 + 0.30;
        } else {
          // International transactions may have higher fees (3.9% + $0.30)
          processingFee = baseAmount * 0.039 + 0.30;
        }
        break;
        
      case 'paypal':
        // PayPal typically charges 2.9% + $0.30 for domestic transactions
        const isPayPalLocal = ['USD'].includes(currency);
        if (isPayPalLocal) {
          processingFee = baseAmount * 0.029 + 0.30;
        } else {
          // International PayPal transactions (4.4% + fixed fee)
          processingFee = baseAmount * 0.044 + 0.30;
        }
        break;
        
      case 'apple_pay':
      case 'google_pay':
        // Apple Pay / Google Pay often use the same fee structure as credit cards
        processingFee = baseAmount * 0.029 + 0.30;
        break;
        
      default:
        processingFee = 0;
    }
    
    // Round to 2 decimal places
    processingFee = Math.round(processingFee * 100) / 100;
    
    // If user chooses to cover fees, they pay donation + fees
    // Otherwise, the organization receives the donation minus fees
    if (coverFees) {
      totalWithFees = baseAmount + processingFee;
      finalDonationAmount = baseAmount;
    } else {
      totalWithFees = baseAmount;
      finalDonationAmount = Math.max(0, baseAmount - processingFee);
    }
    
    return {
      processingFee,
      totalWithFees,
      donationAmount: finalDonationAmount
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
