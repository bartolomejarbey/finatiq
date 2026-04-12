import * as React from "react";
import { cn } from "@/lib/utils";

type EmptyStateProps = React.ComponentProps<"div"> & {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
};

function EmptyState({ icon, title, description, action, className, ...props }: EmptyStateProps) {
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
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export { EmptyState };
