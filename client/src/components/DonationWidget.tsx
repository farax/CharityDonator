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
import { ChevronRight } from "lucide-react";
import { trackButtonClick, trackDonation, trackEvent } from "@/lib/analytics";

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
  
  // Use the enhanced currency and preset amount system
  const { formatAmount, getPresetAmount } = useCurrency();

  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // When donation type changes, update frequency if needed
  useEffect(() => {
    if (type !== "sadqah") {
      setFrequency("one-off");
    }
  }, [type, setFrequency]);

  const handleDonationTypeChange = (newType: string) => {
    const typedValue = newType as "zakaat" | "sadqah" | "interest";
    setType(typedValue);

    // Track donation type selection
    trackEvent({
      category: "Donation",
      action: "SelectType",
      label: typedValue,
    });
  };

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
    <div className="container mx-auto px-4 relative -mt-24 sm:-mt-32 lg:-mt-40 mb-16 max-w-4xl">
      <Card className="bg-white rounded-lg shadow-xl overflow-hidden">
        <CardContent className="p-6 md:p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            Make a quick donation
          </h2>

          {/* Donation Type Tabs */}
          <div className="flex flex-wrap border-b border-gray-200 mb-6">
            <button
              className={`px-4 py-2 font-semibold text-sm sm:text-base ${
                type === "sadqah"
                  ? "text-primary bg-blue-50 rounded-t-lg border-b-2 border-primary"
                  : "text-gray-600 hover:text-primary"
              }`}
              onClick={() => handleDonationTypeChange("sadqah")}
            >
              Sadqah
            </button>
            <button
              className={`px-4 py-2 font-semibold text-sm sm:text-base ${
                type === "zakaat"
                  ? "text-primary bg-blue-50 rounded-t-lg border-b-2 border-primary"
                  : "text-gray-600 hover:text-primary"
              }`}
              onClick={() => handleDonationTypeChange("zakaat")}
            >
              Zakaat
            </button>
            <button
              className={`px-4 py-2 font-semibold text-sm sm:text-base ${
                type === "interest"
                  ? "text-primary bg-blue-50 rounded-t-lg border-b-2 border-primary"
                  : "text-gray-600 hover:text-primary"
              }`}
              onClick={() => handleDonationTypeChange("interest")}
            >
              Dispose Interest
            </button>
          </div>

          {/* Donation Form Content */}
          <div className="donation-form-content">
            {/* Destination Project Section */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Donate For: {destinationProject}
              </h3>

              {type === "zakaat" && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex justify-between items-center">
                  {selectedCase ? (
                    <div>
                      <div className="font-medium text-gray-800">
                        {selectedCase.title}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {formatAmount(Math.max(0, selectedCase.amountRequired - selectedCase.amountCollected), true)} still needed
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-700">Most deserving case</div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-primary border-primary hover:bg-primary hover:text-white"
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

            {/* Frequency Selection (Only visible for Sadqah) */}
            {type === "sadqah" && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                  Payment Frequency
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div
                    className={`rounded-lg border p-3 cursor-pointer text-center transition-all ${
                      frequency === "one-off"
                        ? "border-primary bg-primary/10 ring-2 ring-primary shadow-md"
                        : "border-gray-200 hover:border-primary hover:bg-primary-50"
                    }`}
                    onClick={() => setFrequency("one-off")}
                  >
                    <div className="flex justify-center mb-2">
                      <svg
                        className={`w-6 h-6 ${
                          frequency === "one-off"
                            ? "text-primary"
                            : "text-gray-600"
                        }`}
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <circle
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                        <path
                          d="M12 8v8M8 12h8"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                    <span
                      className={`font-medium ${
                        frequency === "one-off"
                          ? "text-primary"
                          : "text-gray-700"
                      }`}
                    >
                      One-off
                    </span>
                  </div>

                  <div
                    className={`rounded-lg border p-3 cursor-pointer text-center transition-all ${
                      frequency === "weekly"
                        ? "border-primary bg-primary/10 ring-2 ring-primary shadow-md"
                        : "border-gray-200 hover:border-primary hover:bg-primary-50"
                    }`}
                    onClick={() => setFrequency("weekly")}
                  >
                    <div className="flex justify-center mb-2">
                      <svg
                        className={`w-6 h-6 ${
                          frequency === "weekly"
                            ? "text-primary"
                            : "text-gray-600"
                        }`}
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <rect
                          x="3"
                          y="4"
                          width="18"
                          height="16"
                          rx="2"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                        <path
                          d="M8 2v4M16 2v4M3 10h18"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                        <path
                          d="M7 14h2M11 14h2M15 14h2"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                    <span
                      className={`font-medium ${
                        frequency === "weekly"
                          ? "text-primary"
                          : "text-gray-700"
                      }`}
                    >
                      Weekly
                    </span>
                  </div>

                  <div
                    className={`rounded-lg border p-3 cursor-pointer text-center transition-all ${
                      frequency === "monthly"
                        ? "border-primary bg-primary/10 ring-2 ring-primary shadow-md"
                        : "border-gray-200 hover:border-primary hover:bg-primary-50"
                    }`}
                    onClick={() => setFrequency("monthly")}
                  >
                    <div className="flex justify-center mb-2">
                      <svg
                        className={`w-6 h-6 ${
                          frequency === "monthly"
                            ? "text-primary"
                            : "text-gray-600"
                        }`}
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <rect
                          x="3"
                          y="4"
                          width="18"
                          height="16"
                          rx="2"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                        <path
                          d="M8 2v4M16 2v4M3 10h18"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                        <path
                          d="M8 15h8"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                    <span
                      className={`font-medium ${
                        frequency === "monthly"
                          ? "text-primary"
                          : "text-gray-700"
                      }`}
                    >
                      Monthly
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Amount Selection */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-semibold text-gray-700">
                  Select Amount
                </h3>
                <div className="flex items-center">
                  <CurrencySelector />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  className={`${
                    !isCustomAmount && amount === getPresetAmount('tier1')
                      ? "bg-primary text-white border-primary-600 shadow-md"
                      : "bg-blue-50 hover:bg-blue-100 border-blue-100 text-primary"
                  } 
                    font-semibold py-3 px-4 rounded-md border transition-all duration-200`}
                  onClick={() => handleAmountClick(getPresetAmount('tier1'))}
                >
                  {formatAmount(getPresetAmount('tier1'))}
                </button>
                <button
                  className={`${
                    !isCustomAmount && amount === getPresetAmount('tier2')
                      ? "bg-primary text-white border-primary-600 shadow-md"
                      : "bg-blue-50 hover:bg-blue-100 border-blue-100 text-primary"
                  } 
                    font-semibold py-3 px-4 rounded-md border transition-all duration-200`}
                  onClick={() => handleAmountClick(getPresetAmount('tier2'))}
                >
                  {formatAmount(getPresetAmount('tier2'))}
                </button>
                <button
                  className={`${
                    !isCustomAmount && amount === getPresetAmount('tier3')
                      ? "bg-primary text-white border-primary-600 shadow-md"
                      : "bg-blue-50 hover:bg-blue-100 border-blue-100 text-primary"
                  } 
                    font-semibold py-3 px-4 rounded-md border transition-all duration-200`}
                  onClick={() => handleAmountClick(getPresetAmount('tier3'))}
                >
                  {formatAmount(getPresetAmount('tier3'))}
                </button>
                <button
                  className={`${
                    isCustomAmount
                      ? "bg-primary text-white border-primary-600 shadow-md"
                      : "bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-700"
                  } 
                    font-semibold py-3 px-4 rounded-md border transition-all duration-200`}
                  onClick={() => handleAmountClick("custom")}
                >
                  Custom
                </button>
              </div>

              {isCustomAmount && (
                <div className="mt-4">
                  <div className="flex">
                    <div className="bg-gray-100 flex items-center px-3 rounded-l-md border border-r-0 border-gray-300">
                      <span className="text-gray-500">{currencySymbol}</span>
                    </div>
                    <input
                      type="number"
                      className="flex-1 p-3 border border-gray-300 rounded-r-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Enter amount"
                      value={customAmount}
                      onChange={handleCustomAmountChange}
                      aria-label={`Enter amount in ${currency}`}
                      min="0.01"
                      step="0.01"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Donate Button */}
            <Button
              className="w-full bg-primary hover:bg-teal-600 text-white font-bold py-3 px-4 rounded-md transition duration-150"
              onClick={handleDonateClick}
            >
              Donate Now
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
