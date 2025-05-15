import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useDonation } from '@/components/DonationContext';
import PaymentMethodSelector from '@/components/PaymentMethodSelector';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  PayPalScriptProvider, 
  PayPalButtons,
  FUNDING
} from '@paypal/react-paypal-js';
import { trackButtonClick, trackEvent, trackFormSubmission } from '@/lib/analytics';

// No donor form schema needed since we'll use the payment provider's UI

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  console.warn('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}

const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY 
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY) 
  : null;

// The actual checkout form with Stripe Elements
const CheckoutForm = ({ isSubscription = false }: { isSubscription?: boolean }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [donationDetails, setDonationDetails] = useState<any>(null);
  
  // DOM manipulation code removed since the issue was fixed in Stripe portal
  
  useEffect(() => {
    // Get donation details from session storage
    const stored = sessionStorage.getItem('currentDonation');
    if (stored) {
      setDonationDetails(JSON.parse(stored));
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);
    
    // Track payment form submission
    trackFormSubmission('StripePaymentForm', {
      paymentMethod: 'stripe',
      donationType: donationDetails?.type,
      amount: donationDetails?.amount,
      currency: donationDetails?.currency,
      isSubscription: isSubscription
    });

    if (isSubscription) {
      // For subscriptions, we need to collect payment method and then create a subscription
      try {
        // First submit the Elements form to validate card details
        const { error: submitError } = await elements.submit();
        if (submitError) {
          throw new Error(submitError.message);
        }
        
        // 1. Create a payment method from the form elements
        const { error: elementsError, paymentMethod } = await stripe.createPaymentMethod({
          elements
        });
        
        if (elementsError) {
          throw new Error(elementsError.message);
        }
        
        if (!paymentMethod) {
          throw new Error('Failed to create payment method');
        }
        
        // 2. Create a subscription with the payment method
        const response = await apiRequest("POST", "/api/create-subscription", {
          donationId: donationDetails.id,
          amount: donationDetails.amount,
          currency: donationDetails.currency,
          email: email,
          name: name,
          paymentMethodId: paymentMethod.id,
          frequency: donationDetails.frequency
        });
        
        const subscriptionData = await response.json();
        
        // 3. Handle the result
        // Confirm the payment if a client secret is returned
        if (subscriptionData.clientSecret) {
          console.log('Confirming payment with client secret:', subscriptionData.clientSecret);
          
          // Confirm the payment to complete the subscription
          const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
            subscriptionData.clientSecret,
            { 
              payment_method: paymentMethod.id
            }
          );
          
          if (confirmError) {
            console.error('Subscription confirmation error:', confirmError);
            throw new Error(confirmError.message);
          }
          
          console.log('Subscription payment confirmation successful:', paymentIntent);
        } else {
          console.warn('No client secret returned for subscription payment confirmation');
        }
        
        // Track subscription success
        trackEvent({
          category: 'Payment',
          action: 'Success',
          label: 'Stripe Subscription',
          value: donationDetails?.amount,
          attributes: {
            paymentMethod: 'stripe',
            donationId: donationDetails?.id?.toString(),
            frequency: donationDetails?.frequency,
            subscriptionId: subscriptionData.subscriptionId
          }
        });
        
        toast({
          title: "Subscription Successful",
          description: `Thank you for your recurring donation! Your first payment has been processed, and you'll be charged ${donationDetails.currency} ${donationDetails.amount} ${donationDetails.frequency}.`,
        });
        
        // Redirect to homepage after successful setup
        setTimeout(() => {
          setLocation('/');
        }, 3000);
        
      } catch (error: any) {
        // Track subscription failure
        trackEvent({
          category: 'Payment',
          action: 'Failed',
          label: error.message || 'Subscription error',
          attributes: {
            paymentMethod: 'stripe',
            errorMessage: error.message || 'Unknown error'
          }
        });
        
        toast({
          title: "Subscription Failed",
          description: error.message || "There was an issue setting up your subscription. Please try again.",
          variant: "destructive",
        });
      }
    } else {
      // One-time payment flow
      // Use manual confirmation instead of redirect
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });

      if (error) {
        // Track payment failure
        trackEvent({
          category: 'Payment',
          action: 'Failed',
          label: error.message || 'Payment error',
          attributes: {
            paymentMethod: 'stripe',
            errorType: error.type || 'unknown',
            errorCode: error.code || 'none'
          }
        });
        
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        // Update donation status manually to ensure it's marked completed
        try {
          if (paymentIntent && donationDetails?.id) {
            await apiRequest("POST", "/api/update-donation-status", {
              donationId: donationDetails.id,
              status: "completed",
              paymentMethod: "stripe",
              paymentId: paymentIntent.id
            });
            console.log("Donation status updated to completed", paymentIntent.id);
            
            // Also directly notify about payment success to update case amount
            if (donationDetails.caseId) {
              await apiRequest("POST", "/api/stripe-payment-success", {
                donationId: donationDetails.id,
                paymentIntentId: paymentIntent.id
              });
              console.log("Case amount updated via direct notification", donationDetails.caseId);
            }
          }
        } catch (updateError) {
          console.error("Failed to update donation status:", updateError);
          // Continue with success path even if status update fails
        }
        
        // Track payment success
        trackEvent({
          category: 'Payment',
          action: 'Success',
          label: 'Stripe',
          value: donationDetails?.amount,
          attributes: {
            paymentMethod: 'stripe',
            donationId: donationDetails?.id?.toString(),
            frequency: donationDetails?.frequency
          }
        });
        
        toast({
          title: "Payment Successful",
          description: "Thank you for your generous donation!",
          variant: "success",
        });
        
        // Redirect to homepage after successful payment
        setTimeout(() => {
          setLocation('/');
        }, 2000);
      }
    }
    
    setIsLoading(false);
  };

  // Format frequency for display
  const formatFrequency = (frequency: string) => {
    if (frequency === 'one-off') return 'One-time';
    return frequency.charAt(0).toUpperCase() + frequency.slice(1);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {donationDetails && isSubscription && (
        <div className="bg-blue-50 p-4 rounded-md mb-4 border border-blue-100">
          <h3 className="font-medium text-blue-800 mb-2">Recurring Payment Setup</h3>
          <div className="text-sm text-blue-600 mb-4">
            <p>You're setting up a {formatFrequency(donationDetails.frequency)} donation of {donationDetails.currency} {donationDetails.amount}.</p>
            <p className="mt-1">Your card will be charged today and then every {donationDetails.frequency === 'weekly' ? 'week' : 'month'} thereafter.</p>
          </div>
          
          {/* Email for subscription notifications */}
          <div className="space-y-4 mb-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email (for payment receipts)
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
                placeholder="your@email.com"
                required
              />
            </div>
            
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name (for payment records)
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
                placeholder="Your Name"
                required
              />
            </div>
          </div>
        </div>
      )}
      
      <PaymentElement />
      
      <Button 
        type="submit" 
        className="w-full py-3" 
        disabled={!stripe || isLoading || (isSubscription && (!email || !name))}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing
          </>
        ) : (
          isSubscription ? 'Set Up Recurring Donation' : 'Complete Donation'
        )}
      </Button>
    </form>
  );
};

