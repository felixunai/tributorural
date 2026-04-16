"use client";

import { forwardRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value?: string;
  onChange?: (value: string) => void;
}

/**
 * Brazilian BRL currency input.
 * - While focused: user types freely (digits + comma/period accepted)
 * - On blur: normalizes and formats to pt-BR (e.g. "3.500,00")
 * - Emits raw decimal string via onChange (e.g. "3500.00")
 */
export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value = "", onChange, className, onBlur, onFocus, placeholder, ...props }, ref) => {
    const [focused, setFocused] = useState(false);
    // Text shown while the user is actively typing
    const [editText, setEditText] = useState("");

    /** "3500.00" → "3.500,00" */
    const formatBRL = useCallback((raw: string): string => {
      if (!raw) return "";
      const num = parseFloat(raw);
      if (isNaN(num)) return raw;
      return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }, []);

    /** "3.500,00" or "3500,00" or "3500.00" → "3500.00" */
    const parseToRaw = useCallback((display: string): string => {
      return display.replace(/\./g, "").replace(",", ".");
    }, []);

    function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
      setFocused(true);
      // Show formatted-for-editing value (pt-BR style) so user sees what they had
      setEditText(formatBRL(value));
      onFocus?.(e);
      setTimeout(() => {
        e.target.setSelectionRange(e.target.value.length, e.target.value.length);
      }, 0);
    }

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const raw = e.target.value;
      setEditText(raw);
      // Emit parsed value to form
      const parsed = parseToRaw(raw);
      onChange?.(parsed);
    }

    function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
      setFocused(false);
      const raw = parseToRaw(editText);
      const num = parseFloat(raw);
      if (!isNaN(num) && num > 0) {
        // Normalize: emit and display as "3500.00"
        onChange?.(num.toFixed(2));
      } else {
        onChange?.("");
      }
      onBlur?.(e);
    }

    // While focused: show what user is typing; while blurred: show formatted value
    const displayValue = focused ? editText : formatBRL(value);

    return (
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none select-none">
          R$
        </span>
        <input
          ref={ref}
          type="text"
          inputMode="decimal"
          value={displayValue}
          placeholder={placeholder ?? "0,00"}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2",
            "text-sm ring-offset-background placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          {...props}
        />
      </div>
    );
  }
);
CurrencyInput.displayName = "CurrencyInput";

/** Parse any BRL-formatted string to float. Handles "1.234,56", "1234,56", "1234.56" */
export function parseBRL(value: string): number {
  return parseFloat(value.replace(/\./g, "").replace(",", ".")) || 0;
}
