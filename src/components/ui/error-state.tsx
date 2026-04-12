import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ErrorStateProps = React.ComponentProps<"div"> & {
  title?: string;
  description?: string;
  onRetry?: () => void;
};

export function ErrorState({
  title = "Něco se pokazilo",
  description = "Zkuste to prosím znovu. Pokud problém přetrvává, kontaktujte poradce.",
  onRetry,
  className,
  ...props
}: ErrorStateProps) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center py-12 text-center", className)}
      role="alert"
      {...props}
    >
      <AlertTriangle className="mb-4 h-10 w-10 text-destructive" />
      <h2 className="text-lg font-semibold text-[var(--card-text)]">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      {onRetry && (
        <Button onClick={onRetry} className="mt-6" variant="outline">
          Zkusit znovu
        </Button>
      )}
    </div>
  );
}
