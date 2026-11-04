"use client";

import { Delete } from "lucide-react";

interface NumberPadProps {
  value: string;
  onChange: (value: string) => void;
  maxDecimals?: number;
  disabled?: boolean;
}

export function NumberPad({ value, onChange, maxDecimals = 2, disabled = false }: NumberPadProps) {
  const press = (key: string) => {
    if (disabled) return;
    if (key === "delete") {
      onChange(value.slice(0, -1));
      return;
    }
    if (key === ".") {
      if (maxDecimals === 0 || value.includes(".")) return;
      onChange(value ? value + "." : "0.");
      return;
    }
    const decimals = value.split(".")[1] ?? "";
    if (value.includes(".") && decimals.length >= maxDecimals) return;
    if (value === "0") {
      onChange(key);
      return;
    }
    onChange(value + key);
  };

  return (
    <div className="number-pad" aria-label="Amount keypad">
      {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "delete"].map((key) => (
        <button
          key={key}
          type="button"
          disabled={disabled || (key === "." && (maxDecimals === 0 || value.includes(".")))}
          aria-label={key === "delete" ? "Delete last digit" : key === "." ? "Decimal point" : key}
          onClick={() => press(key)}
        >
          {key === "delete" ? <Delete size={23} aria-hidden="true" /> : key}
        </button>
      ))}
    </div>
  );
}
