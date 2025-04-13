import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useDonation } from '@/components/DonationContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export default function DonationWidget() {
  const { 
    type, setType, 
    amount, setAmount, 
    customAmount, setCustomAmount, 
    isCustomAmount, setIsCustomAmount,
    frequency, setFrequency,
    currency, currencySymbol, exchangeRate,
    convertAmount
  } = useDonation();

  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // When donation type changes, update frequency if needed
  useEffect(() => {
    if (type !== 'sadqah') {
      setFrequency('one-off');
    }
  }, [type, setFrequency]);

  const handleDonationTypeChange = (newType: string) => {
    setType(newType as 'zakaat' | 'sadqah' | 'interest');
  };

  const handleAmountClick = (selectedAmount: number | 'custom') => {
    if (selectedAmount === 'custom') {
      setIsCustomAmount(true);
    } else {
      setIsCustomAmount(false);
      setAmount(selectedAmount);
    }
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomAmount(e.target.value);
  };

  const handleDonateClick = async () => {
    try {
      // Create a donation record
      const finalAmount = isCustomAmount ? parseFloat(customAmount) : amount;
      
      if (isNaN(finalAmount) || finalAmount <= 0) {
        toast({
          title: "Invalid amount",
          description: "Please enter a valid donation amount",
          variant: "destructive"
        });
        return;
      }

      const donationResponse = await apiRequest("POST", "/api/donations", {
        type,
        amount: finalAmount,
        currency,
        frequency,
        status: "pending"
      });

      const donation = await donationResponse.json();

      // Store the donation ID in sessionStorage for the payment page
      sessionStorage.setItem('currentDonation', JSON.stringify({
        id: donation.id,
        type,
        amount: finalAmount,
        currency,
        frequency
      }));

      // Navigate to the payment page
      setLocation('/payment');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process your donation request. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Format amount with currency conversion
  const formatAmount = (amt: number) => {
    return `${currencySymbol}${convertAmount(amt)}`;
  };

  return (
    <div className="container mx-auto px-4 relative -mt-24 sm:-mt-32 lg:-mt-40 mb-16 max-w-4xl">
      <Card className="bg-white rounded-lg shadow-xl overflow-hidden">
        <CardContent className="p-6 md:p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Make a Quick Donation</h2>
          
          {/* Donation Type Tabs */}
          <div className="flex flex-wrap border-b border-gray-200 mb-6">
            <button 
              className={`px-4 py-2 font-semibold text-sm sm:text-base ${type === 'zakaat' ? 'text-primary bg-blue-50 rounded-t-lg border-b-2 border-primary' : 'text-gray-600 hover:text-primary'}`}
              onClick={() => handleDonationTypeChange('zakaat')}
            >
              Zakaat
            </button>
            <button 
              className={`px-4 py-2 font-semibold text-sm sm:text-base ${type === 'sadqah' ? 'text-primary bg-blue-50 rounded-t-lg border-b-2 border-primary' : 'text-gray-600 hover:text-primary'}`}
              onClick={() => handleDonationTypeChange('sadqah')}
            >
              Sadqah
            </button>
            <button 
              className={`px-4 py-2 font-semibold text-sm sm:text-base ${type === 'interest' ? 'text-primary bg-blue-50 rounded-t-lg border-b-2 border-primary' : 'text-gray-600 hover:text-primary'}`}
              onClick={() => handleDonationTypeChange('interest')}
            >
              Dispose Interest
            </button>
          </div>
          
          {/* Donation Form Content */}
          <div className="donation-form-content">
            {/* Frequency Selection (Only visible for Sadqah) */}
            {type === 'sadqah' && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Payment Frequency</h3>
                <RadioGroup 
                  value={frequency} 
                  onValueChange={(value) => setFrequency(value as 'one-off' | 'weekly' | 'monthly')}
                  className="flex flex-wrap gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="one-off" id="one-off" />
                    <Label htmlFor="one-off">One-off</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="weekly" id="weekly" />
                    <Label htmlFor="weekly">Weekly</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="monthly" id="monthly" />
                    <Label htmlFor="monthly">Monthly</Label>
                  </div>
                </RadioGroup>
              </div>
            )}
            
            {/* Amount Selection */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Select Amount</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button 
                  className={`${!isCustomAmount && amount === 5 ? 'bg-blue-100 border-blue-200' : 'bg-blue-50 hover:bg-blue-100 border-blue-100'} text-primary font-semibold py-3 px-4 rounded-md border`}
                  onClick={() => handleAmountClick(5)}
                >
                  {formatAmount(5)}
                </button>
                <button 
                  className={`${!isCustomAmount && amount === 10 ? 'bg-blue-100 border-blue-200' : 'bg-blue-50 hover:bg-blue-100 border-blue-100'} text-primary font-semibold py-3 px-4 rounded-md border`}
                  onClick={() => handleAmountClick(10)}
                >
                  {formatAmount(10)}
                </button>
                <button 
                  className={`${!isCustomAmount && amount === 50 ? 'bg-blue-100 border-blue-200' : 'bg-blue-50 hover:bg-blue-100 border-blue-100'} text-primary font-semibold py-3 px-4 rounded-md border`}
                  onClick={() => handleAmountClick(50)}
                >
                  {formatAmount(50)}
                </button>
                <button 
                  className={`${isCustomAmount ? 'bg-gray-200 border-gray-300' : 'bg-gray-100 hover:bg-gray-200 border-gray-200'} text-gray-700 font-semibold py-3 px-4 rounded-md border`}
                  onClick={() => handleAmountClick('custom')}
                >
                  Custom
                </button>
              </div>
              
              {isCustomAmount && (
                <div className="mt-4">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">{currencySymbol}</span>
                    <Input 
                      type="text" 
                      className="pl-8 w-full p-3 border border-gray-300 rounded-md" 
                      placeholder="Enter amount"
                      value={customAmount}
                      onChange={handleCustomAmountChange}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Currency will be adjusted based on your location</p>
                </div>
              )}
            </div>
            
            {/* Donate Button */}
            <Button 
              className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-md transition duration-150"
              onClick={handleDonateClick}
            >
              Donate Now
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
