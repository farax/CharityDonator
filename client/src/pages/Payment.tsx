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
        // If we need to do additional confirmation, we would handle it here
        if (subscriptionData.clientSecret) {
          const { error: confirmError } = await stripe.confirmCardPayment(subscriptionData.clientSecret);
          
          if (confirmError) {
            throw new Error(confirmError.message);
          }
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
          description: "Thank you for your donation!",
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

  // PayPal configuration options
  const paypalOptions = {
    clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID, // Use PayPal client ID from environment variables
    currency: donationDetails.currency.toLowerCase()
  };
  
  // Warn if PayPal client ID is missing
  if (!import.meta.env.VITE_PAYPAL_CLIENT_ID) {
    console.warn('Missing required PayPal key: VITE_PAYPAL_CLIENT_ID');
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
    }).then(() => {
      toast({
        title: isRecurring ? "Subscription Successful" : "Payment Successful",
        description: isRecurring
          ? `Thank you for your recurring donation via PayPal! You'll be charged ${donationDetails.currency} ${donationDetails.amount} ${donationDetails.frequency}.`
          : "Thank you for your donation via PayPal!",
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
      
      <PayPalScriptProvider options={paypalOptions}>
        <PayPalButtons
          style={{ 
            layout: "vertical",
            color: "blue",
            shape: "rect",
            label: "donate"
          }}
          disabled={isLoading}
          fundingSource={undefined}
          createOrder={(data, actions) => {
            // Check if this should be a recurring payment
            const isRecurring = donationDetails.frequency !== 'one-off';
            
            if (!isRecurring) {
              // For one-time payments, create a regular order
              return actions.order.create({
                intent: "CAPTURE",
                purchase_units: [
                  {
                    amount: {
                      value: donationDetails.amount.toString(),
                      currency_code: donationDetails.currency.toUpperCase()
                    },
                    description: `${donationDetails.type} donation for Aafiyaa Charity Clinics`
                  }
                ],
                application_context: {
                  shipping_preference: "NO_SHIPPING"
                }
              });
            } else {
              // For recurring payments, we'd create a subscription
              // Note: This is a simplified example as PayPal subscription requires a different approach
              // In a production app, we would use PayPal Subscriptions API
              
              // For now, we'll use the regular order flow but indicate it's a subscription
              return actions.order.create({
                intent: "CAPTURE",
                purchase_units: [
                  {
                    amount: {
                      value: donationDetails.amount.toString(),
                      currency_code: donationDetails.currency.toUpperCase()
                    },
                    description: `${donationDetails.type} ${donationDetails.frequency} donation for Aafiyaa Charity Clinics`
                  }
                ],
                application_context: {
                  shipping_preference: "NO_SHIPPING",
                  user_action: "CONTINUE"
                }
              });
            }
          }}
          onApprove={async (data, actions) => {
            setIsLoading(true);
            if (actions.order) {
              return actions.order.capture().then((details) => {
                handlePayPalSuccess(details);
                setIsLoading(false);
              });
            }
            setIsLoading(false);
            return Promise.resolve();
          }}
          onError={handlePayPalError}
          onCancel={() => {
            toast({
              title: "Payment Cancelled",
              description: "Your PayPal payment was cancelled.",
              variant: "default",
            });
          }}
        />
      </PayPalScriptProvider>
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
                        appearance: { theme: 'stripe' },
                        loader: 'auto',
                        // @ts-ignore - Stripe types may not include this yet
                        businessName: 'Aafiyaa Ltd.'
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
