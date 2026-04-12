import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FormFieldProps = Omit<React.ComponentProps<typeof Input>, "id"> & {
  id: string;
  label: string;
  error?: string;
  requiredLabel?: boolean;
  wrapperClassName?: string;
};

export const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  ({ id, label, error, requiredLabel, className, wrapperClassName, ...props }, ref) => {
    const errorId = `${id}-error`;

    return (
      <div className={cn("space-y-1", wrapperClassName)}>
        <Label className="text-xs" htmlFor={id}>
          {label}
          {requiredLabel ? " *" : ""}
        </Label>
        <Input
          id={id}
          ref={ref}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : props["aria-describedby"]}
          className={className}
          {...props}
        />
        {error && (
          <span id={errorId} className="block text-xs font-medium text-red-600">
            {error}
          </span>
        )}
      </div>
    );
  }
);

FormField.displayName = "FormField";
