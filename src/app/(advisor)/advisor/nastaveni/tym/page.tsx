"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, UserPlus, Shield, Trash2, Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";

/* ── Types ── */

interface TeamMember {
  id: string;
  advisor_id: string;
  user_id: string | null;
  email: string;
  name: string | null;
  role: "assistant" | "viewer";
  permissions: Permissions;
  invited_at: string;
  accepted_at: string | null;
  is_active: boolean;
}

interface Permissions {
  clients_read: boolean;
  clients_write: boolean;
  deals_read: boolean;
  deals_write: boolean;
  settings: boolean;
}

/* ── Constants ── */

const ROLE_LABELS: Record<string, string> = {
  assistant: "Asistent",
  viewer: "\u010Cten\u00e1\u0159",
};

const PERMISSION_LABELS: Record<keyof Permissions, string> = {
  clients_read: "Zobrazit klienty",
  clients_write: "Editovat klienty",
  deals_read: "Zobrazit dealy",
  deals_write: "Editovat dealy",
  settings: "Nastaven\u00ed",
};

const PERMISSION_KEYS = Object.keys(PERMISSION_LABELS) as (keyof Permissions)[];

const DEFAULT_PERMISSIONS: Record<string, Permissions> = {
  assistant: {
    clients_read: true,
    clients_write: true,
    deals_read: true,
    deals_write: true,
    settings: false,
  },
  viewer: {
    clients_read: true,
    clients_write: false,
    deals_read: true,
    deals_write: false,
    settings: false,
  },
};

/* ── Component ── */

