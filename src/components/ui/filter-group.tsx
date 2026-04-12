"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type FilterGroupContextValue = {
  value: string;
  onChange: (value: string) => void;
};

const FilterGroupContext = React.createContext<FilterGroupContextValue | null>(null);

type FilterGroupProps = Omit<React.ComponentProps<"div">, "onChange"> & FilterGroupContextValue;

function FilterGroup({ value, onChange, className, children, ...props }: FilterGroupProps) {
  return (
    <FilterGroupContext.Provider value={{ value, onChange }}>
      <div
        role="group"
        className={cn("flex flex-wrap gap-2", className)}
        {...props}
      >
        {children}
      </div>
    </FilterGroupContext.Provider>
  );
}

type FilterButtonProps = Omit<React.ComponentProps<"button">, "value"> & {
  value: string;
};

function FilterButton({ value, className, children, type = "button", onClick, ...props }: FilterButtonProps) {
  const context = React.useContext(FilterGroupContext);

  if (!context) {
    throw new Error("FilterButton must be used inside FilterGroup");
  }

  const active = context.value === value;

  return (
    <button
      type={type}
      aria-pressed={active}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) context.onChange(value);
      }}
      className={cn(
        "cursor-pointer rounded-full px-4 py-1.5 text-xs font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary,#2563eb)] focus-visible:ring-offset-2",
        active
          ? "bg-slate-800 text-white"
          : "bg-[var(--table-header)] text-[var(--card-text-muted)] hover:bg-[var(--table-hover)]",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export { FilterGroup, FilterButton };