// Component for PayPal payment
const PayPalPayment = ({ donationDetails }: { donationDetails: any }) => {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  // Log the client ID (with partial masking for security)
  const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || '';
  const maskedClientId = clientId ? 
    clientId.substring(0, 5) + '...' + clientId.substring(clientId.length - 5) : 
    'not found';
  console.log('PayPal Client ID available:', !!clientId, '- Value starts with:', maskedClientId);

  // PayPal configuration options
  const paypalOptions = {
    clientId: clientId,
    currency: donationDetails.currency.toLowerCase(),
    intent: "capture"
  };
  
  // Warn if PayPal client ID is missing
  if (!clientId) {
    console.warn('Missing required PayPal key: VITE_PAYPAL_CLIENT_ID');
    toast({
      title: "PayPal Configuration Error",
      description: "PayPal client ID is missing. Please contact support.",
      variant: "destructive"
    });
  }

  // Define success handler for PayPal
  const handlePayPalSuccess = (details: any) => {
    // Check if this is a recurring payment or one-time
    const isRecurring = donationDetails.frequency !== 'one-off';
    
    // Track payment success with PayPal
    trackEvent({
      category: 'Payment',
      action: 'Success',
      label: isRecurring ? 'PayPal Subscription' : 'PayPal',
      value: donationDetails.amount,
      attributes: {
        paymentMethod: 'paypal',
        donationId: donationDetails.id.toString(),
        frequency: donationDetails.frequency,
        paypalOrderId: details.id,
        isRecurring
      }
    });
    
    // Update donation status in the database
    apiRequest("POST", "/api/update-donation-status", {
      donationId: donationDetails.id,
      status: isRecurring ? "active-subscription" : "completed",
      paymentMethod: "paypal",
      paymentId: details.id,
      subscriptionId: isRecurring ? details.subscriptionID : undefined
    }).then(async () => {
      // Also directly notify about payment success to update case amount if applicable
      if (donationDetails.caseId) {
        try {
          await apiRequest("POST", "/api/stripe-payment-success", {
            donationId: donationDetails.id,
            paymentIntentId: details.id
          });
          console.log("Case amount updated via direct notification for PayPal payment", donationDetails.caseId);
        } catch (error) {
          console.error("Failed to update case amount:", error);
          // Continue with success path even if case update fails
        }
      }
      
      toast({
        title: isRecurring ? "Subscription Successful" : "Payment Successful",
        description: isRecurring
          ? `Thank you for your recurring donation via PayPal! You'll be charged ${donationDetails.currency} ${donationDetails.amount} ${donationDetails.frequency}.`
          : "Thank you for your generous donation via PayPal!",
        variant: "success"
      });
      
      // Redirect to homepage after successful payment
      setTimeout(() => {
        setLocation('/');
      }, 2000);
    });
  };

  // Handle errors
  const handlePayPalError = (error: any) => {
    // Track payment failure
    trackEvent({
      category: 'Payment',
      action: 'Failed',
      label: 'PayPal',
      attributes: {
        paymentMethod: 'paypal',
        errorMessage: error?.message || 'Unknown PayPal error'
      }
    });
    
    toast({
      title: "Payment Failed",
      description: error?.message || "There was an issue processing your PayPal payment.",
      variant: "destructive",
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-100 rounded-md p-4 mb-4">
        <h3 className="font-medium text-blue-800 mb-2">PayPal Checkout</h3>
        <p className="text-sm text-blue-600">
          Securely donate using your PayPal account or credit/debit card via PayPal.
        </p>
      </div>
      
      <div>
        <form
          action="https://www.paypal.com/cgi-bin/webscr"
          method="post"
          target="_blank"
          onSubmit={() => {
            // Track button click
            trackButtonClick('PayPalDonationButton', {
              donationType: donationDetails.type,
              amount: donationDetails.amount,
              currency: donationDetails.currency,
              frequency: donationDetails.frequency
            });
            
            // Create donation in database
            apiRequest('POST', '/api/donations', {
              type: donationDetails.type,
              amount: donationDetails.amount,
              currency: donationDetails.currency,
              frequency: donationDetails.frequency,
              paymentMethod: 'paypal',
              donorName: 'PayPal Customer',
              donorEmail: '',
              caseId: donationDetails.caseId,
              giftAid: donationDetails.giftAid || false
            })
            .then(response => {
              if (!response.ok) {
                throw new Error('Failed to create donation record');
              }
              return response.json();
            })
            .then(donation => {
              // Track analytics
              trackEvent({
                category: 'Donation',
                action: 'PayPalRedirect',
                label: donation.id.toString(),
                value: donationDetails.amount
              });
              
              toast({
                title: "Redirecting to PayPal",
                description: "Processing your donation securely with PayPal.",
                variant: "info"
              });
            })
            .catch(error => {
              console.error("PayPal donation error:", error);
              toast({
                title: "PayPal Error",
                description: "Could not process PayPal donation. Please try again later.",
                variant: "destructive"
              });
            });
          }}
          className="w-full"
        >
          {/* PayPal required fields */}
          <input type="hidden" name="cmd" value="_donations" />
          <input type="hidden" name="business" value="aafiyaa.main@gmail.com" />
          <input type="hidden" name="lc" value="AU" />
          <input type="hidden" name="item_name" value={`${donationDetails.type} donation for Aafiyaa Charity Clinics`} />
          <input type="hidden" name="amount" value={donationDetails.amount.toString()} />
          <input type="hidden" name="currency_code" value={donationDetails.currency.toUpperCase()} />
          <input type="hidden" name="no_note" value="0" />
          <input type="hidden" name="return" value={`${window.location.origin}/donation-success`} />
          <input type="hidden" name="cancel_return" value={`${window.location.origin}/donation-cancelled`} />
          <input type="hidden" name="bn" value="PP-DonationsBF:btn_donateCC_LG.gif:NonHostedGuest" />
          
          {/* Custom button that triggers the form submission */}
          <div className="w-full py-6 px-6 rounded-lg border border-blue-100 bg-blue-50">
            <div className="mb-4">
              <h3 className="font-medium text-blue-800 mb-2">Donate with PayPal</h3>
            </div>
            
            <button 
              type="submit"
              className="w-full flex items-center justify-center py-4 bg-[#0070ba] hover:bg-[#003087] text-white font-medium rounded-md transition-colors"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing
                </>
              ) : (
                <span className="flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
                    <path d="M20.067 8.478c.492.845.74 1.887.74 3.126 0 2.888-1.213 5.158-3.64 6.812-2.428 1.653-5.644 2.48-9.648 2.48H5.616L4 24h4.32c.371 0 .685-.265.742-.632l.298-1.89.56.01.367-2.327h2.22c3.686 0 6.615-.756 8.786-2.268 2.622-1.821 3.934-4.45 3.934-7.895 0-1.823-.364-3.39-1.09-4.702-1.717-3.101-5.726-4.682-12.025-4.682H4.746c-.37 0-.686.265-.742.632L1.636 16.842c-.042.275.005.556.133.787.128.23.327.394.566.465l1.46.438V9.585c0-.522.423-.945.945-.945h3.11c3.22 0 5.691.57 7.344 1.706 1.653 1.137 2.478 2.785 2.478 4.944 0 2.025-.576 3.532-1.728 4.523-1.151.99-2.96 1.485-5.425 1.485H7.85a.751.751 0 0 0-.742.632l-.463 2.936-.033.216-.262 1.662h1.611c3.68 0 6.604-.756 8.775-2.268 2.622-1.821 3.934-4.45 3.934-7.895 0-1.823-.364-3.39-1.09-4.702-.726-1.31-1.92-2.342-3.585-3.096-1.664-.753-3.787-1.13-6.367-1.13H4.746a.751.751 0 0 0-.742.632L1.636 16.842c-.042.275.005.556.133.787.128.23.327.394.566.465l1.46.438V9.585c0-.522.423-.945.945-.945h3.11c3.22 0 5.691.57 7.344 1.706 1.653 1.137 2.478 2.785 2.478 4.944 0 2.025-.576 3.532-1.728 4.523-1.151.99-2.96 1.485-5.425 1.485H7.85a.751.751 0 0 0-.742.632l-.758 4.814h.12a.751.751 0 0 0 .742-.632l.561-3.553h2.645c2.702 0 4.773-.595 6.212-1.786 1.44-1.19 2.16-2.944 2.16-5.262 0-2.477-.964-4.362-2.892-5.654-1.929-1.292-4.642-1.938-8.139-1.938H3.935c-.953 0-1.727.774-1.727 1.727v9.45l-1.302-.39a2.025 2.025 0 0 1-1.238-1.016A2.025 2.025 0 0 1-.62 16.56L1.748 3.155A1.866 1.866 0 0 1 3.591 1.58h8.504c3.417 0 6.046.527 7.887 1.582 1.84 1.054 3.126 2.675 3.857 4.861.215.46.392.938.53 1.436.041.023.79.443.115.66.143.839.213 1.714.213 2.625 0 3.729-1.397 6.647-4.188 8.755-2.793 2.107-6.608 3.16-11.447 3.16h-2.31l-.223 1.43h4.116c3.686 0 6.615-.756 8.786-2.268 2.173-1.512 3.37-3.732 3.59-6.662.033.004.064.011.97.011 2.172 0 3.91-.701 5.212-2.102 1.303-1.402 1.954-3.37 1.954-5.907 0-1.434-.281-2.647-.845-3.638-.563-.99-1.372-1.776-2.427-2.355-1.055-.58-2.314-.986-3.78-1.22a29.72 29.72 0 0 0-4.804-.351h-8.32a1.866 1.866 0 0 0-1.844 1.576L1.636 16.842a2.025 2.025 0 0 0 1.526 2.322l.357.107-.39 2.485a1.866 1.866 0 0 0 1.843 2.125h4.116c3.686 0 6.615-.756 8.786-2.268 2.622-1.821 3.934-4.45 3.934-7.895 0-1.823-.364-3.39-1.09-4.702-.726-1.31-1.92-2.342-3.585-3.096-1.664-.753-3.787-1.13-6.367-1.13H4.746a.751.751 0 0 0-.742.632L1.636 16.842c-.042.275.005.556.133.787.128.23.327.394.566.465l1.46.438V9.585c0-.522.423-.945.945-.945h3.11c3.22 0 5.691.57 7.344 1.706 1.653 1.137 2.478 2.785 2.478 4.944 0 2.025-.576 3.532-1.728 4.523-1.151.99-2.96 1.485-5.425 1.485H7.85a.751.751 0 0 0-.742.632l-.758 4.814h.12a.751.751 0 0 0 .742-.632l.561-3.553h2.645c2.702 0 4.773-.595 6.212-1.786 1.44-1.19 2.16-2.944 2.16-5.262 0-2.477-.964-4.362-2.892-5.654-1.929-1.292-4.642-1.938-8.139-1.938H3.935c-.953 0-1.727.774-1.727 1.727v9.45l-1.302-.39a2.025 2.025 0 0 1-1.238-1.016A2.025 2.025 0 0 1-.62 16.56L1.748 3.155A1.866 1.866 0 0 1 3.591 1.58h8.504c3.417 0 6.046.527 7.887 1.582 1.84 1.054 3.126 2.675 3.857 4.861.76.16.148.324.228.455z" fill="#fff"/>
                  </svg>
                  Donate {donationDetails.amount} {donationDetails.currency}
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Component for Apple Pay
const ApplePayment = ({ donationDetails }: { donationDetails: any }) => {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [isApplePayAvailable, setIsApplePayAvailable] = useState<boolean | null>(null);

  // Check if Apple Pay is available on the device/browser
  useEffect(() => {
    // The actual check for Apple Pay availability would use this method
    const checkApplePayAvailability = () => {
      // In a real implementation, you would check if the browser supports Apple Pay
      // For example: if (window.ApplePaySession && ApplePaySession.canMakePayments())
      
      // For our demo, we'll simulate ApplePay detection
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      
      setIsApplePayAvailable(isIOS && isSafari);
    };

    checkApplePayAvailability();
  }, []);

  const handleApplePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Track form submission
    trackFormSubmission('ApplePayForm', {
      paymentMethod: 'apple_pay',
      donationType: donationDetails?.type,
      amount: donationDetails?.amount,
      currency: donationDetails?.currency
    });
    
    try {
      // Set up payment request data
      const paymentData = {
        donationId: donationDetails.id,
        amount: donationDetails.amount,
        currency: donationDetails.currency,
        description: `${donationDetails.type} donation for Aafiyaa Charity Clinics`
      };
      
      // In a real implementation, this would initiate the Apple Pay session
      // For our demo, we'll simulate a successful payment
      
      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Update donation status
      await apiRequest("POST", "/api/update-donation-status", {
        donationId: donationDetails.id,
        status: "completed",
        paymentMethod: "apple_pay",
        paymentId: `applepay-${Date.now()}`
      });
      
      // Also update case amount if applicable
      if (donationDetails.caseId) {
        try {
          await apiRequest("POST", "/api/stripe-payment-success", {
            donationId: donationDetails.id,
            paymentIntentId: `applepay-${Date.now()}`
          });
          console.log("Case amount updated via direct notification for Apple Pay", donationDetails.caseId);
        } catch (error) {
          console.error("Failed to update case amount:", error);
          // Continue with success path even if case update fails
        }
      }
      
      // Track successful payment
      trackEvent({
        category: 'Payment',
        action: 'Success',
        label: 'ApplePay',
        value: donationDetails.amount,
        attributes: {
          paymentMethod: 'apple_pay',
          donationId: donationDetails.id.toString(),
          frequency: donationDetails.frequency
        }
      });
      
      toast({
        title: "Payment Successful",
        description: "Thank you for your donation via Apple Pay!",
        variant: "success"
      });
      
      // Redirect to homepage after successful payment
      setTimeout(() => {
        setLocation('/');
      }, 2000);
      
    } catch (error) {
      // Track payment failure
      trackEvent({
        category: 'Payment',
        action: 'Failed',
        label: 'ApplePay',
        attributes: {
          paymentMethod: 'apple_pay',
          errorMessage: 'Apple Pay processing error'
        }
      });
      
      toast({
        title: "Payment Failed",
        description: "There was an issue processing your Apple Pay payment.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isApplePayAvailable === null) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isApplePayAvailable === false) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-md p-4 text-center">
        <p className="text-gray-800 font-medium">
          Apple Pay is not available on this device or browser.
        </p>
        <p className="text-sm text-gray-600 mt-2">
          Please use Safari on an iOS device or choose another payment method.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleApplePaySubmit} className="space-y-6">
      <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
        <h3 className="font-medium text-gray-800 mb-2">Apple Pay Checkout</h3>
        <p className="text-sm text-gray-600">
          Quickly and securely pay with Apple Pay.
        </p>
      </div>
      
      <Button 
        type="submit" 
        className="w-full py-3 bg-black hover:bg-gray-800 text-white" 
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing
          </>
        ) : (
          'Pay with Apple Pay'
        )}
      </Button>
    </form>
  );
};

// Component for Google Pay
const GooglePayment = ({ donationDetails }: { donationDetails: any }) => {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [isGooglePayAvailable, setIsGooglePayAvailable] = useState<boolean | null>(null);

  // Check if Google Pay is available
  useEffect(() => {
    const checkGooglePayAvailability = () => {
      // In a real implementation, you would check for Google Pay availability
      // For example:
      // if (window.google && window.google.payments && window.google.payments.api)
      
      // For our demo, we'll simulate Google Pay detection
      // Google Pay is typically available on Chrome on Android or desktop
      const isAndroid = /Android/i.test(navigator.userAgent);
      const isChrome = /Chrome/i.test(navigator.userAgent);
      
      // Simulate a delay in checking
      setTimeout(() => {
        setIsGooglePayAvailable(isChrome || isAndroid);
      }, 500);
    };

    checkGooglePayAvailability();
  }, []);

  const handleGooglePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Track form submission
    trackFormSubmission('GooglePayForm', {
      paymentMethod: 'google_pay',
      donationType: donationDetails?.type,
      amount: donationDetails?.amount,
      currency: donationDetails?.currency
    });
    
    try {
      // Set up payment request data
      const paymentData = {
        donationId: donationDetails.id,
        amount: donationDetails.amount,
        currency: donationDetails.currency,
        description: `${donationDetails.type} donation for Aafiyaa Charity Clinics`
      };
      
      // In a real implementation, we would use the Google Pay API to process payment
      // For our demo, we'll simulate a successful payment
      
      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Update donation status
      await apiRequest("POST", "/api/update-donation-status", {
        donationId: donationDetails.id,
        status: "completed",
        paymentMethod: "google_pay",
        paymentId: `googlepay-${Date.now()}`
      });
      
      // Also update case amount if applicable
      if (donationDetails.caseId) {
        try {
          await apiRequest("POST", "/api/stripe-payment-success", {
            donationId: donationDetails.id,
            paymentIntentId: `googlepay-${Date.now()}`
          });
          console.log("Case amount updated via direct notification for Google Pay", donationDetails.caseId);
        } catch (error) {
          console.error("Failed to update case amount:", error);
          // Continue with success path even if case update fails
        }
      }
      
      // Track successful payment
      trackEvent({
        category: 'Payment',
        action: 'Success',
        label: 'GooglePay',
        value: donationDetails.amount,
        attributes: {
          paymentMethod: 'google_pay',
          donationId: donationDetails.id.toString(),
          frequency: donationDetails.frequency
        }
      });
      
      toast({
        title: "Payment Successful",
        description: "Thank you for your donation via Google Pay!",
        variant: "success"
      });
      
      // Redirect to homepage after successful payment
      setTimeout(() => {
        setLocation('/');
      }, 2000);
      
    } catch (error) {
      // Track payment failure
      trackEvent({
        category: 'Payment',
        action: 'Failed',
        label: 'GooglePay',
        attributes: {
          paymentMethod: 'google_pay',
          errorMessage: 'Google Pay processing error'
        }
      });
      
      toast({
        title: "Payment Failed",
        description: "There was an issue processing your Google Pay payment.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isGooglePayAvailable === null) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isGooglePayAvailable === false) {
    return (
      <div className="bg-blue-50 border border-blue-100 rounded-md p-4 text-center">
        <p className="text-blue-800 font-medium">
          Google Pay is not available on this device or browser.
        </p>
        <p className="text-sm text-blue-600 mt-2">
          Please use Chrome or choose another payment method.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleGooglePaySubmit} className="space-y-6">
      <div className="bg-blue-50 border border-blue-100 rounded-md p-4">
        <h3 className="font-medium text-blue-800 mb-2">Google Pay Checkout</h3>
        <p className="text-sm text-blue-600">
          Quickly and securely pay with Google Pay.
        </p>
      </div>
      
      <Button 
        type="submit" 
        className="w-full py-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-800" 
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing
          </>
        ) : (
          'Pay with Google Pay'
        )}
      </Button>
    </form>
  );
};



// We no longer need a separate donor information form

export default function Payment() {
  const [clientSecret, setClientSecret] = useState("");
  const [isSubscription, setIsSubscription] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { 
    currency, 
    paymentMethod, 
    setPaymentMethod, 
    coverFees, 
    setCoverFees, 
    calculateFees 
  } = useDonation();
  const [donationDetails, setDonationDetails] = useState<any>(null);
  const [feeBreakdown, setFeeBreakdown] = useState<{
    processingFee: number;
    totalWithFees: number;
    donationAmount: number;
    feeDescription: string;
  } | null>(null);

  useEffect(() => {
    // Get donation details from session storage
    const donationData = sessionStorage.getItem('currentDonation');
    
    if (!donationData) {
      toast({
        title: "No donation information",
        description: "Please start from the donation page",
        variant: "destructive",
      });
      setLocation('/');
      return;
    }
    
    const donation = JSON.parse(donationData);
    setDonationDetails(donation);
    
    // Only create a payment intent if using Stripe
    if (paymentMethod === 'stripe') {
      // Calculate the appropriate amount based on whether fees are covered
      const fees = calculateFees(donation.amount, paymentMethod);
      const finalAmount = coverFees ? fees.totalWithFees : donation.amount;
      
      if (donation.frequency === 'one-off') {
        // For one-time payments, create a PaymentIntent
        apiRequest("POST", "/api/create-payment-intent", { 
          amount: finalAmount,
          currency: donation.currency || currency,
          donationId: donation.id,
          coverFees: coverFees
        })
          .then((res) => res.json())
          .then((data) => {
            setClientSecret(data.clientSecret);
          })
          .catch((error) => {
            toast({
              title: "Payment setup failed",
              description: "There was an error setting up the payment. Please try again.",
              variant: "destructive",
            });
            console.error("Payment intent error:", error);
          });
      } else {
        // For recurring payments, we'll start by collecting payment method
        // The actual subscription creation will happen after payment method collection
        // We still need a clientSecret but it will be used differently
        setIsSubscription(true);
        
        // Create a SetupIntent for recurring payments
        apiRequest("POST", "/api/create-setup-intent", {
          email: '',  // Will be collected in the form
          donationId: donation.id
        })
          .then((res) => res.json())
          .then((data) => {
            setClientSecret(data.clientSecret);
          })
          .catch((error) => {
            toast({
              title: "Subscription setup failed",
              description: "There was an error setting up the subscription payment. Please try again.",
              variant: "destructive",
            });
            console.error("Setup intent error:", error);
          });
      }
    }
  }, [setLocation, toast, currency, paymentMethod, coverFees, calculateFees]);
  
  // Calculate fee breakdown when donation details or payment method changes
  useEffect(() => {
    if (donationDetails && donationDetails.amount) {
      const fees = calculateFees(donationDetails.amount, paymentMethod);
      setFeeBreakdown(fees);
    }
  }, [donationDetails, paymentMethod, coverFees, calculateFees]);

  // Format frequency for display
  const formatFrequency = (frequency: string) => {
    if (frequency === 'one-off') return 'One-time';
    return frequency.charAt(0).toUpperCase() + frequency.slice(1);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow py-12 bg-gray-50">
        <div className="container mx-auto px-4 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Complete Your Donation</CardTitle>
              <CardDescription>
                Choose your preferred payment method to complete your donation
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              {donationDetails && (
                <div className="bg-gray-50 p-4 rounded-md mb-6">
                  <h3 className="font-medium text-gray-800 mb-2">Donation Summary</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Type: <span className="font-medium">{donationDetails.type.charAt(0).toUpperCase() + donationDetails.type.slice(1)}</span></p>
                    <p>Amount: <span className="font-medium">{donationDetails.currency} {donationDetails.amount}</span></p>
                    <p>Frequency: <span className="font-medium">{formatFrequency(donationDetails.frequency)}</span></p>
                    {donationDetails.destinationProject && (
                      <p>Destination: <span className="font-medium">{donationDetails.destinationProject}</span></p>
                    )}
                    {donationDetails.caseId && (
                      <p>Case ID: <span className="font-medium">{donationDetails.caseId}</span></p>
                    )}
                  </div>
                  
                  {/* Payment Fee Breakdown */}
                  {feeBreakdown && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h4 className="font-medium text-gray-800 mb-2">Payment Fee Breakdown</h4>
                      
                      {/* Fee description based on payment gateway */}
                      <div className="text-xs text-gray-500 italic mb-2">
                        {feeBreakdown.feeDescription}
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex justify-between">
                          <span>Base donation:</span>
                          <span className="font-medium">{donationDetails.currency} {donationDetails.amount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Processing fee:</span>
                          <span className={coverFees ? "font-medium" : "text-red-500 font-medium"}>
                            {donationDetails.currency} {feeBreakdown.processingFee.toFixed(2)}
                          </span>
                        </div>
                        <div className="h-px bg-gray-200 my-1"></div>
                        <div className="flex justify-between font-medium">
                          <span>You pay:</span>
                          <span>{donationDetails.currency} {coverFees 
                            ? feeBreakdown.totalWithFees.toFixed(2) 
                            : donationDetails.amount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-green-600 font-medium">
                          <span>Charity receives:</span>
                          {coverFees ? (
                            <span>{donationDetails.currency} {donationDetails.amount.toFixed(2)}</span>
                          ) : (
                            <span className="flex flex-col items-end">
                              <span>{donationDetails.currency} {donationDetails.amount.toFixed(2)}</span>
                              <span className="text-xs text-red-500 font-normal">
                                (minus {donationDetails.currency} {feeBreakdown.processingFee.toFixed(2)} fees)
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Cover Fees Option */}
                      <div className="mt-4">
                        <div className="flex justify-between items-center bg-gray-100 p-2 rounded-lg cursor-pointer" onClick={() => setCoverFees(!coverFees)}>
                          <span className="text-sm font-medium">
                            {coverFees 
                              ? "I'll cover the payment processing fees" 
                              : "I will not cover the payment processing fees"}
                          </span>
                          <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${coverFees ? "bg-primary" : "bg-gray-400"}`}>
                            <span 
                              className={`inline-block h-5 w-5 rounded-full bg-white transition-transform ${coverFees ? "translate-x-6" : "translate-x-1"}`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <h3 className="text-lg font-medium mb-4">Select Payment Method</h3>
              <PaymentMethodSelector />
              
              <div className="mt-6">
                {/* Show payment options directly, email will be collected by payment providers */}
                {paymentMethod === 'stripe' && (
                  <>
                    {!clientSecret ? (
                      <div className="flex items-center justify-center py-10">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : stripePromise ? (
                      <Elements stripe={stripePromise} options={{ 
                        clientSecret, 
                        appearance: { 
                          theme: 'stripe',
                          variables: {
                            // Customize the font to match our branding
                            fontFamily: 'system-ui, sans-serif',
                            colorPrimary: '#10b981', // Emerald-500 - match our primary brand color
                          },
                          rules: {
                            '.Label': {
                              fontWeight: '500'
                            }
                          }
                        },
                        loader: 'auto',
                        // Set payment method creation mode to manual as required by Stripe
                        paymentMethodCreation: 'manual'
                        // Note: We'll rely on server-side configuration for payment method restriction
                      }}>
                        <CheckoutForm isSubscription={isSubscription} />
                      </Elements>
                    ) : (
                      <div className="text-center py-6 text-red-500">
                        Stripe payment is not configured. Please contact the administrator.
                      </div>
                    )}
                  </>
                )}
                
                {paymentMethod === 'paypal' && donationDetails && (
                  <PayPalPayment donationDetails={donationDetails} />
                )}
                
                {paymentMethod === 'apple_pay' && donationDetails && (
                  <ApplePayment donationDetails={donationDetails} />
                )}
                
                {paymentMethod === 'google_pay' && donationDetails && (
                  <GooglePayment donationDetails={donationDetails} />
                )}
              </div>
            </CardContent>
            
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setLocation('/')}>
                Back to Home
              </Button>
            </CardFooter>
          </Card>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
