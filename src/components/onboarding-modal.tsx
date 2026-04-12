"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface OnboardingModalProps {
  open: boolean;
  onComplete: () => void;
}

export function OnboardingModal({ open, onComplete }: OnboardingModalProps) {
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [advisorId, setAdvisorId] = useState<string | null>(null);

  // Step 2
  const [companyName, setCompanyName] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  // Step 3
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [clientEmail, setClientEmail] = useState("");

  useEffect(() => {
    if (!open) return;

    async function fetchAdvisor() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: advisor } = await supabase
        .from("advisors")
        .select("id, company_name")
        .eq("user_id", user.id)
        .single();

      if (advisor) {
        setAdvisorId(advisor.id);
        if (advisor.company_name) {
          setCompanyName(advisor.company_name);
        }
      }
    }

    fetchAdvisor();
  }, [open, supabase]);

  async function handleSaveCompany() {
    if (!advisorId) return;
    setLoading(true);
    const { error } = await supabase
      .from("advisors")
      .update({ company_name: companyName })
      .eq("id", advisorId);
    setLoading(false);

    if (error) {
      toast.error("Nepodařilo se uložit firmu.");
      return;
    }
    setStep(3);
  }

  async function handleCreateClient() {
    if (!advisorId) return;
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("Vyplňte jméno a příjmení.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("clients").insert({
      advisor_id: advisorId,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: clientEmail.trim() || null,
    });
    setLoading(false);

    if (error) {
      toast.error("Nepodařilo se vytvořit klienta.");
      return;
    }
    toast.success("Klient vytvořen!");
    setStep(4);
  }

  async function handleFinish() {
    if (!advisorId) return;
    setLoading(true);
    await supabase
      .from("advisors")
      .update({ onboarding_completed: true })
      .eq("id", advisorId);
    setLoading(false);
    onComplete();
  }

  const totalSteps = 4;

  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Step indicator dots */}
        <div className="flex justify-center gap-2 pt-2">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              className={`h-2 w-2 rounded-full transition-colors ${
                i + 1 === step ? "bg-blue-600" : "bg-slate-200"
              }`}
            />
          ))}
        </div>

        {/* Step 1: Welcome */}
        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle>Vítejte ve Finatiq!</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-slate-600">
              Pojďme nastavit váš účet.
            </p>
            <DialogFooter>
              <Button onClick={() => setStep(2)}>Další</Button>
            </DialogFooter>
          </>
        )}

        {/* Step 2: Company setup */}
        {step === 2 && (
          <>
            <DialogHeader>
              <DialogTitle>Nastavení firmy</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company-name">Název firmy</Label>
                <Input
                  id="company-name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Vaše firma s.r.o."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-email">Kontaktní email</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="info@firma.cz"
                />
              </div>
            </div>
            <DialogFooter className="flex justify-between sm:justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                Zpět
              </Button>
              <Button onClick={handleSaveCompany} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Další
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Step 3: First client */}
        {step === 3 && (
          <>
            <DialogHeader>
              <DialogTitle>Vytvořte prvního klienta</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="first-name">Jméno</Label>
                <Input
                  id="first-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jan"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last-name">Příjmení</Label>
                <Input
                  id="last-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Novák"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-email">Email</Label>
                <Input
                  id="client-email"
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="jan@novak.cz"
                />
              </div>
            </div>
            <DialogFooter className="flex justify-between sm:justify-between">
              <Button variant="outline" onClick={() => setStep(4)}>
                Přeskočit
              </Button>
              <Button onClick={handleCreateClient} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Vytvořit
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Step 4: Done */}
        {step === 4 && (
          <>
            <DialogHeader>
              <DialogTitle>Hotovo!</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-slate-600">
              Jste připraveni.
            </p>
            <DialogFooter>
              <Button onClick={handleFinish} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Přejít na dashboard
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
