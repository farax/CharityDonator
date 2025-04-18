import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Case } from '@shared/schema';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useDonation } from '@/components/DonationContext';

export default function ActiveCases() {
  const { setType, setSelectedCase } = useDonation();
  
  // Fetch active zakaat cases
  const { data: cases, isLoading, error } = useQuery<Case[]>({
    queryKey: ['/api/active-zakaat-cases'],
  });

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

  // Format currency
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return <div className="container mx-auto px-4 py-12 text-center">Loading cases...</div>;
  }

  if (error) {
    return <div className="container mx-auto px-4 py-12 text-center">Error loading cases</div>;
  }

  return (
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
            <Card key={caseItem.id} className="h-full flex flex-col">
              <CardHeader>
                <CardTitle>{caseItem.title}</CardTitle>
                <CardDescription>Case ID: {caseItem.id}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-gray-700 mb-4">{caseItem.description}</p>
                
                <div className="space-y-2 mt-4">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-500">Collected</span>
                    <span className="font-medium text-gray-700">
                      {formatAmount(caseItem.amountCollected)} of {formatAmount(caseItem.amountRequired)}
                    </span>
                  </div>
                  <Progress 
                    value={calculateProgress(caseItem.amountCollected, caseItem.amountRequired)} 
                    className="h-2"
                  />
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
  );
}