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

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  console.warn('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}

const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY 
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY) 
  : null;

// The actual checkout form with Stripe Elements
const CheckoutForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
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

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin,
      },
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Payment Successful",
        description: "Thank you for your donation!",
      });
      
      // Redirect to homepage after successful payment
      setTimeout(() => {
        setLocation('/');
      }, 2000);
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
      {donationDetails && (
        <div className="bg-gray-50 p-4 rounded-md mb-4">
          <h3 className="font-medium text-gray-800 mb-2">Donation Summary</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p>Type: <span className="font-medium">{donationDetails.type.charAt(0).toUpperCase() + donationDetails.type.slice(1)}</span></p>
            <p>Amount: <span className="font-medium">{donationDetails.currency} {donationDetails.amount}</span></p>
            <p>Frequency: <span className="font-medium">{formatFrequency(donationDetails.frequency)}</span></p>
          </div>
        </div>
      )}
      
      <PaymentElement />
      
      <Button 
        type="submit" 
        className="w-full py-3" 
        disabled={!stripe || isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing
          </>
        ) : (
          'Complete Donation'
        )}
      </Button>
    </form>
  );
};

export default function Payment() {
  const [clientSecret, setClientSecret] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { currency, setCurrency } = useDonation();

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
    
    // Create PaymentIntent as soon as the page loads
    apiRequest("POST", "/api/create-payment-intent", { 
      amount: donation.amount,
      currency: donation.currency || currency,
      donationId: donation.id
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
  }, [setLocation, toast, currency]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow py-12 bg-gray-50">
        <div className="container mx-auto px-4 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Complete Your Donation</CardTitle>
              <CardDescription>
                Enter your payment information below to complete your donation
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              {!clientSecret ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : stripePromise ? (
                <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
                  <CheckoutForm />
                </Elements>
              ) : (
                <div className="text-center py-6 text-red-500">
                  Stripe payment is not configured. Please contact the administrator.
                </div>
              )}
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
