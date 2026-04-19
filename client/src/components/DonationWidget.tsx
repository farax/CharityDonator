import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDonation } from "@/components/DonationContext";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/useCurrency";
import { apiRequest } from "@/lib/queryClient";
import CurrencySelector from "@/components/CurrencySelector";
import CaseSelector from "@/components/CaseSelector";
import BankTransferInfo from "@/components/BankTransferInfo";
import FeatureTour from "@/components/FeatureTour";
import { useFeatureTours } from "@/hooks/useFeatureTours";
import { ChevronRight } from "lucide-react";
import { trackButtonClick, trackDonation, trackEvent } from "@/lib/analytics";

type DonationMode = "general" | "islamic";

export default function DonationWidget() {
  const {
    type,
    setType,
    amount,
    setAmount,
    customAmount,
    setCustomAmount,
    isCustomAmount,
    setIsCustomAmount,
    frequency,
    setFrequency,
    currency,
    currencySymbol,
    exchangeRate,
    convertAmount,
    destinationProject,
    selectedCase,
    setSelectedCase,
    showCaseSelector,
    setShowCaseSelector,
  } = useDonation();
  
  const { features } = useFeatureTours();
  
  // Use the enhanced currency and preset amount system
  const { formatAmount, getPresetAmount } = useCurrency();

  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // UI-only mode state — does not affect what gets stored in the database
  const [mode, setMode] = useState<DonationMode>("general");
  const [islamicType, setIslamicType] = useState<"sadqah" | "zakaat" | "interest">("sadqah");

  // Sync mode + islamicType → internal type (what gets saved to DB)
  useEffect(() => {
    const effectiveType = mode === "general" ? "sadqah" : islamicType;
    setType(effectiveType);
    trackEvent({
      category: "Donation",
      action: "SelectType",
      label: effectiveType,
    });
  }, [mode, islamicType]);

  // When effective type changes to non-sadqah, reset frequency to one-off
  useEffect(() => {
    if (type !== "sadqah") {
      setFrequency("one-off");
    }
  }, [type, setFrequency]);

  const handleAmountClick = (selectedAmount: number | "custom") => {
    if (selectedAmount === "custom") {
      setIsCustomAmount(true);

      // Track custom amount click
      trackEvent({
        category: "Donation",
        action: "SelectCustomAmount",
        label: type,
      });
    } else {
      setIsCustomAmount(false);
      setAmount(selectedAmount);

      // Track predefined amount selection
      trackEvent({
        category: "Donation",
        action: "SelectAmount",
        label: `${type}-${selectedAmount}`,
        value: selectedAmount,
      });
    }
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove any non-numeric characters and leading zeros
    const value = e.target.value;
    setCustomAmount(value);

    // We don't track every keystroke to avoid too many events
  };
  
  // We're using the formatAmount function declared below

  const handleDonateClick = async () => {
    try {
      // Create a donation record
      const finalAmount = isCustomAmount ? parseFloat(customAmount) : amount;

      if (isNaN(finalAmount) || finalAmount <= 0) {
        toast({
          title: "Invalid amount",
          description: "Please enter a valid donation amount",
          variant: "destructive",
        });

        // Track validation error
        trackEvent({
          category: "Donation",
          action: "ValidationError",
          label: "InvalidAmount",
        });

        return;
      }

      // Track the donate button click
      trackButtonClick("StartDonation", {
        donationType: type,
        amount: finalAmount,
        currency: currency,
        frequency: frequency,
      });

      const donationData: any = {
        type,
        amount: finalAmount,
        currency,
        frequency,
        status: "pending",
        destinationProject,
      };

      // Add case ID if a case was selected
      if (selectedCase && type === "zakaat") {
        donationData.caseId = selectedCase.id;
      }

      const donationResponse = await apiRequest(
        "POST",
        "/api/donations",
        donationData
      );
      const donation = await donationResponse.json();

      // Track successful donation initiation
      trackEvent({
        category: "Donation",
        action: type,
        value: finalAmount,
        attributes: {
          currency,
          frequency,
          destinationProject,
          donationId: donation.id.toString(),
          // Only add caseId if it exists
          ...(selectedCase ? { caseId: selectedCase.id.toString() } : {}),
        },
      });

      // Store the donation ID in sessionStorage for the payment page
      sessionStorage.setItem(
        "currentDonation",
        JSON.stringify({
          id: donation.id,
          type,
          amount: finalAmount,
          currency,
          frequency,
          destinationProject,
          caseId: selectedCase?.id,
        })
      );

      // Navigate to the payment page
      setLocation("/payment");
    } catch (error) {
      // Track error
      trackEvent({
        category: "Donation",
        action: "Error",
        label: "APIError",
      });

      toast({
        title: "Error",
        description:
          "Failed to process your donation request. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Use the formatAmount function from the useCurrency hook

  return (
    <FeatureTour features={features}>
      <div className="container mx-auto px-4 relative -mt-24 sm:-mt-32 lg:-mt-40 mb-16 max-w-4xl">
      <Card className="rounded-lg shadow-xl overflow-hidden border" style={{ backgroundColor: '#FDFAF3', borderColor: '#D8C89A' }}>
        {/* Top accent bar */}
        <div className="h-1.5" style={{ background: 'linear-gradient(to right, #C8A850, #E8C870, #C8A850)' }} />
        <CardContent className="p-6 md:p-8">
          <h2 className="text-2xl font-bold mb-1 text-center" style={{ color: '#1C3D28' }}>
            Make a quick donation
          </h2>
          <p className="text-sm text-center mb-6" style={{ color: '#8A7A50' }}>Secure · Tax-deductible · Trusted</p>

          {/* Choice Cards — How would you like to give? */}
          <div className="mb-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#8A7A50' }}>
              How would you like to give?
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setMode("general")}
                className="text-left p-4 rounded-xl border-2 transition-all duration-150"
                style={mode === "general"
                  ? { backgroundColor: '#F0F9F4', borderColor: '#2D5A3D' }
                  : { backgroundColor: '#FDF8EE', borderColor: '#D8C89A' }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-3.5 h-3.5 rounded-full border-2 flex-shrink-0"
                    style={mode === "general"
                      ? { borderColor: '#2D5A3D', backgroundColor: '#2D5A3D' }
                      : { borderColor: '#C8A850', backgroundColor: 'white' }}
                  />
                  <span className="font-semibold text-sm" style={{ color: mode === "general" ? '#1C3D28' : '#6B5020' }}>
                    General charity
                  </span>
                </div>
                <p className="text-xs leading-relaxed pl-5" style={{ color: '#8A7A50' }}>
                  Any cause — goes to clinic operations
                </p>
              </button>

              <button
                onClick={() => setMode("islamic")}
                className="text-left p-4 rounded-xl border-2 transition-all duration-150"
                style={mode === "islamic"
                  ? { backgroundColor: '#F0F9F4', borderColor: '#2D5A3D' }
                  : { backgroundColor: '#FDF8EE', borderColor: '#D8C89A' }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-3.5 h-3.5 rounded-full border-2 flex-shrink-0"
                    style={mode === "islamic"
                      ? { borderColor: '#2D5A3D', backgroundColor: '#2D5A3D' }
                      : { borderColor: '#C8A850', backgroundColor: 'white' }}
                  />
                  <span className="font-semibold text-sm" style={{ color: mode === "islamic" ? '#1C3D28' : '#6B5020' }}>
                    Islamic giving
                  </span>
                </div>
                <p className="text-xs leading-relaxed pl-5" style={{ color: '#8A7A50' }}>
                  Zakaat, Sadqah, or interest disposal
                </p>
              </button>
            </div>
          </div>

          {/* Islamic sub-type pills */}
          {mode === "islamic" && (
            <div className="flex gap-2 mb-5 flex-wrap">
              {[
                { key: "sadqah", label: "Sadqah" },
                { key: "zakaat", label: "Zakaat" },
                { key: "interest", label: "Dispose Interest" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setIslamicType(key as "sadqah" | "zakaat" | "interest")}
                  className="px-3.5 py-1.5 rounded-lg text-sm font-medium border transition-all duration-150"
                  style={islamicType === key
                    ? { borderColor: '#2D5A3D', backgroundColor: '#F0F9F4', color: '#1C3D28' }
                    : { borderColor: '#D8C89A', backgroundColor: '#FDFAF3', color: '#6B5020' }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Context banners */}
          {mode === "general" && (
            <div className="rounded-xl px-4 py-3 text-sm mb-5 flex items-start gap-3" style={{ backgroundColor: '#F0F9F4', border: '1px solid #A8D8B8', color: '#1C3D28' }}>
              <span className="text-base mt-0.5">🏥</span>
              <p>Your donation funds <strong>clinic operations</strong> — consultations, medicines, and care for patients who cannot afford treatment.</p>
            </div>
          )}
          {mode === "islamic" && islamicType === "sadqah" && (
            <div className="rounded-xl px-4 py-3 text-sm mb-5 flex items-start gap-3" style={{ backgroundColor: '#F0F9F4', border: '1px solid #A8D8B8', color: '#1C3D28' }}>
              <span className="text-base mt-0.5">🤲</span>
              <p><strong>Sadqah</strong> is voluntary charity given freely. Recurring donations are available for ongoing reward.</p>
            </div>
          )}
          {mode === "islamic" && islamicType === "zakaat" && (
            <div className="rounded-xl px-4 py-3 text-sm mb-5 flex items-start gap-3" style={{ backgroundColor: '#FDF8EE', border: '1px solid #D8C89A', color: '#6B5020' }}>
              <span className="text-base mt-0.5">⭐</span>
              <p><strong>Zakaat</strong> is allocated to the most deserving cases. Select a specific case or let us distribute where needed most.</p>
            </div>
          )}
          {mode === "islamic" && islamicType === "interest" && (
            <div className="rounded-xl px-4 py-3 text-sm mb-5 flex items-start gap-3" style={{ backgroundColor: '#FDF8EE', border: '1px solid #D8C89A', color: '#6B5020' }}>
              <span className="text-base mt-0.5">🔄</span>
              <p>Dispose of interest (riba) funds by donating to charity without expecting reward, as a means of purification. <a href="https://islamqa.org/hanafi/muftionline/114377/" target="_blank" rel="noopener noreferrer" className="underline font-medium">View fatwa</a></p>
            </div>
          )}

          {/* Donation Form Content */}
          <div className="donation-form-content">
            {/* Destination Project Section */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-2" style={{ color: '#8A7A50' }}>
                Donate For: {destinationProject}
              </h3>

              {mode === "islamic" && islamicType === "zakaat" && (
                <div className="rounded-lg p-4 flex justify-between items-center" style={{ backgroundColor: '#FDF8EE', border: '1px solid #D8C89A' }}>
                  {selectedCase ? (
                    <div>
                      <div className="font-medium" style={{ color: '#1C3D28' }}>
                        {selectedCase.title}
                      </div>
                      <div className="text-sm mt-1" style={{ color: '#6B5020' }}>
                        {formatAmount(Math.max(0, selectedCase.amountRequired - selectedCase.amountCollected), true)} still needed
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: '#1C3D28' }}>Most deserving case</div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="transition-colors"
                    style={{ color: '#2D5A3D', borderColor: '#2D5A3D' }}
                    onClick={() => setShowCaseSelector(true)}
                  >
                    Select a Case <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Case Selector Dialog */}
              <CaseSelector
                open={showCaseSelector}
                onOpenChange={setShowCaseSelector}
              />
            </div>

            {/* Frequency Selection — visible for general giving or Islamic Sadqah */}
            {(mode === "general" || (mode === "islamic" && islamicType === "sadqah")) && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold mb-2" style={{ color: '#8A7A50' }}>
                  Payment Frequency
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { key: 'one-off', label: 'One-off', icon: (
                      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                        <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    )},
                    { key: 'weekly', label: 'Weekly', icon: (
                      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
                        <path d="M8 2v4M16 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <path d="M7 14h2M11 14h2M15 14h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    )},
                    { key: 'monthly', label: 'Monthly', icon: (
                      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
                        <path d="M8 2v4M16 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <path d="M8 15h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    )},
                  ] as { key: string; label: string; icon: React.ReactNode }[]).map(({ key, label, icon }) => {
                    const active = frequency === key;
                    return (
                      <div
                        key={key}
                        className="rounded-lg border p-3 cursor-pointer text-center transition-all"
                        style={active
                          ? { borderColor: '#2D5A3D', backgroundColor: '#F0F9F4', color: '#1C3D28' }
                          : { borderColor: '#D8C89A', backgroundColor: '#FDFAF3', color: '#6B5020' }}
                        onClick={() => setFrequency(key as "one-off" | "weekly" | "monthly")}
                      >
                        <div className="flex justify-center mb-2">{icon}</div>
                        <span className="font-medium text-sm">{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Amount Selection */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-semibold" style={{ color: '#8A7A50' }}>
                  Select Amount
                </h3>
                <div className="flex items-center">
                  <CurrencySelector />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { tier: 'tier1' as const, isCustom: false },
                  { tier: 'tier2' as const, isCustom: false },
                  { tier: 'tier3' as const, isCustom: false },
                ].map(({ tier }) => {
                  const active = !isCustomAmount && amount === getPresetAmount(tier);
                  return (
                    <button
                      key={tier}
                      className="font-semibold py-3 px-4 rounded-md border transition-all duration-200"
                      style={active
                        ? { backgroundColor: '#2D5A3D', borderColor: '#2D5A3D', color: '#F5EDD6' }
                        : { backgroundColor: '#FDFAF3', borderColor: '#D8C89A', color: '#1C3D28' }}
                      onClick={() => handleAmountClick(getPresetAmount(tier))}
                    >
                      {formatAmount(getPresetAmount(tier))}
                    </button>
                  );
                })}
                <button
                  className="font-semibold py-3 px-4 rounded-md border transition-all duration-200"
                  style={isCustomAmount
                    ? { backgroundColor: '#2D5A3D', borderColor: '#2D5A3D', color: '#F5EDD6' }
                    : { backgroundColor: '#FDFAF3', borderColor: '#D8C89A', color: '#1C3D28' }}
                  onClick={() => handleAmountClick("custom")}
                >
                  Custom
                </button>
              </div>

              {isCustomAmount && (
                <div className="mt-4">
                  <div className="flex">
                    <div className="flex items-center px-3 rounded-l-md border border-r-0" style={{ backgroundColor: '#F0F9F4', borderColor: '#D8C89A' }}>
                      <span style={{ color: '#8A7A50' }}>{currencySymbol}</span>
                    </div>
                    <input
                      type="number"
                      className="flex-1 p-3 border rounded-r-md focus:outline-none focus:ring-2"
                      style={{ backgroundColor: '#FDFAF3', borderColor: '#D8C89A', color: '#1C3D28' }}
                      placeholder="Enter amount"
                      value={customAmount}
                      onChange={handleCustomAmountChange}
                      aria-label={`Enter amount in ${currency}`}
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
                </div>
              )}
            </div>

            {/* Bank Transfer Alternative */}
            <BankTransferInfo />

            {/* Donate Button */}
            <Button
              className="w-full font-bold py-3 px-4 rounded-md transition duration-150"
              style={{ backgroundColor: '#1C3D28', color: '#F5EDD6' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#2D5A3D')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#1C3D28')}
              onClick={handleDonateClick}
              data-testid="button-donate-now"
            >
              Donate Now
            </Button>
          </div>
        </CardContent>
      </Card>
      </div>
    </FeatureTour>
  );
}
