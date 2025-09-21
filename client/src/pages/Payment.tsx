import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, HelpCircle, CreditCard } from 'lucide-react';
// Removed Tooltip import - using HTML title for tooltips
import { useDonation } from '@/components/DonationContext';
import PaymentMethodSelector from '@/components/PaymentMethodSelector';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// PayPal SDK removed temporarily while organization account is under review
// import { 
//   PayPalScriptProvider, 
//   PayPalButtons,
//   FUNDING
// } from '@paypal/react-paypal-js';
import { SiPaypal } from 'react-icons/si';
import { trackButtonClick, trackEvent, trackFormSubmission } from '@/lib/analytics';

// Utility function for debouncing
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

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
const CheckoutForm = ({ isSubscription = false, stripePromise }: { isSubscription?: boolean; stripePromise: any }) => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { coverFees, calculateFees } = useDonation();
  const [isLoading, setIsLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState("");
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [email, setEmail] = useState('');
  const [linkAuthEmail, setLinkAuthEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
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

  // Validation helpers for optional receipt
  const hasEmail = linkAuthEmail && linkAuthEmail.trim() && linkAuthEmail.includes('@') && linkAuthEmail.includes('.');
  const hasName = name && name.trim() && name.length > 2;
  const wantsReceipt = hasEmail || hasName;
  
  // If they want a receipt (either field filled), both fields are required and valid
  const missingFields = [];
  if (wantsReceipt && !hasEmail) missingFields.push('email address');
  if (wantsReceipt && !hasName) missingFields.push('full name');
  
  const isFormValid = !wantsReceipt || (hasEmail && hasName);

  useEffect(() => {
    // Mount Stripe Elements when we have a client secret
    if (showPaymentForm && clientSecret && stripePromise) {
      const mountElements = async () => {
        const stripe = await stripePromise;
        if (!stripe) return;
        
        const elements = stripe.elements({ clientSecret });
        
        // Mount Link Auth Element
        const linkAuthContainer = document.getElementById('link-auth');
        if (linkAuthContainer && !linkAuthContainer.hasChildNodes()) {
          try {
            const linkAuth = elements.create('linkAuthentication');
            linkAuth.on('change', (event: any) => {
              const email = event.value.email;
              if (email) {
                setLinkAuthEmail(email);
                console.log('[LINK-AUTH] Email captured:', email);
              } else {
                setLinkAuthEmail('');
              }
            });
            linkAuth.mount('#link-auth');
            console.log('[LINK-AUTH] Element mounted in tax receipt section');
          } catch (error) {
            console.log('[LINK-AUTH] Element creation skipped (may already exist)');
          }
        }
        
        // Mount Payment Element
        const paymentContainer = document.getElementById('payment-element');
        if (paymentContainer && !paymentContainer.hasChildNodes()) {
          try {
            const paymentElement = elements.create('payment', {
              layout: {
                type: 'accordion',
                defaultCollapsed: false,
                radios: false,
                spacedAccordionItems: false
              }
            });
            paymentElement.mount('#payment-element');
            console.log('[PAYMENT-ELEMENT] Element mounted');
          } catch (error) {
            console.log('[PAYMENT-ELEMENT] Element creation skipped (may already exist)');
          }
        }
      };
      
      mountElements();
    }
  }, [showPaymentForm, clientSecret, stripePromise]);

  // Helper function to handle successful payments (both regular and anonymous)
  const handlePaymentSuccess = async (paymentIntent: any, email: string, fullName: string) => {
    // Get billing details from Stripe and our form (optional for receipt)
    const paymentMethod = typeof paymentIntent.payment_method === 'string' 
      ? null 
      : paymentIntent.payment_method;
    const billingDetails = paymentMethod?.billing_details || {};
    const paymentEmail = email || billingDetails?.email || '';
    const paymentName = fullName || billingDetails?.name || '';
    
    // Only use receipt data if both email and name are provided and valid
    const hasReceiptData = paymentEmail && paymentName && paymentEmail.includes('@') && paymentEmail.includes('.') && paymentName.length > 2;
    console.log('[PAYMENT-SUCCESS] Receipt data status:', { 
      hasReceiptData, 
      email: paymentEmail || '(empty)', 
      name: paymentName || '(empty)' 
    });
    
    // Parse name into first and last name
    const nameParts = paymentName.trim().split(' ');
    const paymentFirstName = nameParts[0] || '';
    const paymentLastName = nameParts.slice(1).join(' ') || '';
    
    console.log('[PAYMENT-SUCCESS] Donor details:', { 
      email: paymentEmail || '(empty)', 
      name: paymentName || '(empty)',
      firstName: paymentFirstName || '(empty)',
      lastName: paymentLastName || '(empty)',
      anonymous: !hasReceiptData
    });
    
    // Update donation status manually to ensure it's marked completed
    try {
      if (paymentIntent && donationDetails?.id) {
        await apiRequest("POST", "/api/update-donation-status", {
          donationId: donationDetails.id,
          status: "completed",
          paymentMethod: "stripe",
          paymentId: paymentIntent.id,
          email: hasReceiptData ? paymentEmail : null,
          name: hasReceiptData ? paymentName : null,
          firstName: hasReceiptData ? paymentFirstName : null,
          lastName: hasReceiptData ? paymentLastName : null,
          skipReceipt: !hasReceiptData
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
      description: hasReceiptData 
        ? "Thank you for your generous donation! Your receipt will be emailed to you." 
        : "Thank you for your generous anonymous donation!",
      variant: "success",
    });
    
    // Store donation details for success page
    const successData = {
      amount: donationDetails.amount,
      currency: donationDetails.currency,
      type: donationDetails.type,
      frequency: donationDetails.frequency,
      email: paymentEmail,
      name: paymentName,
      caseId: donationDetails.caseId,
      caseTitle: donationDetails.caseTitle,
      destinationProject: donationDetails.destinationProject,
      donationId: donationDetails.id
    };
    localStorage.setItem('donationSuccess', JSON.stringify(successData));
    
    // Redirect to success page after successful payment
    setTimeout(() => {
      setLocation('/donation-success');
    }, 2000);
  };

  const createPaymentAndShowForm = async () => {
    if (!donationDetails) return;
    
    setIsLoading(true);
    
    try {
      const fees = calculateFees(donationDetails.amount, 'stripe');
      const finalAmount = coverFees ? fees.totalWithFees : donationDetails.amount;
      
      if (isSubscription) {
        // For recurring payments, create SetupIntent
        const response = await apiRequest("POST", "/api/create-setup-intent", {
          donationId: donationDetails.id
        });
        const data = await response.json();
        setClientSecret(data.clientSecret);
      } else {
        // For one-time payments, create PaymentIntent
        const response = await apiRequest("POST", "/api/create-payment-intent", {
          amount: finalAmount,
          currency: donationDetails.currency,
          donationId: donationDetails.id
        });
        const data = await response.json();
        setClientSecret(data.clientSecret);
      }
      
      setShowPaymentForm(true);
      
    } catch (error: any) {
      console.error('[PAYMENT-CREATE] Error creating payment:', error);
      toast({
        title: "Payment setup failed",
        description: "There was an error setting up the payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!showPaymentForm) {
      return createPaymentAndShowForm();
    }

    const stripe = await stripePromise;
    if (!stripe) {
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
        const elements = await stripe.elements({ clientSecret });
        
        // First submit the Elements form to validate card details
        const { error: submitError } = await elements.submit();
        if (submitError) {
          throw new Error(submitError.message);
        }
        
        // 1. Confirm the SetupIntent with the collected payment method
        const { error: confirmError, setupIntent } = await stripe.confirmSetup({
          elements,
          confirmParams: {
            return_url: window.location.origin, // Not used but required
          },
          redirect: 'if_required'
        });
        
        if (confirmError) {
          throw new Error(confirmError.message);
        }
        
        if (!setupIntent || !setupIntent.payment_method) {
          throw new Error('Failed to collect payment method');
        }
        
        // 2. Create a subscription with the payment method
        const response = await apiRequest("POST", "/api/create-subscription", {
          donationId: donationDetails.id,
          amount: donationDetails.amount,
          currency: donationDetails.currency,
          email: email,
          name: name,
          paymentMethodId: typeof setupIntent.payment_method === 'string' ? setupIntent.payment_method : setupIntent.payment_method.id,
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
              payment_method: typeof setupIntent.payment_method === 'string' ? setupIntent.payment_method : setupIntent.payment_method.id
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
        
        // Store donation details for success page
        const successData = {
          amount: donationDetails.amount,
          currency: donationDetails.currency,
          type: donationDetails.type,
          frequency: donationDetails.frequency,
          email: email,
          name: name,
          caseId: donationDetails.caseId,
          caseTitle: donationDetails.caseTitle,
          destinationProject: donationDetails.destinationProject,
          donationId: donationDetails.id
        };
        localStorage.setItem('donationSuccess', JSON.stringify(successData));
        
        // Redirect to success page after successful setup
        setTimeout(() => {
          setLocation('/donation-success');
        }, 2000);
        
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
      try {
        const elements = await stripe.elements({ clientSecret });
        
        // Confirm the payment with the Elements form
        const { error, paymentIntent } = await stripe.confirmPayment({
          elements,
          redirect: 'if_required',
          confirmParams: {
            return_url: `${window.location.origin}/donation-success`,
          },
        });

        if (error) {
          console.error('[PAYMENT-SUBMIT] Payment confirmation failed:', error);
          throw new Error(error.message || 'Payment confirmation failed');
        }

        console.log('[PAYMENT-SUBMIT] Payment confirmed successfully:', paymentIntent.id);
        await handlePaymentSuccess(paymentIntent, linkAuthEmail, name);

      } catch (error: any) {
        console.error('[PAYMENT-SUBMIT] Payment process failed:', error);
        
        // Track payment failure
        trackEvent({
          category: 'Payment',
          action: 'Failed',
          label: error.message || 'Payment error',
          attributes: {
            paymentMethod: 'stripe',
            errorMessage: error.message || 'Unknown error'
          }
        });
        
        toast({
          title: "Payment Failed",
          description: error.message || "There was an issue processing your payment. Please try again.",
          variant: "destructive",
        });
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
          
        </div>
      )}
      
      {/* Show payment form only after PaymentIntent is created */}
      {showPaymentForm && (
        <div id="payment-element" className="mb-6"></div>
      )}
      
      {/* If payment form is not shown yet, show setup message */}
      {!showPaymentForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h4 className="text-lg font-medium text-blue-800 mb-2">
            Ready to complete your donation?
          </h4>
          <p className="text-blue-600 mb-4">
            Click below to proceed with secure payment processing. Your PaymentIntent will be created only when you're ready to pay.
          </p>
        </div>
      )}
      
      {/* Link Authentication Element for email + Name field - moved to bottom */}
      <div className="bg-blue-50 p-4 rounded-md mb-4 border border-blue-200">
        <h3 className="font-medium text-blue-800 mb-2">📧 Tax Receipt (Optional)</h3>
        <div className="bg-blue-100 p-3 rounded-md mb-3 border border-blue-300">
          <p className="text-sm font-medium text-blue-800 mb-1">💡 Want a receipt for tax claims or personal records?</p>
          <p className="text-sm text-blue-700">Fill in the email and name fields below to receive an official PDF receipt via email. Leave blank to donate anonymously.</p>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-blue-700 mb-1">Email Address</label>
            <div id="link-auth"></div>
          </div>
          
          <div>
            <label htmlFor="donor-name" className="block text-sm font-medium text-blue-700 mb-1">Full Name</label>
            <input
              type="text"
              id="donor-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 border border-blue-300 rounded-md text-sm"
              placeholder="John Doe"
            />
          </div>
        </div>
        
        {/* Validation message */}
        {wantsReceipt && !isFormValid && (
          <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded-md">
            <p className="text-sm text-orange-700">
              📋 For receipt generation, please fill in the missing {missingFields.length === 1 ? 'field' : 'fields'}: {missingFields.join(' and ')}
            </p>
          </div>
        )}
        
        {!wantsReceipt && (
          <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-700">
              ✅ Anonymous donation - no receipt will be generated
            </p>
          </div>
        )}
        
        {/* Show helpful message if fields have content but aren't valid */}
        {(linkAuthEmail && !hasEmail) || (name && !hasName) ? (
          <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-md flex items-center justify-between">
            <p className="text-sm text-yellow-700">
              💡 Complete both fields for receipt, or clear both for anonymous donation
            </p>
            <button
              type="button"
              onClick={() => {
                setLinkAuthEmail('');
                setName('');
                // Clear the Link Auth element
                const linkAuthContainer = document.getElementById('link-auth');
                if (linkAuthContainer) {
                  linkAuthContainer.innerHTML = '';
                }
              }}
              className="text-xs text-yellow-800 underline hover:no-underline"
            >
              Clear fields
            </button>
          </div>
        ) : null}
      </div>

      <Button 
        type="submit" 
        className="w-full py-3" 
        disabled={isLoading || (!showPaymentForm && wantsReceipt && !isFormValid)}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {showPaymentForm ? 'Processing' : 'Setting up payment...'}
          </>
        ) : !showPaymentForm ? (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Complete Donation
          </>
        ) : !isFormValid ? (
          "Please complete receipt fields above"
        ) : (
          isSubscription ? 'Set Up Recurring Donation' : 'Complete Donation'
        )}
      </Button>
    </form>
  );
};

// Component for PayPal payment (currently disabled)
const PayPalPayment = ({ donationDetails }: { donationDetails: any }) => {
  const { toast } = useToast();
  
  return (
    <div className="space-y-6">
      <div className="w-full">
        <div className="p-8 border border-gray-200 rounded-lg bg-gray-50 text-center">
          <SiPaypal className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">PayPal Payments Temporarily Unavailable</h3>
          <p className="text-gray-500 mb-4">
            Our PayPal integration is currently under review by PayPal. Please use credit card payment instead.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              const { setPaymentMethod } = useDonation();
              setPaymentMethod('stripe');
              toast({
                title: "Payment method changed",
                description: "Switched to credit card payment",
                variant: "info"
              });
            }}
          >
            Switch to Credit Card
          </Button>
        </div>
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
  const [editableAmount, setEditableAmount] = useState<string>("");
  const [isEditingAmount, setIsEditingAmount] = useState(false);
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
    setEditableAmount(donation.amount.toString());
    
    // No need to check for existing PaymentIntents since we create them only on final submission
    
    // Set subscription flag for recurring payments
    if (donation.frequency !== 'one-off') {
      setIsSubscription(true);
    }
  }, [setLocation, toast]);
  
  // Calculate fee breakdown when donation details or payment method changes
  useEffect(() => {
    if (donationDetails && donationDetails.amount) {
      const fees = calculateFees(donationDetails.amount, paymentMethod);
      setFeeBreakdown(fees);
    }
  }, [donationDetails, paymentMethod, coverFees, calculateFees]);

  // Amount updates are now much simpler since we don't need to update PaymentIntents
  // PaymentIntents are only created when the user clicks "Complete Donation"

  // Handle amount update
  const handleAmountUpdate = async () => {
    const newAmount = parseFloat(editableAmount);
    
    if (!newAmount || newAmount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid donation amount",
        variant: "destructive",
      });
      return;
    }

    // Update donation details
    const updatedDonation = { ...donationDetails, amount: newAmount };
    setDonationDetails(updatedDonation);
    
    // Update session storage
    sessionStorage.setItem('currentDonation', JSON.stringify(updatedDonation));
    
    // Update the donation in the backend
    try {
      await apiRequest("POST", "/api/update-donation-amount", {
        donationId: donationDetails.id,
        amount: newAmount
      });
    } catch (error) {
      console.error("Failed to update donation amount:", error);
    }
    
    // Recreate payment intent with new amount if using Stripe
    if (paymentMethod === 'stripe') {
      const fees = calculateFees(newAmount, paymentMethod);
      const finalAmount = coverFees ? fees.totalWithFees : newAmount;
      
      try {
        // Clear the old client secret first to force re-render
        setClientSecret("");
        
        const response = await apiRequest("POST", "/api/create-payment-intent", { 
          amount: finalAmount,
          currency: donationDetails.currency || currency,
          donationId: donationDetails.id,
          coverFees: coverFees
        });
        const data = await response.json();
        
        // Set the new client secret after a brief delay to ensure proper re-initialization
        setTimeout(() => {
          setClientSecret(data.clientSecret);
        }, 100);
        
        console.log(`Payment intent updated for new amount: ${finalAmount} ${donationDetails.currency}`);
      } catch (error) {
        toast({
          title: "Payment update failed",
          description: "There was an error updating the payment amount",
          variant: "destructive",
        });
        console.error("Payment intent update error:", error);
      }
    }
    
    setIsEditingAmount(false);
    
    toast({
      title: "Amount updated",
      description: `Donation amount updated to ${donationDetails.currency} ${newAmount.toFixed(2)}`,
      variant: "success"
    });
  };

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
                    <div className="flex items-center justify-between">
                      <span>Amount:</span>
                      {isEditingAmount ? (
                        <div className="flex items-center gap-2">
                          <div className="flex">
                            <span className="bg-gray-100 flex items-center px-2 rounded-l-md border border-r-0 border-gray-300 text-sm">
                              {donationDetails.currency}
                            </span>
                            <input
                              type="number"
                              className="w-20 p-1 border border-gray-300 rounded-r-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                              value={editableAmount}
                              onChange={(e) => setEditableAmount(e.target.value)}
                              min="0.01"
                              max="999999"
                              step="0.01"
                              onInput={(e) => {
                                const target = e.target as HTMLInputElement;
                                if (target.value.length > 6) {
                                  target.value = target.value.slice(0, 6);
                                }
                              }}
                            />
                          </div>
                          <Button 
                            size="sm" 
                            onClick={handleAmountUpdate}
                            className="h-6 px-2 text-xs"
                          >
                            Save
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setIsEditingAmount(false);
                              setEditableAmount(donationDetails.amount.toString());
                            }}
                            className="h-6 px-2 text-xs"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{donationDetails.currency} {donationDetails.amount}</span>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setIsEditingAmount(true)}
                            className="h-6 px-2 text-xs"
                          >
                            Edit
                          </Button>
                        </div>
                      )}
                    </div>
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
                      
                      {/* Fee description with tooltip */}
                      <div className="text-xs text-gray-500 mb-2">
                        <div className="flex items-center gap-1">
                          <p className="font-medium">Payment processing fees: 3.5% + A$0.30</p>
                          <div className="relative group">
                            <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                            <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-2 bg-gray-800 text-white text-xs rounded shadow-lg w-60 z-50">
                              This is an approximate charge the payment gateway (stripe) charges aafiyaa for managing payments. If stripe ends up charging less than the fee you provided, the excess amount would be used as Sadaqah
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex justify-between">
                          <span>Base donation:</span>
                          <span className="font-medium">{donationDetails.currency} {donationDetails.amount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="flex items-center gap-1">
                            Processing fee:
                            <div className="relative group">
                              <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                              <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-2 bg-gray-800 text-white text-xs rounded shadow-lg w-60 z-50">
                                This is an approximate charge the payment gateway (stripe) charges aafiyaa for managing payments. If stripe ends up charging less than the fee you provided, the excess amount would be used as Sadaqah
                              </div>
                            </div>
                          </span>
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
                          <span>{donationDetails.currency} {donationDetails.amount.toFixed(2)}</span>
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
                    {stripePromise ? (
                      <CheckoutForm isSubscription={isSubscription} stripePromise={stripePromise} />
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
