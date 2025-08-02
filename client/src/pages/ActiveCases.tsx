import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { Case } from '@shared/schema';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useDonation } from '@/components/DonationContext';
import { useCurrency } from '@/hooks/useCurrency';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function ActiveCases() {
  const { setType, setSelectedCase } = useDonation();
  const queryClient = useQueryClient();
  const [location] = useLocation();
  
  // Use the currency hook for proper currency formatting and conversion
  const { 
    currency, 
    currencySymbol, 
    formatAmount: formatCurrencyAmount,
    convertAmount
  } = useCurrency();
  
  // Fetch active zakaat cases
  const { data: cases, isLoading, error } = useQuery<Case[]>({
    queryKey: ['/api/active-zakaat-cases'],
    staleTime: 10000, // Consider data stale after 10 seconds
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });

  // Check if we returned from a payment page (potential donation complete)
  useEffect(() => {
    // If navigating to this page from another page, refresh the case data
    const refreshCases = async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/active-zakaat-cases'] });
    };
    
    refreshCases();
    
    // Also set up a refresh interval to periodically check for updates
    const intervalId = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['/api/active-zakaat-cases'] });
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(intervalId);
  }, [queryClient, location]);

  // Scroll to specific case if hash is present in URL
  useEffect(() => {
    if (cases && window.location.hash) {
      const hash = window.location.hash.substring(1); // Remove the #
      const element = document.getElementById(hash);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.style.border = '2px solid #10b981';
          element.style.borderRadius = '8px';
          setTimeout(() => {
            element.style.border = '';
            element.style.borderRadius = '';
          }, 3000);
        }, 100);
      }
    }
  }, [cases]);

  // Handle donate button click for a specific case
  const handleDonateClick = (caseItem: Case) => {
    setType('zakaat');
    setSelectedCase(caseItem);
  };

  // Calculate percentage of amount collected
  const calculateProgress = (collected: number, required: number) => {
    const percentage = (collected / required) * 100;
    return Math.min(percentage, 100); // Cap at 100%
  };

  // Format and convert currency
  const formatAmount = (amount: number) => {
    // First convert from AUD to current currency
    const convertedAmount = convertAmount(amount);
    // Then format with proper currency symbol
    return formatCurrencyAmount(convertedAmount);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow">
          <div className="container mx-auto px-4 py-12 text-center">Loading cases...</div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow">
          <div className="container mx-auto px-4 py-12 text-center">Error loading cases</div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-12">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Active Cases</h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              These are the active cases that need your support. Your donations can make a real difference in someone's life.
            </p>
          </div>

          {cases && cases.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {cases.map((caseItem) => (
                <Card key={caseItem.id} className="h-full flex flex-col" id={`case-${caseItem.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <CardTitle className="flex-1">{caseItem.title}</CardTitle>
                      <div className="flex gap-2 flex-wrap">
                        <Badge 
                          variant="secondary" 
                          className="bg-green-100 text-green-800 border-green-200 font-medium"
                        >
                          ✓ Zakaat Eligible
                        </Badge>
                        {caseItem.recurringAllowed && (
                          <Badge 
                            variant="secondary" 
                            className="bg-blue-100 text-blue-800 border-blue-200 font-medium"
                          >
                            🔄 Recurring Available
                          </Badge>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const url = new URL(window.location.href);
                            url.hash = `case-${caseItem.id}`;
                            navigator.clipboard.writeText(url.toString());
                          }}
                          className="h-6 px-2 text-xs"
                          title="Copy direct link to this case"
                        >
                          🔗
                        </Button>
                      </div>
                    </div>
                    <CardDescription>Case ID: {caseItem.id}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-gray-700 mb-4">{caseItem.description}</p>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-blue-800">
                        <strong>For proof of case:</strong> Contact us at{' '}
                        <a href="mailto:info@aafiyaa.com" className="text-blue-600 hover:underline">
                          info@aafiyaa.com
                        </a>{' '}
                        OR leave your email/number in the chat at the bottom right of the page.
                      </p>
                    </div>
                    
                    <div className="space-y-2 mt-4">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-gray-500">Progress</span>
                        <span className="font-medium text-gray-700">
                          {formatAmount(caseItem.amountCollected)} raised
                        </span>
                      </div>
                      <Progress 
                        value={calculateProgress(caseItem.amountCollected, caseItem.amountRequired)} 
                        className="h-2"
                      />
                      <div className="flex justify-between text-sm mt-1">
                        <span className="font-medium text-gray-500">Still needed</span>
                        <span className="font-medium text-gray-700 text-right">
                          {formatAmount(Math.max(0, caseItem.amountRequired - caseItem.amountCollected))}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Link href="/">
                      <Button 
                        className="w-full bg-primary hover:bg-teal-600"
                        onClick={() => handleDonateClick(caseItem)}
                      >
                        Donate to this case
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-xl text-gray-600">No active cases available at the moment.</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}