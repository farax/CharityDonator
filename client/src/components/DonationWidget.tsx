import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDonation } from "@/components/DonationContext";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/useCurrency";
import { apiRequest } from "@/lib/queryClient";
import CurrencySelector from "@/components/CurrencySelector";
import CaseSelector from "@/components/CaseSelector";
import FeatureTour from "@/components/FeatureTour";
import { useFeatureTours } from "@/hooks/useFeatureTours";
import { ChevronRight } from "lucide-react";
import { trackButtonClick, trackDonation, trackEvent } from "@/lib/analytics";

type DonationMode = "general" | "islamic";
type PaymentPath = "card" | "bank";
type BankCountry = "au" | "pk";

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
  const { formatAmount, getPresetAmount } = useCurrency();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [mode, setMode] = useState<DonationMode>("general");
  const [islamicType, setIslamicType] = useState<"sadqah" | "zakaat" | "interest">("sadqah");
  const [paymentPath, setPaymentPath] = useState<PaymentPath>("card");
  const [bankCountry, setBankCountry] = useState<BankCountry>("au");

  useEffect(() => {
    const effectiveType = mode === "general" ? "sadqah" : islamicType;
    setType(effectiveType);
    trackEvent({ category: "Donation", action: "SelectType", label: effectiveType });
  }, [mode, islamicType]);

  useEffect(() => {
    if (type !== "sadqah") setFrequency("one-off");
  }, [type, setFrequency]);

  const handleAmountClick = (selectedAmount: number | "custom") => {
    if (selectedAmount === "custom") {
      setIsCustomAmount(true);
      trackEvent({ category: "Donation", action: "SelectCustomAmount", label: type });
    } else {
      setIsCustomAmount(false);
      setAmount(selectedAmount);
      trackEvent({ category: "Donation", action: "SelectAmount", label: `${type}-${selectedAmount}`, value: selectedAmount });
    }
  };

  const handleDonateClick = async () => {
    try {
      const finalAmount = isCustomAmount ? parseFloat(customAmount) : amount;
      if (isNaN(finalAmount) || finalAmount <= 0) {
        toast({ title: "Invalid amount", description: "Please enter a valid donation amount", variant: "destructive" });
        trackEvent({ category: "Donation", action: "ValidationError", label: "InvalidAmount" });
        return;
      }
      trackButtonClick("StartDonation", { donationType: type, amount: finalAmount, currency, frequency });
      const donationData: any = { type, amount: finalAmount, currency, frequency, status: "pending", destinationProject };
      if (selectedCase && type === "zakaat") donationData.caseId = selectedCase.id;
      const donationResponse = await apiRequest("POST", "/api/donations", donationData);
      const donation = await donationResponse.json();
      trackEvent({
        category: "Donation", action: type, value: finalAmount,
        attributes: { currency, frequency, destinationProject, donationId: donation.id.toString(), ...(selectedCase ? { caseId: selectedCase.id.toString() } : {}) },
      });
      sessionStorage.setItem("currentDonation", JSON.stringify({ id: donation.id, type, amount: finalAmount, currency, frequency, destinationProject, caseId: selectedCase?.id }));
      setLocation("/payment");
    } catch (error) {
      trackEvent({ category: "Donation", action: "Error", label: "APIError" });
      toast({ title: "Error", description: "Failed to process your donation request. Please try again.", variant: "destructive" });
    }
  };

  return (
    <FeatureTour features={features}>
      <div className="container mx-auto px-4 relative -mt-24 sm:-mt-32 lg:-mt-40 mb-16 max-w-4xl">
        <Card className="rounded-lg shadow-xl overflow-hidden border" style={{ backgroundColor: '#FDFAF3', borderColor: '#D8C89A' }}>
          <div className="h-1.5" style={{ background: 'linear-gradient(to right, #C8A850, #E8C870, #C8A850)' }} />
          <CardContent className="p-6 md:p-8">

            {/* Header */}
            <div className="mb-5">
              <h2 className="text-xl font-bold text-[#1C3D28]">Make a donation</h2>
              <p className="text-xs text-[#8A7A50] mt-0.5">Secure · Tax-deductible · Trusted</p>
            </div>

            {/* Step 1: Payment method */}
            <div className="mb-5">
              <h3 className="text-xs font-semibold text-[#8A7A50] uppercase tracking-wider mb-3">
                How would you like to pay?
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPaymentPath("card")}
                  className={`text-left p-4 rounded-xl border-2 transition-all duration-150 ${
                    paymentPath === "card"
                      ? "border-[#2D5A3D] bg-[#F0F9F4]"
                      : "border-[#D8C89A] bg-[#FDF8EE] hover:border-[#C8A850]"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${
                      paymentPath === "card" ? "border-[#2D5A3D] bg-[#2D5A3D]" : "border-[#C8A850] bg-transparent"
                    }`} />
                    <span className={`font-semibold text-sm ${paymentPath === "card" ? "text-[#1C3D28]" : "text-[#6B5020]"}`}>
                      💳 Card / PayPal
                    </span>
                  </div>
                  <p className="text-xs text-[#5A8060] pl-5">Stripe · PayPal · Apple Pay · Google Pay</p>
                </button>

                <button
                  onClick={() => setPaymentPath("bank")}
                  className={`text-left p-4 rounded-xl border-2 transition-all duration-150 ${
                    paymentPath === "bank"
                      ? "border-[#2D5A3D] bg-[#F0F9F4]"
                      : "border-[#D8C89A] bg-[#FDF8EE] hover:border-[#C8A850]"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${
                      paymentPath === "bank" ? "border-[#2D5A3D] bg-[#2D5A3D]" : "border-[#C8A850] bg-transparent"
                    }`} />
                    <span className={`font-semibold text-sm ${paymentPath === "bank" ? "text-[#1C3D28]" : "text-[#6B5020]"}`}>
                      🏦 Bank transfer
                    </span>
                  </div>
                  <p className="text-xs text-[#9A8050] pl-5">Fee-free · AU &amp; PK only</p>
                </button>
              </div>
            </div>

            {/* PATH A — Card */}
            {paymentPath === "card" && (
              <div>
                {/* Donation type */}
                <h3 className="text-xs font-semibold text-[#8A7A50] uppercase tracking-wider mb-3">
                  Donation type
                </h3>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button
                    onClick={() => setMode("general")}
                    className={`text-left p-4 rounded-xl border-2 transition-all duration-150 ${
                      mode === "general" ? "border-[#2D5A3D] bg-[#F0F9F4]" : "border-[#D8C89A] bg-[#FDF8EE] hover:border-[#C8A850]"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${
                        mode === "general" ? "border-[#2D5A3D] bg-[#2D5A3D]" : "border-[#C8A850] bg-transparent"
                      }`} />
                      <span className={`font-semibold text-sm ${mode === "general" ? "text-[#1C3D28]" : "text-[#6B5020]"}`}>
                        General charity
                      </span>
                    </div>
                    <p className="text-xs text-[#5A8060] pl-5">Any cause — clinic operations</p>
                  </button>

                  <button
                    onClick={() => setMode("islamic")}
                    className={`text-left p-4 rounded-xl border-2 transition-all duration-150 ${
                      mode === "islamic" ? "border-[#2D5A3D] bg-[#F0F9F4]" : "border-[#D8C89A] bg-[#FDF8EE] hover:border-[#C8A850]"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${
                        mode === "islamic" ? "border-[#2D5A3D] bg-[#2D5A3D]" : "border-[#C8A850] bg-transparent"
                      }`} />
                      <span className={`font-semibold text-sm ${mode === "islamic" ? "text-[#1C3D28]" : "text-[#6B5020]"}`}>
                        Islamic giving
                      </span>
                    </div>
                    <p className="text-xs text-[#9A8050] pl-5">Zakaat · Sadqah · Interest</p>
                  </button>
                </div>

                {/* Islamic sub-type pills */}
                {mode === "islamic" && (
                  <div className="flex gap-2 mb-4 flex-wrap">
                    {[
                      { key: "sadqah", label: "Sadqah" },
                      { key: "zakaat", label: "Zakaat" },
                      { key: "interest", label: "Dispose Interest" },
                    ].map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => setIslamicType(key as "sadqah" | "zakaat" | "interest")}
                        className={`px-3.5 py-1.5 rounded-lg text-sm font-medium border transition-all duration-150 ${
                          islamicType === key
                            ? "border-[#2D5A3D] bg-[#F0F9F4] text-[#1C3D28]"
                            : "border-[#D8C89A] text-[#6B5020] hover:border-[#C8A850]"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Context banners */}
                {mode === "general" && (
                  <div className="bg-[#F0F9F4] border border-[#A8D8B8] rounded-xl px-4 py-3 text-sm text-[#1C3D28] mb-4 flex items-start gap-3">
                    <span className="mt-0.5">🏥</span>
                    <p>Your gift funds <strong>clinic operations</strong> — medicines, consultations, and care for patients who cannot pay.</p>
                  </div>
                )}
                {mode === "islamic" && islamicType === "sadqah" && (
                  <div className="bg-[#F0F9F4] border border-[#A8D8B8] rounded-xl px-4 py-3 text-sm text-[#1C3D28] mb-4 flex items-start gap-3">
                    <span className="mt-0.5">🤲</span>
                    <p><strong>Sadqah</strong> is voluntary charity given freely. Recurring donations available for ongoing reward.</p>
                  </div>
                )}
                {mode === "islamic" && islamicType === "zakaat" && (
                  <div className="bg-[#FDF8EE] border border-[#D8C89A] rounded-xl px-4 py-3 text-sm text-[#6B5020] mb-4 flex items-start gap-3">
                    <span className="mt-0.5">⭐</span>
                    <p><strong>Zakaat</strong> allocated to the most deserving cases. Select a specific case or let us distribute.</p>
                  </div>
                )}
                {mode === "islamic" && islamicType === "interest" && (
                  <div className="bg-[#FDF8EE] border border-[#D8C89A] rounded-xl px-4 py-3 text-sm text-[#6B5020] mb-4 flex items-start gap-3">
                    <span className="mt-0.5">🔄</span>
                    <p>Dispose of interest (riba) funds as a means of purification. <a href="https://islamqa.org/hanafi/muftionline/114377/" target="_blank" rel="noopener noreferrer" className="underline font-medium">View fatwa</a></p>
                  </div>
                )}

                {/* Zakaat case selector */}
                {mode === "islamic" && islamicType === "zakaat" && (
                  <div className="bg-[#FDF8EE] border border-[#D8C89A] rounded-xl px-4 py-3 flex justify-between items-center mb-4">
                    {selectedCase ? (
                      <div>
                        <div className="font-medium text-sm text-[#1C3D28]">{selectedCase.title}</div>
                        <div className="text-xs text-[#8A7A50] mt-0.5">{formatAmount(Math.max(0, selectedCase.amountRequired - selectedCase.amountCollected), true)} still needed</div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-sm font-medium text-[#1C3D28]">Most deserving case</div>
                        <div className="text-xs text-[#8A7A50] mt-0.5">We'll allocate where needed most</div>
                      </div>
                    )}
                    <Button variant="outline" size="sm"
                      className="text-[#2D5A3D] border-[#A8D8B8] hover:bg-[#2D5A3D] hover:text-[#F5EDD6] text-xs"
                      onClick={() => setShowCaseSelector(true)}
                    >
                      {selectedCase ? "Change" : "Select case"} <ChevronRight className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                )}
                <CaseSelector open={showCaseSelector} onOpenChange={setShowCaseSelector} />

                {/* Frequency — only for sadqah */}
                {(mode === "general" || (mode === "islamic" && islamicType === "sadqah")) && (
                  <div className="mb-4">
                    <h3 className="text-xs font-semibold text-[#8A7A50] uppercase tracking-wider mb-2">Frequency</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { key: "one-off", label: "One-off" },
                        { key: "weekly", label: "Weekly" },
                        { key: "monthly", label: "Monthly" },
                      ].map(({ key, label }) => (
                        <button key={key} onClick={() => setFrequency(key as any)}
                          className={`py-2.5 rounded-xl border text-sm font-medium transition-all duration-150 ${
                            frequency === key
                              ? "border-[#2D5A3D] bg-[#F0F9F4] text-[#1C3D28]"
                              : "border-[#D8C89A] text-[#6B5020] hover:border-[#C8A850]"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Amount */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-xs font-semibold text-[#8A7A50] uppercase tracking-wider">Amount</h3>
                    <CurrencySelector />
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {(["tier1", "tier2", "tier3"] as const).map((tier) => (
                      <button key={tier} onClick={() => handleAmountClick(getPresetAmount(tier))}
                        className={`py-3 rounded-xl border text-sm font-bold transition-all duration-150 ${
                          !isCustomAmount && amount === getPresetAmount(tier)
                            ? "bg-[#2D5A3D] border-[#2D5A3D] text-[#F5EDD6]"
                            : "bg-[#FDFAF3] border-[#D8C89A] text-[#1C3D28] hover:border-[#C8A850]"
                        }`}
                      >
                        {formatAmount(getPresetAmount(tier))}
                      </button>
                    ))}
                    <button onClick={() => handleAmountClick("custom")}
                      className={`py-3 rounded-xl border text-sm font-bold transition-all duration-150 ${
                        isCustomAmount
                          ? "bg-[#2D5A3D] border-[#2D5A3D] text-[#F5EDD6]"
                          : "bg-[#FDFAF3] border-[#D8C89A] text-[#6B5020] hover:border-[#C8A850]"
                      }`}
                    >
                      Custom
                    </button>
                  </div>
                  {isCustomAmount && (
                    <div className="mt-3 flex">
                      <div className="bg-[#F0F9F4] flex items-center px-3 rounded-l-xl border border-r-0 border-[#D8C89A] text-[#8A7A50] text-sm">
                        {currencySymbol}
                      </div>
                      <input type="number"
                        className="flex-1 p-3 border border-[#D8C89A] rounded-r-xl bg-white text-[#1C3D28] focus:outline-none focus:ring-2 focus:ring-[#2D5A3D] text-sm"
                        placeholder="Enter amount"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        min="0.01" max="999999" step="0.01"
                      />
                    </div>
                  )}
                </div>

                {/* Donate button */}
                <Button
                  className="w-full bg-[#1C3D28] hover:bg-[#2D5A3D] text-[#F5EDD6] font-bold py-3.5 rounded-xl text-base transition-all duration-200"
                  onClick={handleDonateClick}
                  data-testid="button-donate-now"
                >
                  {frequency !== "one-off" && (mode === "general" || (mode === "islamic" && islamicType === "sadqah"))
                    ? `Set Up ${frequency.charAt(0).toUpperCase() + frequency.slice(1)} Donation`
                    : "Donate Now"}
                </Button>
                <p className="text-center text-xs text-[#8A7A50] mt-3">
                  🔒 Secure payment · ACNC registered · Tax-deductible receipt
                </p>
              </div>
            )}

            {/* PATH B — Bank transfer */}
            {paymentPath === "bank" && (
              <div>
                <h3 className="text-xs font-semibold text-[#8A7A50] uppercase tracking-wider mb-3">
                  Select your country
                </h3>
                <div className="flex gap-3 mb-5">
                  <button
                    onClick={() => setBankCountry("au")}
                    className={`px-5 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all duration-150 ${
                      bankCountry === "au"
                        ? "bg-[#2D5A3D] border-[#2D5A3D] text-[#F5EDD6]"
                        : "bg-[#FDFAF3] border-[#D8C89A] text-[#6B5020] hover:border-[#C8A850]"
                    }`}
                  >
                    🇦🇺 Australia
                  </button>
                  <button
                    onClick={() => setBankCountry("pk")}
                    className={`px-5 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all duration-150 ${
                      bankCountry === "pk"
                        ? "bg-[#2D5A3D] border-[#2D5A3D] text-[#F5EDD6]"
                        : "bg-[#FDFAF3] border-[#D8C89A] text-[#6B5020] hover:border-[#C8A850]"
                    }`}
                  >
                    🇵🇰 Pakistan
                  </button>
                </div>

                {/* AU details */}
                {bankCountry === "au" && (
                  <div className="space-y-2 mb-4">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-[#FDFAF3] border border-[#E0CFA0] rounded-xl p-3">
                        <div className="text-xs text-[#8A7A50] uppercase tracking-wider mb-1">Bank</div>
                        <div className="font-bold text-[#1C3D28] text-sm">Bendigo Bank</div>
                      </div>
                      <div className="bg-[#FDFAF3] border border-[#E0CFA0] rounded-xl p-3">
                        <div className="text-xs text-[#8A7A50] uppercase tracking-wider mb-1">Account name</div>
                        <div className="font-bold text-[#1C3D28] text-sm">Aafiyaa Ltd.</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-[#FDFAF3] border border-[#E0CFA0] rounded-xl p-3 flex justify-between items-center">
                        <div>
                          <div className="text-xs text-[#8A7A50] uppercase tracking-wider mb-1">BSB</div>
                          <div className="font-bold text-[#1C3D28]">633 000</div>
                        </div>
                        <button onClick={() => navigator.clipboard.writeText('633000')}
                          className="text-xs text-[#C8A850] font-semibold underline">Copy</button>
                      </div>
                      <div className="bg-[#FDFAF3] border border-[#E0CFA0] rounded-xl p-3 flex justify-between items-center">
                        <div>
                          <div className="text-xs text-[#8A7A50] uppercase tracking-wider mb-1">Account</div>
                          <div className="font-bold text-[#1C3D28]">234 382 190</div>
                        </div>
                        <button onClick={() => navigator.clipboard.writeText('234382190')}
                          className="text-xs text-[#C8A850] font-semibold underline">Copy</button>
                      </div>
                    </div>
                    <div className="bg-[#FDFAF3] border border-[#E0CFA0] rounded-xl p-3 flex justify-between items-center">
                      <div>
                        <div className="text-xs text-[#8A7A50] uppercase tracking-wider mb-1">PayID (fastest)</div>
                        <div className="font-bold text-[#1C3D28] tracking-wide">47 684 746 987</div>
                      </div>
                      <button onClick={() => navigator.clipboard.writeText('47684746987')}
                        className="text-xs text-[#C8A850] font-semibold underline">Copy</button>
                    </div>
                  </div>
                )}

                {/* PK details */}
                {bankCountry === "pk" && (
                  <div className="space-y-2 mb-4">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-[#FDFAF3] border border-[#E0CFA0] rounded-xl p-3">
                        <div className="text-xs text-[#8A7A50] uppercase tracking-wider mb-1">Bank</div>
                        <div className="font-bold text-[#1C3D28] text-sm">Habib Bank Limited</div>
                      </div>
                      <div className="bg-[#FDFAF3] border border-[#E0CFA0] rounded-xl p-3">
                        <div className="text-xs text-[#8A7A50] uppercase tracking-wider mb-1">Account name</div>
                        <div className="font-bold text-[#1C3D28] text-sm">Baboo Khan</div>
                      </div>
                    </div>
                    <div className="bg-[#FDFAF3] border border-[#E0CFA0] rounded-xl p-3 flex justify-between items-center">
                      <div>
                        <div className="text-xs text-[#8A7A50] uppercase tracking-wider mb-1">IBAN</div>
                        <div className="font-bold text-[#1C3D28] tracking-wide text-sm">PK07 HABB 0024430049779903</div>
                      </div>
                      <button onClick={() => navigator.clipboard.writeText('PK07HABB0024430049779903')}
                        className="text-xs text-[#C8A850] font-semibold underline ml-2 flex-shrink-0">Copy</button>
                    </div>
                  </div>
                )}

                {/* Reference note */}
                <div className="bg-[#F0F9F4] border border-[#A8D8B8] rounded-xl px-4 py-3 text-sm text-[#1C3D28] mb-4 leading-relaxed">
                  <p><strong>Reference:</strong> Please note your payment type in the transfer — e.g. <em>Sadqah</em>, <em>Zakaat</em>, or <em>Interest disposal</em>.</p>
                  <p className="mt-1"><strong>Tax receipt:</strong> Forward payment confirmation to <strong>info@aafiyaa.com</strong></p>
                </div>

                <Button
                  className="w-full bg-[#C8A850] hover:bg-[#B89840] text-[#1C3D28] font-bold py-3.5 rounded-xl text-base"
                  onClick={() => {}}
                >
                  Done — I've made the transfer
                </Button>
                <p className="text-center text-xs text-[#8A7A50] mt-3">
                  Fee-free · Your full amount reaches the clinic
                </p>
              </div>
            )}

          </CardContent>
        </Card>
      </div>
    </FeatureTour>
  );
}
