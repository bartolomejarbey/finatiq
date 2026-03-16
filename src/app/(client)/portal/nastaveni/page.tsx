"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    if (newPassword.length < 6) {
      toast.error("Heslo musí mít alespoň 6 znaků.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Hesla se neshodují.");
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
                <div className="space-y-1">
                  <Label className="text-xs">Jméno</Label>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Jan"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Příjmení</Label>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Novák"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Telefon</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+420 ..."
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input value={userEmail} disabled className="opacity-60" />
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
              <div className="space-y-1">
                <Label className="text-xs">Současné heslo</Label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="********"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Nové heslo</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 6 znaků"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Potvrzení hesla</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Zopakujte nové heslo"
                />
              </div>

              <Button
                onClick={handleChangePassword}
                disabled={changingPassword || !newPassword}
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
