import React from 'react';
import { useDonation } from '@/components/DonationContext';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CreditCard } from 'lucide-react';
import { SiPaypal } from 'react-icons/si';
import { trackEvent } from '@/lib/analytics';

type PaymentMethodType = 'stripe' | 'paypal';

interface PaymentMethodOption {
  id: PaymentMethodType;
  name: string;
  icon: React.ReactNode;
  description: string;
  available: boolean;
}

export default function PaymentMethodSelector() {
  const { paymentMethod, setPaymentMethod } = useDonation();

  // Define available payment methods
  const paymentMethods: PaymentMethodOption[] = [
    {
      id: 'stripe',
      name: 'Credit Card',
      icon: <CreditCard className="h-6 w-6" />,
      description: 'Pay with Credit or Debit Card (includes Apple Pay and Google Pay when available)',
      available: true,
    },
    {
      id: 'paypal',
      name: 'PayPal',
      icon: <SiPaypal className="h-6 w-6 text-blue-700" />,
      description: 'Pay with PayPal Balance or Account (temporarily unavailable)',
      available: false, // Temporarily disabled while organization account is under review
    }
  ];

  const handlePaymentMethodChange = (value: string) => {
    const newMethod = value as PaymentMethodType;
    
    // Track payment method selection
    trackEvent({
      category: 'Payment',
      action: 'MethodSelected',
      label: newMethod,
      attributes: {
        previousMethod: paymentMethod,
        newMethod: newMethod
      }
    });
    
    setPaymentMethod(newMethod);
  };

  return (
    <div className="space-y-4">
      <RadioGroup 
        value={paymentMethod} 
        onValueChange={handlePaymentMethodChange}
        className="space-y-2"
      >
        {paymentMethods.map((method) => (
          method.available && (
            <div
              key={method.id}
              className="flex items-center space-x-3 border rounded-lg p-3 cursor-pointer hover:bg-gray-50 transition-all"
            >
              <RadioGroupItem value={method.id} id={`payment-${method.id}`} />
              <Label 
                htmlFor={`payment-${method.id}`} 
                className="flex items-center justify-between flex-grow cursor-pointer"
              >
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">{method.icon}</div>
                  <div>
                    <p className="font-semibold">{method.name}</p>
                    <p className="text-sm text-gray-500">{method.description}</p>
                  </div>
                </div>
              </Label>
            </div>
          )
        ))}
      </RadioGroup>
    </div>
  );
}