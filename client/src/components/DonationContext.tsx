import React, { createContext, useContext, useState, useEffect } from 'react';
import { Case } from '@shared/schema';

type DonationType = 'zakaat' | 'sadqah' | 'interest';
type FrequencyType = 'one-off' | 'weekly' | 'monthly';
type PaymentMethodType = 'stripe' | 'apple_pay' | 'paypal' | 'google_pay' | 'pakistan_gateway';
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
    availableCurrencies
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
