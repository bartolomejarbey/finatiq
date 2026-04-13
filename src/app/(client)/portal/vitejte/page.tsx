"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  ChevronRight,
  ChevronLeft,
  HandHeart,
  UserCircle,
  Settings2,
  FileText,
  PartyPopper,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { usePortalForm } from "@/lib/forms/use-portal-form";
import confetti from "canvas-confetti";

const TOTAL_STEPS = 5;

const INTEREST_OPTIONS = [
  { key: "contracts_payments", label: "Přehled smluv a plateb" },
  { key: "investments", label: "Investice a majetek" },
  { key: "financial_plan", label: "Finanční plán a cíle" },
  { key: "calculators", label: "Finanční kalkulačky" },
  { key: "vault", label: "Dokumentový trezor" },
  { key: "education", label: "Vzdělávací obsah od poradce" },
] as const;

type ContractFormMode = "none" | "loan" | "insurance";

export default function ClientOnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [clientId, setClientId] = useState<string | null>(null);
  const [advisorCompanyName, setAdvisorCompanyName] = useState("");

  // Step 2 — Profile
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [isOsvc, setIsOsvc] = useState(false);

  // Step 3 — Preferences
  const [interests, setInterests] = useState<Record<string, boolean>>({
    contracts_payments: true,
    investments: false,
    financial_plan: false,
    calculators: false,
    vault: false,
    education: false,
  });
  const [familyStatus, setFamilyStatus] = useState("single");

  // Step 4 — Contract
  const [contractFormMode, setContractFormMode] = useState<ContractFormMode>("none");
  const [contractProvider, setContractProvider] = useState("");
  const [loanAmount, setLoanAmount] = useState("");
  const [loanInterestRate, setLoanInterestRate] = useState("");
  const [loanMonthlyPayment, setLoanMonthlyPayment] = useState("");
  const [insuranceType, setInsuranceType] = useState("life");
  const [insuranceMonthlyPremium, setInsuranceMonthlyPremium] = useState("");
  const [contractAdded, setContractAdded] = useState(false);
  const profileForm = usePortalForm<"firstName" | "lastName">();
  const contractForm = usePortalForm<"provider">();

  // Step 5 — Summary
  const [summary, setSummary] = useState<{
    name: string;
    preferencesCount: number;
    contractAdded: boolean;
  }>({ name: "", preferencesCount: 0, contractAdded: false });

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: client } = await supabase
        .from("clients")
        .select(
          "id, first_name, last_name, phone, email, is_osvc, onboarding_completed, advisor_id, preferences, birth_date, address"
        )
        .eq("user_id", user.id)
        .single();

      if (!client) return;
      if (client.onboarding_completed) {
        router.push("/portal");
        return;
      }

      setClientId(client.id);
      if (client.first_name) setFirstName(client.first_name);
      if (client.last_name) setLastName(client.last_name);
      if (client.phone) setPhone(client.phone);
      setEmail(client.email || user.email || "");
      if (client.birth_date) setBirthDate(client.birth_date);
      if (client.is_osvc) setIsOsvc(client.is_osvc);

      // Restore preferences if they exist
      if (client.preferences) {
        if (client.preferences.interests) {
          setInterests((prev) => ({ ...prev, ...client.preferences.interests }));
        }
        if (client.preferences.family_status) {
          setFamilyStatus(client.preferences.family_status);
        }
      }

      // Load advisor company name
      const { data: adv } = await supabase
        .from("advisors")
        .select("company_name")
        .eq("id", client.advisor_id)
        .single();
      if (adv) setAdvisorCompanyName(adv.company_name || "váš poradce");

      setInitialLoading(false);
    }
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Step handlers ──

  async function handleSaveProfile() {
    if (!clientId) return;
    if (!profileForm.validateRequired([
      { name: "firstName", value: firstName },
      { name: "lastName", value: lastName },
    ])) return;
    setLoading(true);
    const { error } = await supabase
      .from("clients")
      .update({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone || null,
        email: email || null,
        birth_date: birthDate || null,
        is_osvc: isOsvc,
      })
      .eq("id", clientId);
    if (error) {
      toast.error("Nepodařilo se uložit údaje.");
      setLoading(false);
      return;
    }
    setLoading(false);
    setStep(3);
  }

  async function handleSavePreferences() {
    if (!clientId) return;
    setLoading(true);
    const preferences = {
      interests,
      family_status: familyStatus,
    };
    const { error } = await supabase
      .from("clients")
      .update({ preferences })
      .eq("id", clientId);
    if (error) {
      toast.error("Nepodařilo se uložit preference.");
      setLoading(false);
      return;
    }
    setLoading(false);
    setStep(4);
  }

  async function handleAddContract() {
    if (!contractForm.validateRequired([{ name: "provider", value: contractProvider }])) return;
    if (!clientId) return;
    setLoading(true);

    if (contractFormMode === "loan") {
      const { error } = await supabase.from("contracts").insert({
        client_id: clientId,
        type: "loan",
        provider: contractProvider.trim(),
        status: "active",
        client_uploaded: true,
        details: {
          amount: loanAmount ? parseFloat(loanAmount) : null,
          interest_rate: loanInterestRate ? parseFloat(loanInterestRate) : null,
          monthly_payment: loanMonthlyPayment
            ? parseFloat(loanMonthlyPayment)
            : null,
        },
      });
      if (error) {
        toast.error("Nepodařilo se přidat úvěr.");
        setLoading(false);
        return;
      }
      toast.success("Úvěr byl přidán!");
    }

    if (contractFormMode === "insurance") {
      const typeMap: Record<string, string> = {
        life: "insurance_life",
        property: "insurance_property",
        vehicle: "insurance_vehicle",
      };
      const { error } = await supabase.from("contracts").insert({
        client_id: clientId,
        type: typeMap[insuranceType] || "insurance_life",
        provider: contractProvider.trim(),
        status: "active",
        client_uploaded: true,
        details: {
          monthly_premium: insuranceMonthlyPremium
            ? parseFloat(insuranceMonthlyPremium)
            : null,
        },
      });
      if (error) {
        toast.error("Nepodařilo se přidat pojištění.");
        setLoading(false);
        return;
      }
      toast.success("Pojištění bylo přidáno!");
    }

    setContractAdded(true);
    setLoading(false);
  }

  function proceedToFinish() {
    const selectedCount = Object.values(interests).filter(Boolean).length;
    setSummary({
      name: `${firstName} ${lastName}`.trim(),
      preferencesCount: selectedCount,
      contractAdded,
    });
    setStep(5);
  }

  async function handleFinish() {
    if (!clientId) return;
    setLoading(true);
    const { error } = await supabase
      .from("clients")
      .update({ onboarding_completed: true })
      .eq("id", clientId);
    if (error) {
      toast.error("Chyba při dokončení onboardingu: " + error.message);
      setLoading(false);
      return;
    }
    setLoading(false);
    confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
    setTimeout(() => router.push("/portal"), 2000);
  }

  function toggleInterest(key: string) {
    setInterests((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function resetContractForm() {
    setContractProvider("");
    setLoanAmount("");
    setLoanInterestRate("");
    setLoanMonthlyPayment("");
    setInsuranceType("life");
    setInsuranceMonthlyPremium("");
    setContractFormMode("none");
  }

  // ── Progress indicator ──

  function ProgressBar() {
    const stepIcons = [
      { icon: HandHeart, label: "Vítejte" },
      { icon: UserCircle, label: "Údaje" },
      { icon: Settings2, label: "Preference" },
      { icon: FileText, label: "Smlouva" },
      { icon: PartyPopper, label: "Hotovo" },
    ];

    return (
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {stepIcons.map((s, i) => {
            const stepNum = i + 1;
            const isCompleted = step > stepNum;
            const isCurrent = step === stepNum;
            const Icon = s.icon;

            return (
              <div key={i} className="flex flex-1 items-center">
                {/* Circle */}
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                      isCompleted
                        ? "border-blue-500 bg-blue-500 text-white"
                        : isCurrent
                          ? "border-blue-500 bg-blue-50 text-blue-600"
                          : "border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--card-text-dim)]"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  <span
                    className={`mt-1 text-[10px] font-medium ${
                      isCurrent
                        ? "text-blue-600"
                        : isCompleted
                          ? "text-blue-500"
                          : "text-[var(--card-text-dim)]"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {/* Connecting line */}
                {i < stepIcons.length - 1 && (
                  <div
                    className={`mx-1 h-0.5 flex-1 transition-all duration-300 ${
                      step > stepNum ? "bg-blue-500" : "bg-[var(--card-border)]"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Loading state ──

  if (initialLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // ── Render ──

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="w-full max-w-xl">
        <ProgressBar />

        <div className="rounded-2xl border bg-[var(--card-bg)] p-8 shadow-lg">
          {/* ═══ STEP 1: Welcome ═══ */}
          {step === 1 && (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100">
                <HandHeart className="h-8 w-8 text-blue-600" />
              </div>
              <h1 className="mb-2 text-2xl font-bold text-[var(--card-text)]">
                Dobrý den, {firstName || ""}!
              </h1>
              <p className="mb-1 text-[var(--card-text-muted)]">
                Váš finanční poradce{" "}
                <span className="font-semibold text-blue-600">
                  {advisorCompanyName}
                </span>{" "}
                vám připravil přístup do portálu.
              </p>
              <p className="mb-8 text-sm text-[var(--card-text-muted)]">
                Pojďme nastavit váš profil.
              </p>
              <Button onClick={() => setStep(2)} className="w-full" size="lg">
                Pojďme na to
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {/* ═══ STEP 2: Your details ═══ */}
          {step === 2 && (
            <div>
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                  <UserCircle className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[var(--card-text)]">
                    Vaše údaje
                  </h2>
                  <p className="text-xs text-[var(--card-text-muted)]">
                    Zkontrolujte a doplňte své kontaktní informace
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    id="onboarding-first-name"
                    label="Jméno"
                    requiredLabel
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      profileForm.clearError("firstName");
                    }}
                    placeholder="Jan"
                    ref={profileForm.registerRef("firstName")}
                    error={profileForm.errors.firstName}
                  />
                  <FormField
                    id="onboarding-last-name"
                    label="Příjmení"
                    requiredLabel
                    value={lastName}
                    onChange={(e) => {
                      setLastName(e.target.value);
                      profileForm.clearError("lastName");
                    }}
                    placeholder="Novák"
                    ref={profileForm.registerRef("lastName")}
                    error={profileForm.errors.lastName}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Telefon</Label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+420 ..."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">E-mail</Label>
                    <Input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@example.com"
                      disabled
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Datum narození (nepovinné)</Label>
                  <Input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--card-text)]">
                      Jste OSVČ?
                    </p>
                    <p className="text-xs text-[var(--card-text-muted)]">
                      Zapne modul pro evidenci příjmů a výdajů
                    </p>
                  </div>
                  <Switch checked={isOsvc} onCheckedChange={setIsOsvc} />
                </div>
              </div>

              <div className="mt-6 flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Zpět
                </Button>
                <Button onClick={handleSaveProfile} disabled={loading}>
                  {loading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Další
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ═══ STEP 3: Preferences ═══ */}
          {step === 3 && (
            <div>
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
                  <Settings2 className="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[var(--card-text)]">
                    Vaše preference
                  </h2>
                  <p className="text-xs text-[var(--card-text-muted)]">
                    Přizpůsobíme portál vašim potřebám
                  </p>
                </div>
              </div>

              {/* Interests */}
              <div className="mb-5">
                <p className="mb-3 text-sm font-medium text-[var(--card-text)]">
                  Co vás zajímá?
                </p>
                <div className="space-y-2">
                  {INTEREST_OPTIONS.map((opt) => (
                    <label
                      key={opt.key}
                      onClick={() => toggleInterest(opt.key)}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                        interests[opt.key]
                          ? "border-blue-200 bg-blue-50"
                          : "border-[var(--card-border)] hover:bg-[var(--table-hover)]"
                      }`}
                    >
                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-colors ${
                          interests[opt.key]
                            ? "border-blue-500 bg-blue-500"
                            : "border-[var(--input-border)]"
                        }`}
                      >
                        {interests[opt.key] && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </div>
                      <span className="text-sm text-[var(--card-text)]">
                        {opt.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Family status */}
              <div className="mb-2">
                <p className="mb-2 text-sm font-medium text-[var(--card-text)]">
                  Rodinný stav
                </p>
                <Select value={familyStatus} onValueChange={setFamilyStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Jednotlivec</SelectItem>
                    <SelectItem value="couple">Pár</SelectItem>
                    <SelectItem value="family">Rodina s dětmi</SelectItem>
                  </SelectContent>
                </Select>

                {(familyStatus === "couple" || familyStatus === "family") && (
                  <p className="mt-2 rounded-lg bg-blue-50 p-3 text-xs text-blue-700">
                    V budoucnu budete moci propojit partnera pro sdílený
                    přehled.
                  </p>
                )}
              </div>

              <div className="mt-6 flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Zpět
                </Button>
                <Button onClick={handleSavePreferences} disabled={loading}>
                  {loading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Další
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ═══ STEP 4: First contract ═══ */}
          {step === 4 && (
            <div>
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                  <FileText className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[var(--card-text)]">
                    První smlouva
                  </h2>
                  <p className="text-xs text-[var(--card-text-muted)]">
                    Máte nějaké úvěry nebo pojištění?
                  </p>
                </div>
              </div>

              {/* Contract added confirmation */}
              {contractAdded && (
                <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-sm font-medium text-emerald-700">
                    Smlouva byla úspěšně přidána.
                  </p>
                  <button
                    onClick={() => {
                      resetContractForm();
                      setContractAdded(false);
                    }}
                    className="mt-1 text-xs text-emerald-600 underline hover:text-emerald-800"
                  >
                    Přidat další smlouvu
                  </button>
                </div>
              )}

              {/* Contract type selector */}
              {!contractAdded && contractFormMode === "none" && (
                <div>
                  <p className="mb-4 text-sm text-[var(--card-text-muted)]">
                    Vyberte typ smlouvy, kterou chcete přidat:
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      className="h-auto flex-col gap-1 p-4"
                      onClick={() => setContractFormMode("loan")}
                    >
                      <span className="text-sm font-medium">Přidat úvěr</span>
                      <span className="text-[10px] text-[var(--card-text-dim)]">
                        Hypotéka, spotřebitelský úvěr...
                      </span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-auto flex-col gap-1 p-4"
                      onClick={() => setContractFormMode("insurance")}
                    >
                      <span className="text-sm font-medium">
                        Přidat pojištění
                      </span>
                      <span className="text-[10px] text-[var(--card-text-dim)]">
                        Životní, majetkové, vozidla...
                      </span>
                    </Button>
                  </div>
                </div>
              )}

              {/* Loan form */}
              {!contractAdded && contractFormMode === "loan" && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <FormField
                      id="onboarding-loan-provider"
                      label="Poskytovatel"
                      requiredLabel
                      value={contractProvider}
                      onChange={(e) => {
                        setContractProvider(e.target.value);
                        contractForm.clearError("provider");
                      }}
                      placeholder="Např. Česká spořitelna"
                      ref={contractForm.registerRef("provider")}
                      error={contractForm.errors.provider}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Výše úvěru (Kč)</Label>
                      <Input
                        type="number"
                        value={loanAmount}
                        onChange={(e) => setLoanAmount(e.target.value)}
                        placeholder="1 000 000"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Úroková sazba (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={loanInterestRate}
                        onChange={(e) => setLoanInterestRate(e.target.value)}
                        placeholder="5.5"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Měsíční splátka (Kč)</Label>
                    <Input
                      type="number"
                      value={loanMonthlyPayment}
                      onChange={(e) => setLoanMonthlyPayment(e.target.value)}
                      placeholder="12 000"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={resetContractForm}
                      className="flex-1"
                    >
                      Zrušit
                    </Button>
                    <Button
                      onClick={handleAddContract}
                      disabled={loading}
                      className="flex-1"
                    >
                      {loading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Přidat úvěr
                    </Button>
                  </div>
                </div>
              )}

              {/* Insurance form */}
              {!contractAdded && contractFormMode === "insurance" && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <FormField
                      id="onboarding-insurance-provider"
                      label="Poskytovatel"
                      requiredLabel
                      value={contractProvider}
                      onChange={(e) => {
                        setContractProvider(e.target.value);
                        contractForm.clearError("provider");
                      }}
                      placeholder="Např. Allianz"
                      ref={contractForm.registerRef("provider")}
                      error={contractForm.errors.provider}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Typ pojištění</Label>
                    <Select
                      value={insuranceType}
                      onValueChange={setInsuranceType}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="life">Životní pojištění</SelectItem>
                        <SelectItem value="property">
                          Majetkové pojištění
                        </SelectItem>
                        <SelectItem value="vehicle">
                          Pojištění vozidla
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Měsíční pojistné (Kč)</Label>
                    <Input
                      type="number"
                      value={insuranceMonthlyPremium}
                      onChange={(e) =>
                        setInsuranceMonthlyPremium(e.target.value)
                      }
                      placeholder="1 500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={resetContractForm}
                      className="flex-1"
                    >
                      Zrušit
                    </Button>
                    <Button
                      onClick={handleAddContract}
                      disabled={loading}
                      className="flex-1"
                    >
                      {loading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Přidat pojištění
                    </Button>
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-between">
                <Button variant="outline" onClick={() => setStep(3)}>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Zpět
                </Button>
                <div className="flex items-center gap-3">
                  {!contractAdded && (
                    <button
                      onClick={proceedToFinish}
                      className="text-sm text-[var(--card-text-muted)] underline hover:text-[var(--card-text)]"
                    >
                      Přidám později
                    </button>
                  )}
                  {contractAdded && (
                    <Button onClick={proceedToFinish}>
                      Další
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═══ STEP 5: Done ═══ */}
          {step === 5 && (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100">
                <PartyPopper className="h-8 w-8 text-emerald-600" />
              </div>
              <h1 className="mb-2 text-2xl font-bold text-[var(--card-text)]">
                Váš portál je připraven!
              </h1>
              <p className="mb-6 text-[var(--card-text-muted)]">
                Vše je nastaveno, můžete začít.
              </p>

              {/* Summary */}
              <div className="mb-6 space-y-2 rounded-xl bg-[var(--table-hover)] p-4 text-left text-sm">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span className="text-[var(--card-text)]">
                    Profil nastaven pro{" "}
                    <span className="font-medium">{summary.name}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span className="text-[var(--card-text)]">
                    {summary.preferencesCount}{" "}
                    {summary.preferencesCount === 1
                      ? "modul vybrán"
                      : summary.preferencesCount >= 2 &&
                          summary.preferencesCount <= 4
                        ? "moduly vybrány"
                        : "modulů vybráno"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span className="text-[var(--card-text)]">
                    {summary.contractAdded
                      ? "První smlouva přidána"
                      : "Smlouvy přidáte později v portálu"}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(4)}
                  className="flex-1"
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Zpět
                </Button>
                <Button
                  onClick={handleFinish}
                  disabled={loading}
                  className="flex-1"
                  size="lg"
                >
                  {loading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Přejít do portálu
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
