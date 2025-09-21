import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronDown, ChevronUp, Building2, Copy, CheckCircle } from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';
import { useToast } from '@/hooks/use-toast';

export default function BankTransferInfo() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { currency } = useCurrency();
  const { toast } = useToast();

  // Determine which bank details to show based on currency
  const isAustralia = currency === 'AUD';
  const isPakistan = currency === 'PKR';
  
  // Only show for Australia or Pakistan
  if (!isAustralia && !isPakistan) {
    return null;
  }

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
      toast({
        title: "Copied",
        description: `${fieldName} copied to clipboard`,
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Please copy the details manually",
        variant: "destructive",
      });
    }
  };

  // Generate a unique reference number (you can use donation ID later)
  const generateReference = () => {
    return `AAFY-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  };

  const referenceNumber = generateReference();

  const CopyButton = ({ text, fieldName }: { text: string; fieldName: string }) => (
    <Button
      variant="ghost"
      size="sm"
      className="ml-2 h-6 w-6 p-0"
      onClick={() => copyToClipboard(text, fieldName)}
    >
      {copiedField === fieldName ? (
        <CheckCircle className="h-3 w-3 text-green-600" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </Button>
  );

  return (
    <div className="mb-4">
      <Button
        variant="outline"
        className="w-full flex items-center justify-between p-3 border-blue-200 hover:border-blue-300 hover:bg-blue-50"
        onClick={() => setIsExpanded(!isExpanded)}
        data-testid="button-bank-transfer-toggle"
      >
        <div className="flex items-center">
          <Building2 className="h-4 w-4 mr-2 text-blue-600" />
          <span className="font-medium text-blue-700">
            💳 Bank Transfer Available {isAustralia ? '(Australia)' : '(Pakistan)'}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-blue-600" />
        ) : (
          <ChevronDown className="h-4 w-4 text-blue-600" />
        )}
      </Button>

      {isExpanded && (
        <Card className="mt-2 border-blue-200">
          <CardContent className="p-4">
            <div className="space-y-4">
              <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2">
                  Direct Bank Transfer Details
                </h4>
                
                {isAustralia && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-700">Bank:</span>
                      <div className="flex items-center">
                        <span className="text-sm text-blue-800">Bendigo Bank</span>
                        <CopyButton text="Bendigo Bank" fieldName="Bank Name" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-700">Account Name:</span>
                      <div className="flex items-center">
                        <span className="text-sm text-blue-800">Aafiyaa LTD</span>
                        <CopyButton text="Aafiyaa LTD" fieldName="Account Name" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-700">BSB:</span>
                      <div className="flex items-center">
                        <span className="text-sm text-blue-800 font-mono">633-000</span>
                        <CopyButton text="633-000" fieldName="BSB" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-700">Account Number:</span>
                      <div className="flex items-center">
                        <span className="text-sm text-blue-800 font-mono">123456789</span>
                        <CopyButton text="123456789" fieldName="Account Number" />
                      </div>
                    </div>
                  </div>
                )}

                {isPakistan && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-700">Bank:</span>
                      <div className="flex items-center">
                        <span className="text-sm text-blue-800">Meezan Bank</span>
                        <CopyButton text="Meezan Bank" fieldName="Bank Name" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-700">Account Name:</span>
                      <div className="flex items-center">
                        <span className="text-sm text-blue-800">Aafiyaa LTD</span>
                        <CopyButton text="Aafiyaa LTD" fieldName="Account Name" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-700">IBAN:</span>
                      <div className="flex items-center">
                        <span className="text-sm text-blue-800 font-mono">PK12MEZN0123456789012345</span>
                        <CopyButton text="PK12MEZN0123456789012345" fieldName="IBAN" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-700">Account Number:</span>
                      <div className="flex items-center">
                        <span className="text-sm text-blue-800 font-mono">0123456789012345</span>
                        <CopyButton text="0123456789012345" fieldName="Account Number" />
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-blue-300">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-700">Reference:</span>
                    <div className="flex items-center">
                      <span className="text-sm text-blue-800 font-mono bg-blue-100 px-2 py-1 rounded">
                        {referenceNumber}
                      </span>
                      <CopyButton text={referenceNumber} fieldName="Reference" />
                    </div>
                  </div>
                  <p className="text-xs text-blue-600 mt-1">
                    ⚠️ Please include this reference in your transfer description
                  </p>
                </div>
              </div>

              {/* Important Notes */}
              <div className="bg-amber-50 p-3 rounded-md border border-amber-200">
                <h5 className="font-semibold text-amber-800 mb-2">📋 Important Notes:</h5>
                <div className="space-y-2 text-sm text-amber-700">
                  <div>
                    <strong>1. Payment Identification:</strong>
                    <p>Please identify whether you are paying sadqah, zakaat, or disposing interest when making your transfer.</p>
                  </div>
                  <div>
                    <strong>2. Tax Receipt:</strong>
                    <p>If you need a receipt for tax purposes, please forward your payment proof to <strong>info@aafiyaa.com</strong></p>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                <h5 className="font-semibold text-gray-800 mb-2">🏦 Transfer Instructions:</h5>
                <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                  <li>Use your banking app or online banking</li>
                  <li>Enter the bank details above</li>
                  <li>Include the reference number in the description</li>
                  <li>Complete your transfer</li>
                  <li>Email payment proof to info@aafiyaa.com (if receipt needed)</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}