"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BRAZILIAN_STATES } from "@/lib/utils";

interface StateSelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function StateSelector({
  value,
  onValueChange,
  placeholder = "Selecione o estado",
  disabled,
}: StateSelectorProps) {
  return (
    <Select value={value} onValueChange={(v) => { if (v !== null) onValueChange(v); }} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {BRAZILIAN_STATES.map((state) => (
          <SelectItem key={state.value} value={state.value}>
            {state.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
