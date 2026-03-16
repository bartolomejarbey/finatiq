"use client";

import { MoreVertical, Trash2, UserPlus, Pencil } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Deal, DealTag } from "./page";
import { formatCZK, relativeTime } from "./page";

const sourceBadge: Record<string, { label: string; bg: string; text: string }> = {
  meta: { label: "Meta Ads", bg: "bg-blue-500/10", text: "text-blue-600" },
  manual: { label: "Manuální", bg: "bg-gray-500/10", text: "text-gray-500" },
  referral: { label: "Doporučení", bg: "bg-emerald-500/10", text: "text-emerald-600" },
};

interface Props {
  deal: Deal;
  tags: DealTag[];
  isDragging: boolean;
  stageColor?: string;
  onClick: () => void;
  onDelete: () => void;
}

export function DealCard({ deal, tags, isDragging, stageColor, onClick, onDelete }: Props) {
  const badge = sourceBadge[deal.source] || sourceBadge.manual;

  return (
    <div
      onClick={onClick}
      className={`group relative cursor-grab rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] p-3 mb-2 transition-all duration-150 ${
        isDragging
          ? "shadow-xl opacity-90 rotate-1 scale-[1.03]"
          : "shadow-sm hover:shadow-md"
      }`}
      style={{ borderLeftWidth: 3, borderLeftColor: stageColor || "var(--card-border)" }}
    >
      {/* Three dots menu */}
      <div className="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100">
        <DropdownMenu>
          <DropdownMenuTrigger onClick={(e) => e.stopPropagation()} className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-[var(--table-header)]">
            <MoreVertical className="h-3.5 w-3.5 text-[var(--card-text-dim)]" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onClick(); }}><Pencil className="mr-2 h-3.5 w-3.5" />Editovat</DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => e.stopPropagation()}><UserPlus className="mr-2 h-3.5 w-3.5" />Přiřadit klienta</DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-red-600 focus:text-red-600"><Trash2 className="mr-2 h-3.5 w-3.5" />Smazat</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Contact name */}
      <div className="pr-6">
        {deal.contact_name && <p className="text-sm font-medium text-[var(--card-text)]">{deal.contact_name}</p>}
      </div>

      {/* Title */}
      <p className="text-xs text-[var(--card-text-dim)] mt-0.5">{deal.title}</p>

      {/* Divider */}
      <div className="border-t border-[var(--table-hover)] my-3" />

      {/* Value + source */}
      <div className="flex justify-between items-center">
        <p className="text-sm font-semibold text-[var(--card-text)]">{formatCZK(deal.value)}</p>
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${badge.bg} ${badge.text}`}>
          {badge.label}
        </span>
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {tags.map((tag) => (
            <span key={tag.id} className="rounded-full bg-[var(--table-hover)] text-[var(--card-text-muted)] px-2 py-0.5 text-xs">
              {tag.name}
            </span>
          ))}
        </div>
      )}

      {/* Time */}
      <p className="text-xs text-[var(--card-text-dim)] mt-2">{relativeTime(deal.created_at)}</p>
    </div>
  );
}
