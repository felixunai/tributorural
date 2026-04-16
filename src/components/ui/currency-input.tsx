"use client";

import { forwardRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value?: string;
  onChange?: (value: string) => void;
}

/**
 * Brazilian BRL currency input.
 * Emits raw decimal string (e.g. "3500.00") via onChange.
 * Displays formatted BRL while not focused (e.g. "3.500,00").
 */
export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value = "", onChange, className, onBlur, onFocus, placeholder, ...props }, ref) => {
    const [focused, setFocused] = useState(false);

    /** "1234.50"  →  "1.234,50" */
    const formatDisplay = useCallback((raw: string): string => {
      if (!raw) return "";
      const num = parseFloat(raw);
      if (isNaN(num)) return raw;
      return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }, []);

    /** "1.234,50" or "1234,50" or "1234.50"  →  "1234.50" */
    const toRaw = useCallback((display: string): string => {
      // Remove thousand separators (.) only when followed by digits grouped in 3
      // Strategy: remove all dots that are thousands separators, convert comma to dot
      return display.replace(/\./g, "").replace(",", ".");
    }, []);

    const displayValue = focused ? formatDisplay(value) : formatDisplay(value);

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
          onChange={(e) => {
            const raw = toRaw(e.target.value);
            onChange?.(raw);
          }}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
            // Move cursor to end
            setTimeout(() => {
              e.target.setSelectionRange(e.target.value.length, e.target.value.length);
            }, 0);
          }}
          onBlur={(e) => {
            setFocused(false);
            // Normalize on blur: "3500" → "3500.00"
            const raw = toRaw(e.target.value);
            const num = parseFloat(raw);
            if (!isNaN(num)) {
              onChange?.(num.toFixed(2));
            }
            onBlur?.(e);
          }}
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
