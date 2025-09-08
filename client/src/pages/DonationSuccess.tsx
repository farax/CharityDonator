import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Mail, FileText, Clock } from "lucide-react";

interface DonationDetails {
  amount: number;
  currency: string;
  type: "zakaat" | "sadqah" | "interest";
  frequency: "one-off" | "weekly" | "monthly";
  email: string;
  name?: string;
  caseId?: number;
  caseTitle?: string;
  destinationProject?: string;
}

export default function DonationSuccess() {
  const [, navigate] = useLocation();
  const [countdown, setCountdown] = useState(10);
  const [donationDetails, setDonationDetails] = useState<DonationDetails | null>(null);

  useEffect(() => {
    // Get donation details from URL search params or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const sessionData = localStorage.getItem('donationSuccess');
    
    if (sessionData) {
      try {
        const details = JSON.parse(sessionData);
        setDonationDetails(details);
        // Clear the session data after reading
        localStorage.removeItem('donationSuccess');
      } catch (error) {
        console.error('Error parsing donation details:', error);
      }
    }

    // Start countdown timer
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  if (!donationDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="h-16 w-16 text-teal-600 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h1>
              <p className="text-gray-600 mb-4">Your donation has been processed successfully.</p>
              <Button onClick={() => navigate('/')} className="bg-teal-600 hover:bg-teal-700">
                Return to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const getDonationTypeLabel = (type: string) => {
    switch (type) {
      case 'zakaat': return 'Zakaat';
      case 'sadqah': return 'Sadqah';
      case 'interest': return 'Interest';
      default: return type;
    }
  };

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case 'one-off': return 'One-time donation';
      case 'weekly': return 'Weekly recurring';
      case 'monthly': return 'Monthly recurring';
      default: return frequency;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center bg-teal-600 text-white rounded-t-lg">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-20 w-20" />
          </div>
          <CardTitle className="text-3xl font-bold">Donation Successful!</CardTitle>
          <p className="text-teal-100 mt-2">Thank you for your generous contribution</p>
        </CardHeader>
        
        <CardContent className="pt-6">
          {/* Donation Details */}
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Donation Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-600">Amount</span>
                  <p className="text-2xl font-bold text-teal-600">
                    {formatAmount(donationDetails.amount, donationDetails.currency)}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Type</span>
                  <p className="text-lg font-semibold">{getDonationTypeLabel(donationDetails.type)}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Frequency</span>
                  <p className="text-lg font-semibold">{getFrequencyLabel(donationDetails.frequency)}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Email</span>
                  <p className="text-lg font-semibold truncate">{donationDetails.email}</p>
                </div>
              </div>
              
              {donationDetails.caseTitle && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <span className="text-sm text-gray-600">Supporting Case</span>
                  <p className="text-lg font-semibold">{donationDetails.caseTitle}</p>
                </div>
              )}
              
              {donationDetails.destinationProject && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <span className="text-sm text-gray-600">Destination</span>
                  <p className="text-lg font-semibold">{donationDetails.destinationProject}</p>
                </div>
              )}
            </div>

            {/* Receipt Information */}
            <div className="bg-blue-50 rounded-lg p-6">
              <div className="flex items-start space-x-3">
                <FileText className="h-6 w-6 text-blue-600 mt-1" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">Receipt & Tax Information</h3>
                  <ul className="space-y-2 text-blue-800">
                    <li className="flex items-center space-x-2">
                      <Mail className="h-4 w-4" />
                      <span>A PDF receipt will be emailed to you within a few minutes</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <FileText className="h-4 w-4" />
                      <span>This receipt is valid for tax deduction purposes</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4" />
                      <span>Keep this receipt for your financial records</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Auto Redirect Notice */}
            <div className="text-center bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-center space-x-2 text-gray-600">
                <Clock className="h-5 w-5" />
                <span>Automatically redirecting to homepage in {countdown} seconds</span>
              </div>
              <div className="mt-3 space-x-4">
                <Button 
                  onClick={() => navigate('/')}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  Return to Home Now
                </Button>
                <Link href="/active-cases">
                  <Button variant="outline">
                    View More Cases
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}