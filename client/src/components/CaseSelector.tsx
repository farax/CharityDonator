import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDonation } from '@/components/DonationContext';
import { Case } from '@shared/schema';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CaseSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CaseSelector({ open, onOpenChange }: CaseSelectorProps) {
  const { selectedCase, setSelectedCase } = useDonation();
  const [currentIndex, setCurrentIndex] = useState(0);

  // Fetch active zakaat cases
  const { data: cases = [], isLoading } = useQuery<Case[]>({
    queryKey: ['/api/active-zakaat-cases'],
    enabled: open, // Only fetch when dialog is open
  });

  useEffect(() => {
    // Reset current index when dialog opens
    if (open) {
      setCurrentIndex(0);
    }
  }, [open]);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < cases.length - 1 ? prev + 1 : prev));
  };

  const handleSelect = () => {
    if (cases.length > 0) {
      setSelectedCase(cases[currentIndex]);
      onOpenChange(false);
    }
  };

  const currentCase = cases[currentIndex];
  
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-2xl font-bold text-center">Select a Case</DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center p-8 h-64">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : cases.length === 0 ? (
          <div className="text-center p-8 h-64 flex flex-col items-center justify-center">
            <p className="text-gray-600 mb-2">No cases available at this time.</p>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        ) : (
          <>
            <div className="px-6 py-4">
              <div className="rounded-lg overflow-hidden mb-4 h-48 bg-gray-200">
                {currentCase?.imageUrl && (
                  <img 
                    src={currentCase.imageUrl} 
                    alt={currentCase.title}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              
              <h3 className="text-xl font-semibold mb-2">{currentCase?.title}</h3>
              <p className="text-gray-600 mb-4">{currentCase?.description}</p>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Required</p>
                  <p className="text-lg font-semibold text-primary">
                    {currentCase && formatAmount(currentCase.amountRequired)}
                  </p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Collected</p>
                  <p className="text-lg font-semibold text-green-600">
                    {currentCase && formatAmount(currentCase.amountCollected)}
                  </p>
                </div>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                {currentCase && (
                  <div 
                    className="bg-primary h-2.5 rounded-full" 
                    style={{ 
                      width: `${Math.min(
                        (currentCase.amountCollected / currentCase.amountRequired) * 100, 
                        100
                      )}%` 
                    }}
                  ></div>
                )}
              </div>
            </div>
            
            <DialogFooter className="bg-gray-50 px-6 py-4">
              <div className="flex justify-between w-full items-center">
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={handlePrevious}
                    disabled={currentIndex === 0}
                  >
                    <ChevronLeft size={20} />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={handleNext}
                    disabled={currentIndex === cases.length - 1}
                  >
                    <ChevronRight size={20} />
                  </Button>
                  <span className="text-sm text-gray-500 py-2 px-3">
                    {currentIndex + 1} of {cases.length}
                  </span>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSelect}>
                    Select This Case
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}