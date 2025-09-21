import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ChevronDown, ChevronUp, Building2, Copy, CheckCircle, Banknote, Files } from 'lucide-react';
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


  const CopyButton = ({ text, fieldName }: { text: string; fieldName: string }) => (
    <Button
      variant="secondary"
      size="icon"
      className="h-8 w-8 rounded-full"
      onClick={() => copyToClipboard(text, fieldName)}
    >
      {copiedField === fieldName ? (
        <CheckCircle className="h-4 w-4 text-green-600" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </Button>
  );

  const copyAllDetails = async () => {
    let allDetails = '';
    if (isAustralia) {
      allDetails = `Bank: Bendigo Bank
Account Title: Aafiyaa Ltd.
BSB: 633000
Account Number: 234382190
PayID: 47 684 746 987`;
    } else if (isPakistan) {
      allDetails = `Bank: Meezan Bank
Account Title: Aafiyaa Ltd.
IBAN: PK12MEZN0123456789012345
Account Number: 0123456789012345`;
    }
    
    await copyToClipboard(allDetails, 'All bank details');
  };

  return (
    <div className="mb-6">
      {/* Conspicuous Callout Banner */}
      <Card 
        className="w-full cursor-pointer transition-all duration-200 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30 hover:border-primary/50 hover:shadow-[0_0_0_3px_rgba(59,130,246,0.15)] animate-[pulse_1.5s_ease-out_1]"
        onClick={() => setIsExpanded(!isExpanded)}
        data-testid="button-bank-transfer-toggle"
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-full">
                <Banknote className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-lg text-primary">Bank Transfer Available</h3>
                  <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
                    {isAustralia ? '🇦🇺 Australia' : '🇵🇰 Pakistan'}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">Fast, fee-free for large donations</p>
              </div>
            </div>
            <div className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
              <ChevronDown className="h-5 w-5 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expanded Bank Details */}
      {isExpanded && (
        <Card className="mt-4 border-gray-200 shadow-lg">
          <CardContent className="p-6">
            {/* Header with Copy All Button */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-gray-600" />
                <h4 className="text-xl font-bold text-gray-900">
                  {isAustralia ? '🇦🇺' : '🇵🇰'} Bank Transfer Details
                </h4>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={copyAllDetails}
                className="gap-2"
              >
                <Files className="h-4 w-4" />
                Copy All Details
              </Button>
            </div>

            {/* Bank Details Grid */}
            <div className="space-y-4">
              {isAustralia && (
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <dt className="text-sm font-medium text-gray-600">Bank</dt>
                    <dd className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                      <span className="text-lg font-semibold text-gray-900">Bendigo Bank</span>
                      <CopyButton text="Bendigo Bank" fieldName="Bank Name" />
                    </dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-sm font-medium text-gray-600">Account Title</dt>
                    <dd className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                      <span className="text-lg font-semibold text-gray-900">Aafiyaa Ltd.</span>
                      <CopyButton text="Aafiyaa Ltd." fieldName="Account Title" />
                    </dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-sm font-medium text-gray-600">BSB</dt>
                    <dd className="flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <span className="text-xl font-mono font-bold text-blue-900 tracking-wider">633000</span>
                      <CopyButton text="633000" fieldName="BSB" />
                    </dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-sm font-medium text-gray-600">Account Number</dt>
                    <dd className="flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <span className="text-xl font-mono font-bold text-blue-900 tracking-wider">234382190</span>
                      <CopyButton text="234382190" fieldName="Account Number" />
                    </dd>
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <dt className="text-sm font-medium text-gray-600">PayID (Quick Transfer)</dt>
                    <dd className="flex items-center justify-between bg-green-50 p-3 rounded-lg border border-green-200">
                      <span className="text-xl font-mono font-bold text-green-900 tracking-wider">47 684 746 987</span>
                      <CopyButton text="47 684 746 987" fieldName="PayID" />
                    </dd>
                  </div>
                </dl>
              )}

              {isPakistan && (
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <dt className="text-sm font-medium text-gray-600">Bank</dt>
                    <dd className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                      <span className="text-lg font-semibold text-gray-900">Meezan Bank</span>
                      <CopyButton text="Meezan Bank" fieldName="Bank Name" />
                    </dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-sm font-medium text-gray-600">Account Title</dt>
                    <dd className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                      <span className="text-lg font-semibold text-gray-900">Aafiyaa Ltd.</span>
                      <CopyButton text="Aafiyaa Ltd." fieldName="Account Title" />
                    </dd>
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <dt className="text-sm font-medium text-gray-600">IBAN</dt>
                    <dd className="flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <span className="text-lg font-mono font-bold text-blue-900 tracking-wider">PK12MEZN0123456789012345</span>
                      <CopyButton text="PK12MEZN0123456789012345" fieldName="IBAN" />
                    </dd>
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <dt className="text-sm font-medium text-gray-600">Account Number</dt>
                    <dd className="flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <span className="text-lg font-mono font-bold text-blue-900 tracking-wider">0123456789012345</span>
                      <CopyButton text="0123456789012345" fieldName="Account Number" />
                    </dd>
                  </div>
                </dl>
              )}
            </div>

            <Separator className="my-6" />

            {/* Important Notes */}
            <Alert>
              <AlertDescription>
                <div className="space-y-2">
                  <p><strong>💰 Payment Identification:</strong> Please identify whether you are paying sadqah, zakaat, or disposing interest when making your transfer.</p>
                  <p><strong>📧 Tax Receipt:</strong> For tax receipts, forward your payment proof to <strong>info@aafiyaa.com</strong></p>
                </div>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}