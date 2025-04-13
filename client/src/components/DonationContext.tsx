import React, { createContext, useContext, useState, useEffect } from 'react';

type DonationType = 'zakaat' | 'sadqah' | 'interest';
type FrequencyType = 'one-off' | 'weekly' | 'monthly';

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
}

const DonationContext = createContext<DonationContextType | undefined>(undefined);

export function DonationProvider({ children }: { children: React.ReactNode }) {
  const [type, setType] = useState<DonationType>('zakaat');
  const [amount, setAmount] = useState<number>(10);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isCustomAmount, setIsCustomAmount] = useState<boolean>(false);
  const [frequency, setFrequency] = useState<FrequencyType>('one-off');
  const [currency, setCurrency] = useState<string>('USD');
  const [currencySymbol, setCurrencySymbol] = useState<string>('$');
  const [exchangeRate, setExchangeRate] = useState<number>(1);
  
  // Initialize with some default values
  useEffect(() => {
    console.log('Location detection would happen here');
    // We'd usually detect the user's location and set currency accordingly
    // For now, just log this and use USD as the default
    console.log('User currency detected as: USD');
  }, []);

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
    convertAmount
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
