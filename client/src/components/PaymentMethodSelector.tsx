import React from 'react';
import { useDonation } from '@/components/DonationContext';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { 
  CreditCard, 
  Apple, 
  SquareArrowDownRight
} from 'lucide-react';
import { SiPaypal, SiGooglepay } from 'react-icons/si';

type PaymentMethodType = 'stripe' | 'apple_pay' | 'paypal' | 'google_pay' | 'pakistan_gateway';

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
      description: 'Pay with Credit or Debit Card',
      available: true,
    },
    {
      id: 'paypal',
      name: 'PayPal',
      icon: <SiPaypal className="h-6 w-6 text-blue-700" />,
      description: 'Pay with PayPal Balance or Account',
      available: true,
    },
    {
      id: 'apple_pay',
      name: 'Apple Pay',
      icon: <Apple className="h-6 w-6" />,
      description: 'Quick and secure payments with Apple Pay',
      available: true, // In a real app, you'd check if Apple Pay is available
    },
    {
      id: 'google_pay',
      name: 'Google Pay',
      icon: <SiGooglepay className="h-6 w-6 text-gray-800" />,
      description: 'Fast checkout with Google Pay',
      available: true, // In a real app, you'd check if Google Pay is available
    },
    {
      id: 'pakistan_gateway',
      name: 'Pakistan Payment',
      icon: <SquareArrowDownRight className="h-6 w-6 text-green-600" />,
      description: 'Local payment options for Pakistan',
      available: true,
    },
  ];

  const handlePaymentMethodChange = (value: string) => {
    setPaymentMethod(value as PaymentMethodType);
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