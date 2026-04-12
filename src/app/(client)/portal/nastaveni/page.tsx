"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { User, Lock, BellRing, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usePortalForm } from "@/lib/forms/use-portal-form";

interface ClientRow {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  notification_preferences: Record<string, boolean> | null;
}

const DEFAULT_PREFERENCES: Record<string, boolean> = {
  new_documents: true,
  payments: true,
  advisor_messages: true,
  reminders: true,
};

const NOTIFICATION_LABELS: Record<string, string> = {
  new_documents: "Nové dokumenty",
  payments: "Platby",
  advisor_messages: "Zprávy od poradce",
  reminders: "Připomínky",
};

export default function NastaveniPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [client, setClient] = useState<ClientRow | null>(null);
  const [userEmail, setUserEmail] = useState("");

  // Profile fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  // Password fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const passwordForm = usePortalForm<"newPassword" | "confirmPassword">();

  // Notification preferences
  const [preferences, setPreferences] =
    useState<Record<string, boolean>>(DEFAULT_PREFERENCES);

  useEffect(() => {
    async function fetchData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUserEmail(user.email || "");

      const { data: clientData } = await supabase
        .from("clients")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (clientData) {
        setClient(clientData);
        setFirstName(clientData.first_name || "");
        setLastName(clientData.last_name || "");
        setPhone(clientData.phone || "");
        setPreferences(
          clientData.notification_preferences || DEFAULT_PREFERENCES
        );
      }
      setLoading(false);
    }
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSaveProfile() {
    if (!client?.id) return;
    setSaving(true);
    const { error } = await supabase
      .from("clients")
      .update({
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        phone: phone.trim() || null,
      })
      .eq("id", client.id);
    setSaving(false);
    if (error) {
      toast.error("Chyba při ukládání: " + error.message);
    } else {
      toast.success("Profil uložen.");
    }
  }

  async function handleChangePassword() {
    if (!passwordForm.validateRequired([
      { name: "newPassword", value: newPassword },
      { name: "confirmPassword", value: confirmPassword },
    ])) return;
    if (newPassword.length < 6) {
      passwordForm.setFieldError("newPassword", "Heslo musí mít alespoň 6 znaků.");
      return;
    }
    if (newPassword !== confirmPassword) {
      passwordForm.setFieldError("confirmPassword", "Hesla se neshodují.");
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    setChangingPassword(false);
    if (error) {
      toast.error("Chyba při změně hesla: " + error.message);
    } else {
      toast.success("Heslo bylo změněno.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  }

  async function handleTogglePreference(key: string, checked: boolean) {
    if (!client?.id) return;
    const updated = { ...preferences, [key]: checked };
    setPreferences(updated);
    const { error } = await supabase
      .from("clients")
      .update({ notification_preferences: updated })
      .eq("id", client.id);
    if (error) {
      toast.error("Chyba při ukládání notifikací.");
      // revert
      setPreferences((prev) => ({ ...prev, [key]: !checked }));
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl p-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-6 text-2xl font-bold gradient-text">Nastavení</h1>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">
            <User className="h-4 w-4" />
            Profil
          </TabsTrigger>
          <TabsTrigger value="password">
            <Lock className="h-4 w-4" />
            Heslo
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <BellRing className="h-4 w-4" />
            Notifikace
          </TabsTrigger>
        </TabsList>

        {/* Profil */}
        <TabsContent value="profile">
          <div className="mt-4 rounded-xl border bg-[var(--card-bg)] p-6 shadow-sm">
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  id="settings-first-name"
                  label="Jméno"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jan"
                />
                <FormField
                  id="settings-last-name"
                  label="Příjmení"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Novák"
                />
              </div>

              <FormField
                id="settings-phone"
                label="Telefon"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+420 ..."
              />

              <div className="space-y-1">
                <FormField id="settings-email" label="Email" value={userEmail} disabled className="opacity-60" />
                <p className="text-[10px] text-[var(--card-text-dim)]">
                  Email nelze změnit.
                </p>
              </div>

              <Button
                onClick={handleSaveProfile}
                disabled={saving}
                size="sm"
              >
                {saving && (
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                )}
                Uložit profil
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Heslo */}
        <TabsContent value="password">
          <div className="mt-4 rounded-xl border bg-[var(--card-bg)] p-6 shadow-sm">
            <div className="space-y-5">
              <FormField
                id="settings-current-password"
                label="Současné heslo"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="********"
              />

              <div className="space-y-1">
                <FormField
                  id="settings-new-password"
                  label="Nové heslo"
                  requiredLabel
                  type="password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    passwordForm.clearError("newPassword");
                  }}
                  placeholder="Min. 6 znaků"
                  ref={passwordForm.registerRef("newPassword")}
                  error={passwordForm.errors.newPassword}
                />
              </div>

              <div className="space-y-1">
                <FormField
                  id="settings-confirm-password"
                  label="Potvrzení hesla"
                  requiredLabel
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    passwordForm.clearError("confirmPassword");
                  }}
                  placeholder="Zopakujte nové heslo"
                  ref={passwordForm.registerRef("confirmPassword")}
                  error={passwordForm.errors.confirmPassword}
                />
              </div>

              <Button
                onClick={handleChangePassword}
                disabled={changingPassword}
                size="sm"
              >
                {changingPassword && (
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                )}
                Změnit heslo
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Notifikace */}
        <TabsContent value="notifications">
          <div className="mt-4 rounded-xl border bg-[var(--card-bg)] p-6 shadow-sm">
            <p className="mb-4 text-sm text-[var(--card-text-muted)]">
              Zvolte, která oznámení chcete dostávat.
            </p>
            <div className="space-y-4">
              {Object.entries(NOTIFICATION_LABELS).map(([key, label]) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-lg border p-4 hover:shadow-sm transition-all"
                >
                  <div>
                    <p className="text-sm font-medium text-[var(--card-text)]">
                      {label}
                    </p>
                  </div>
                  <Switch
                    checked={preferences[key] ?? true}
                    onCheckedChange={(checked) =>
                      handleTogglePreference(key, checked)
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
