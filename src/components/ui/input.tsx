import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <div className="flex w-full flex-col gap-1.5">
        {label ? (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-[var(--bv-ink)]"
          >
            {label}
          </label>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "h-10 w-full rounded-[var(--radius-md)] border border-[var(--bv-border-strong)] bg-white px-3 text-sm text-[var(--bv-ink)] placeholder:text-[var(--bv-muted)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-[var(--bv-danger)]",
            className,
          )}
          aria-invalid={Boolean(error)}
          {...props}
        />
        {error ? (
          <p className="text-xs text-[var(--bv-danger)]" role="alert">
            {error}
          </p>
        ) : hint ? (
          <p className="text-xs text-[var(--bv-muted)]">{hint}</p>
        ) : null}
      </div>
    );
  },
);
Input.displayName = "Input";