export default function TeamPage() {
  const supabase = createClient();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"assistant" | "viewer">("assistant");
  const [inviting, setInviting] = useState(false);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("advisor_team_members")
      .select("*")
      .order("invited_at", { ascending: false });

    if (data) setMembers(data as TeamMember[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  /* ── Invite ── */

  async function handleInvite() {
    if (!inviteEmail) {
      toast.error("Zadejte email.");
      return;
    }

    setInviting(true);
    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Nepoda\u0159ilo se odeslat pozv\u00e1nku.");
        setInviting(false);
        return;
      }

      toast.success("Pozv\u00e1nka odesl\u00e1na.");
      setDialogOpen(false);
      setInviteEmail("");
      setInviteRole("assistant");
      fetchMembers();
    } catch {
      toast.error("Nepoda\u0159ilo se odeslat pozv\u00e1nku.");
    } finally {
      setInviting(false);
    }
  }

  /* ── Permission toggle ── */

  async function handlePermissionToggle(
    member: TeamMember,
    key: keyof Permissions,
    value: boolean
  ) {
    const updated = { ...member.permissions, [key]: value };

    // Optimistic update
    setMembers((prev) =>
      prev.map((m) => (m.id === member.id ? { ...m, permissions: updated } : m))
    );

    const { error } = await supabase
      .from("advisor_team_members")
      .update({ permissions: updated })
      .eq("id", member.id);

    if (error) {
      toast.error("Nepoda\u0159ilo se aktualizovat opr\u00e1vn\u011bn\u00ed.");
      fetchMembers();
    }
  }

  /* ── Deactivate / Remove ── */

  async function handleRemove(member: TeamMember) {
    const confirmed = window.confirm(
      `Opravdu chcete odebrat ${member.name || member.email} z t\u00fdmu?`
    );
    if (!confirmed) return;

    const { error } = await supabase
      .from("advisor_team_members")
      .update({ is_active: false })
      .eq("id", member.id);

    if (error) {
      toast.error("Nepoda\u0159ilo se odebrat \u010dlena.");
    } else {
      toast.success("\u010Clen byl odebr\u00e1n z t\u00fdmu.");
      fetchMembers();
    }
  }

  /* ── Render ── */

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1
            className="text-2xl font-bold md:text-3xl"
            style={{
              background: "linear-gradient(135deg, var(--color-primary, #06b6d4), var(--color-secondary, #3b82f6))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Spr\u00e1va t\u00fdmu
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--text-secondary, #64748b)" }}
          >
            Pozvěte členy týmu a nastavte jejich oprávnění
          </p>
        </div>

        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Pozvat člena
        </Button>
      </div>

      {/* Members list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--text-secondary, #94a3b8)" }} />
        </div>
      ) : members.length === 0 ? (
        <div
          className="rounded-2xl border p-12 text-center"
          style={{
            backgroundColor: "var(--card-bg, #ffffff)",
            borderColor: "var(--border-color, #e2e8f0)",
          }}
        >
          <Users className="mx-auto h-12 w-12" style={{ color: "var(--text-secondary, #94a3b8)" }} />
          <p className="mt-4 text-lg font-medium" style={{ color: "var(--text-primary, #0f172a)" }}>
            Zatím žádní členové týmu
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary, #64748b)" }}>
            Pozvěte svého prvního člena týmu
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {members.map((member) => (
            <div
              key={member.id}
              className="rounded-2xl border p-6 transition-shadow hover:shadow-md"
              style={{
                backgroundColor: "var(--card-bg, #ffffff)",
                borderColor: "var(--border-color, #e2e8f0)",
              }}
            >
              {/* Member header */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{
                      background: "linear-gradient(135deg, var(--color-primary, #06b6d4), var(--color-secondary, #3b82f6))",
                    }}
                  >
                    {(member.name || member.email).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium" style={{ color: "var(--text-primary, #0f172a)" }}>
                      {member.name || member.email}
                    </p>
                    <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary, #64748b)" }}>
                      <Mail className="h-3 w-3" />
                      {member.email}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={member.role === "assistant" ? "default" : "secondary"}>
                    <Shield className="mr-1 h-3 w-3" />
                    {ROLE_LABELS[member.role] || member.role}
                  </Badge>
                  <Badge variant={member.accepted_at ? "default" : "outline"}>
                    {member.accepted_at ? "Aktivní" : "Pozváno"}
                  </Badge>
                  {!member.is_active && (
                    <Badge variant="destructive">Neaktivní</Badge>
                  )}
                </div>
              </div>

              {/* Joined date */}
              <p className="mt-3 text-xs" style={{ color: "var(--text-secondary, #94a3b8)" }}>
                Pozván{member.accepted_at ? " | Přijato" : ""}:{" "}
                {new Date(member.invited_at).toLocaleDateString("cs-CZ")}
                {member.accepted_at &&
                  ` | ${new Date(member.accepted_at).toLocaleDateString("cs-CZ")}`}
              </p>

              {/* Permissions */}
              {member.is_active && (
                <div className="mt-5 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  {PERMISSION_KEYS.map((key) => (
                    <div
                      key={key}
                      className="flex items-center justify-between rounded-xl border px-4 py-3"
                      style={{ borderColor: "var(--border-color, #e2e8f0)" }}
                    >
                      <Label
                        htmlFor={`${member.id}-${key}`}
                        className="cursor-pointer text-sm"
                        style={{ color: "var(--text-primary, #0f172a)" }}
                      >
                        {PERMISSION_LABELS[key]}
                      </Label>
                      <Switch
                        id={`${member.id}-${key}`}
                        checked={member.permissions?.[key] ?? false}
                        onCheckedChange={(val) =>
                          handlePermissionToggle(member, key, val)
                        }
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              {member.is_active && (
                <div className="mt-4 flex justify-end">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemove(member)}
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Odebrat
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Invite dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pozvat člena týmu</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="kolega@email.cz"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <Select
                value={inviteRole}
                onValueChange={(val) => setInviteRole(val as "assistant" | "viewer")}
              >
                <SelectTrigger id="invite-role">
                  <SelectValue placeholder="Vyberte roli" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assistant">Asistent</SelectItem>
                  <SelectItem value="viewer">Čtenář</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs" style={{ color: "var(--text-secondary, #64748b)" }}>
                {inviteRole === "assistant"
                  ? "Asistent má přístup ke čtení i zápisu."
                  : "Čtenář má pouze přístup ke čtení."}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Zrušit
            </Button>
            <Button onClick={handleInvite} disabled={inviting} className="gap-2">
              {inviting && <Loader2 className="h-4 w-4 animate-spin" />}
              Odeslat pozvánku
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
