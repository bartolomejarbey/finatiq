import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EmptyStateAction = {
  label: string;
  onClick?: () => void;
  href?: string;
};

type EmptyStateProps = React.ComponentProps<"div"> & {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode | EmptyStateAction;
};

function isActionObject(action: EmptyStateProps["action"]): action is EmptyStateAction {
  return !!action && typeof action === "object" && !React.isValidElement(action) && "label" in action;
}

function EmptyState({ icon, title, description, action, className, ...props }: EmptyStateProps) {
  const renderedAction = isActionObject(action)
    ? action.href
      ? (
          <Button asChild>
            <Link href={action.href}>{action.label}</Link>
          </Button>
        )
      : <Button onClick={action.onClick}>{action.label}</Button>
    : action;

  return (
    <div
      className={cn("flex flex-col items-center py-16 text-center", className)}
      {...props}
    >
      {icon && (
        <div className="mb-4 text-[var(--card-text-dim)]">
          {icon}
        </div>
      )}
      <p className="text-lg font-medium text-[var(--card-text-dim)]">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-[var(--card-text-muted)]">{description}</p>
      )}
      {renderedAction && <div className="mt-5">{renderedAction}</div>}
    </div>
  );
}

export { EmptyState };
