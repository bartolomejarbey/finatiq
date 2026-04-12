"use client";

import { useEffect, useState } from "react";
import { Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getAdvisorContact, type AdvisorContact } from "@/lib/portal/get-advisor-contact";

type ContactAdvisorButtonProps = {
  clientId: string | null | undefined;
  label?: string;
  size?: React.ComponentProps<typeof Button>["size"];
  variant?: React.ComponentProps<typeof Button>["variant"];
  className?: string;
};

export function ContactAdvisorButton({
  clientId,
  label = "Kontaktovat poradce",
  size = "sm",
  variant = "outline",
  className,
}: ContactAdvisorButtonProps) {
  const [contact, setContact] = useState<AdvisorContact | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadContact() {
      if (!clientId) return;
      setLoading(true);
      const nextContact = await getAdvisorContact(clientId);
      if (active) {
        setContact(nextContact);
        setLoading(false);
      }
    }
    loadContact();
    return () => {
      active = false;
    };
  }, [clientId]);

  const hasContact = !!contact?.phone || !!contact?.email;

  if (!clientId || (!loading && !hasContact)) {
    return (
      <Button
        size={size}
        variant={variant}
        className={className}
        disabled
        title="Kontakt není dostupný, kontaktujte podporu"
      >
        {label}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size={size} variant={variant} className={className} disabled={loading}>
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {contact?.phone && (
          <DropdownMenuItem asChild>
            <a href={`tel:${contact.phone}`} className="cursor-pointer">
              <Phone className="mr-2 h-4 w-4" />
              Zavolat
            </a>
          </DropdownMenuItem>
        )}
        {contact?.email && (
          <DropdownMenuItem asChild>
            <a href={`mailto:${contact.email}`} className="cursor-pointer">
              <Mail className="mr-2 h-4 w-4" />
              Napsat email
            </a>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
