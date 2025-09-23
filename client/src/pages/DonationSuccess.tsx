import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Mail, FileText, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  donationId?: number;
}

export default function DonationSuccess() {
  const [, navigate] = useLocation();
  const [donationDetails, setDonationDetails] = useState<DonationDetails | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Get donation details from URL search params or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const sessionData = localStorage.getItem('donationSuccess');
    
    if (sessionData) {
      try {
        const details = JSON.parse(sessionData);
        setDonationDetails(details);
        // Keep session data for potential PDF download
      } catch (error) {
        console.error('Error parsing donation details:', error);
      }
    }
  }, []);

  const handleDownloadReceipt = async () => {
    if (!donationDetails?.donationId) {
      toast({
        title: "Download Error",
        description: "Receipt is not available for download yet. Please try again in a few minutes.",
        variant: "destructive",
      });
      return;
    }

    setIsDownloading(true);
    try {
      const response = await fetch(`/api/download-receipt/${donationDetails.donationId}`);
      
      if (!response.ok) {
        throw new Error('Receipt not found or not ready yet');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `aafiyaa-receipt-${donationDetails.donationId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Receipt Downloaded",
        description: "Your donation receipt has been downloaded successfully.",
        variant: "success",
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Error",
        description: "Receipt is being generated. Please try again in a few minutes or check your email.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

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

            {/* Receipt Information - Only show if email was provided */}
            {donationDetails.hasReceiptData && (
              <div className="bg-blue-50 rounded-lg p-6">
                <div className="flex items-start space-x-3">
                  <FileText className="h-6 w-6 text-blue-600 mt-1" />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-blue-900 mb-2">Receipt & Tax Information</h3>
                    <ul className="space-y-2 text-blue-800 mb-4">
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
                  
                  {/* Download Receipt Button */}
                  <Button 
                    onClick={handleDownloadReceipt}
                    disabled={isDownloading}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    size="sm"
                  >
                    {isDownloading ? (
                      <>
                        <Download className="h-4 w-4 mr-2 animate-spin" />
                        Preparing Download...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Download PDF Receipt
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
            )}

            {/* Navigation Options */}
            <div className="text-center bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">What would you like to do next?</h3>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  onClick={() => navigate('/')}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  Return to Home
                </Button>
                <Link href="/active-cases">
                  <Button variant="outline">
                    View More Cases
                  </Button>
                </Link>
                <Button 
                  variant="outline"
                  onClick={() => navigate('/payment')}
                >
                  Make Another Donation
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}