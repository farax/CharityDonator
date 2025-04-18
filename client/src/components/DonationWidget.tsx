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
import CurrencySelector from '@/components/CurrencySelector';
import CaseSelector from '@/components/CaseSelector';
import { ChevronRight } from 'lucide-react';
import { trackButtonClick, trackDonation, trackEvent } from '@/lib/analytics';

export default function DonationWidget() {
  const { 
    type, setType, 
    amount, setAmount, 
    customAmount, setCustomAmount, 
    isCustomAmount, setIsCustomAmount,
    frequency, setFrequency,
    currency, currencySymbol, exchangeRate,
    convertAmount,
    destinationProject,
    selectedCase,
    setSelectedCase,
    showCaseSelector,
    setShowCaseSelector
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
    const typedValue = newType as 'zakaat' | 'sadqah' | 'interest';
    setType(typedValue);
    
    // Track donation type selection
    trackEvent({
      category: 'Donation',
      action: 'SelectType',
      label: typedValue
    });
  };

  const handleAmountClick = (selectedAmount: number | 'custom') => {
    if (selectedAmount === 'custom') {
      setIsCustomAmount(true);
      
      // Track custom amount click
      trackEvent({
        category: 'Donation',
        action: 'SelectCustomAmount',
        label: type
      });
    } else {
      setIsCustomAmount(false);
      setAmount(selectedAmount);
      
      // Track predefined amount selection
      trackEvent({
        category: 'Donation',
        action: 'SelectAmount',
        label: `${type}-${selectedAmount}`,
        value: selectedAmount
      });
    }
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomAmount(e.target.value);
    
    // We don't track every keystroke to avoid too many events
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
        
        // Track validation error
        trackEvent({
          category: 'Donation',
          action: 'ValidationError',
          label: 'InvalidAmount'
        });
        
        return;
      }

      // Track the donate button click
      trackButtonClick('StartDonation', {
        donationType: type,
        amount: finalAmount,
        currency: currency,
        frequency: frequency
      });

      const donationData: any = {
        type,
        amount: finalAmount,
        currency,
        frequency,
        status: "pending",
        destinationProject
      };

      // Add case ID if a case was selected
      if (selectedCase && type === 'zakaat') {
        donationData.caseId = selectedCase.id;
      }

      const donationResponse = await apiRequest("POST", "/api/donations", donationData);
      const donation = await donationResponse.json();

      // Track successful donation initiation
      trackDonation(
        type,
        finalAmount,
        currency,
        {
          frequency: frequency,
          destinationProject: destinationProject,
          caseId: selectedCase?.id,
          donationId: donation.id
        }
      );

      // Store the donation ID in sessionStorage for the payment page
      sessionStorage.setItem('currentDonation', JSON.stringify({
        id: donation.id,
        type,
        amount: finalAmount,
        currency,
        frequency,
        destinationProject,
        caseId: selectedCase?.id
      }));

      // Navigate to the payment page
      setLocation('/payment');
    } catch (error) {
      // Track error
      trackEvent({
        category: 'Donation',
        action: 'Error',
        label: 'APIError'
      });
      
      toast({
        title: "Error",
        description: "Failed to process your donation request. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Format amount with currency symbol but no conversion (fixed amounts)
  const formatAmount = (amt: number) => {
    return `${currencySymbol}${amt}`;
  };

  return (
    <div className="container mx-auto px-4 relative -mt-24 sm:-mt-32 lg:-mt-40 mb-16 max-w-4xl">
      <Card className="bg-white rounded-lg shadow-xl overflow-hidden">
        <CardContent className="p-6 md:p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Make a Quick Donation</h2>
          
          {/* Donation Type Tabs */}
          <div className="flex flex-wrap border-b border-gray-200 mb-6">
            <button 
              className={`px-4 py-2 font-semibold text-sm sm:text-base ${type === 'sadqah' ? 'text-primary bg-blue-50 rounded-t-lg border-b-2 border-primary' : 'text-gray-600 hover:text-primary'}`}
              onClick={() => handleDonationTypeChange('sadqah')}
            >
              Sadqah
            </button>
            <button 
              className={`px-4 py-2 font-semibold text-sm sm:text-base ${type === 'zakaat' ? 'text-primary bg-blue-50 rounded-t-lg border-b-2 border-primary' : 'text-gray-600 hover:text-primary'}`}
              onClick={() => handleDonationTypeChange('zakaat')}
            >
              Zakaat
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
            {/* Destination Project Section */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Donate For: {destinationProject}</h3>
              
              {type === 'zakaat' && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex justify-between items-center">
                  {selectedCase ? (
                    <div>
                      <div className="font-medium text-gray-800">{selectedCase.title}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        {formatAmount(selectedCase.amountRequired)} required
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-700">Most deserving case</div>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-primary border-primary hover:bg-primary hover:text-white"
                    onClick={() => setShowCaseSelector(true)}
                  >
                    Select a Case <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              )}
              
              {/* Case Selector Dialog */}
              <CaseSelector 
                open={showCaseSelector} 
                onOpenChange={setShowCaseSelector} 
              />
            </div>
            
            {/* Frequency Selection (Only visible for Sadqah) */}
            {type === 'sadqah' && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Payment Frequency</h3>
                <div className="grid grid-cols-3 gap-2">
                  <div 
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border cursor-pointer transition-all ${
                      frequency === 'one-off' 
                        ? 'bg-blue-50 border-blue-300 shadow-sm' 
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                    onClick={() => setFrequency('one-off')}
                  >
                    <div className={`w-8 h-4 rounded-full mb-2 relative ${
                      frequency === 'one-off' ? 'bg-primary' : 'bg-gray-300'
                    }`}>
                      <div 
                        className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${
                          frequency === 'one-off' ? 'bg-white right-0.5' : 'bg-white left-0.5'
                        }`} 
                      />
                    </div>
                    <span className="text-sm font-medium">One-off</span>
                  </div>

                  <div 
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border cursor-pointer transition-all ${
                      frequency === 'weekly' 
                        ? 'bg-blue-50 border-blue-300 shadow-sm' 
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                    onClick={() => setFrequency('weekly')}
                  >
                    <div className={`w-8 h-4 rounded-full mb-2 relative ${
                      frequency === 'weekly' ? 'bg-primary' : 'bg-gray-300'
                    }`}>
                      <div 
                        className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${
                          frequency === 'weekly' ? 'bg-white right-0.5' : 'bg-white left-0.5'
                        }`} 
                      />
                    </div>
                    <span className="text-sm font-medium">Weekly</span>
                  </div>

                  <div 
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border cursor-pointer transition-all ${
                      frequency === 'monthly' 
                        ? 'bg-blue-50 border-blue-300 shadow-sm' 
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                    onClick={() => setFrequency('monthly')}
                  >
                    <div className={`w-8 h-4 rounded-full mb-2 relative ${
                      frequency === 'monthly' ? 'bg-primary' : 'bg-gray-300'
                    }`}>
                      <div 
                        className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${
                          frequency === 'monthly' ? 'bg-white right-0.5' : 'bg-white left-0.5'
                        }`} 
                      />
                    </div>
                    <span className="text-sm font-medium">Monthly</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Amount Selection */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-semibold text-gray-700">Select Amount</h3>
                <div className="flex items-center">
                  <CurrencySelector />
                </div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                  className={`${!isCustomAmount && amount === 100 ? 'bg-blue-100 border-blue-200' : 'bg-blue-50 hover:bg-blue-100 border-blue-100'} text-primary font-semibold py-3 px-4 rounded-md border`}
                  onClick={() => handleAmountClick(100)}
                >
                  {formatAmount(100)}
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
                      className="pl-8 w-full p-3 border border-gray-300 rounded-md bg-white text-gray-900" 
                      placeholder={`Enter amount in ${currency}`}
                      value={customAmount}
                      onChange={handleCustomAmountChange}
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* Donate Button */}
            <Button 
              className="w-full bg-primary hover:bg-teal-600 text-white font-bold py-3 px-4 rounded-md transition duration-150"
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
