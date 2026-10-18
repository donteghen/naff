"use client";

import { useRef, useState } from "react";
import { useT } from "@/i18n/client";

/** Four boxes for the delivery code the receiver says aloud. */
export function CodeEntry({ onChange, disabled = false }: { onChange: (code: string) => void; disabled?: boolean }) {
  const { t } = useT();
  const [digits, setDigits] = useState(["", "", "", ""]);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  function update(index: number, value: string) {
    const clean = value.replace(/\D/g, "");
    const next = [...digits];
    if (clean.length > 1) {
      // Pasted or auto-filled: spread over the boxes.
      clean.slice(0, 4).split("").forEach((digit, offset) => { if (index + offset < 4) next[index + offset] = digit; });
    } else {
      next[index] = clean;
    }
    setDigits(next);
    onChange(next.join(""));
    if (clean && index < 3) refs.current[Math.min(3, index + clean.length)]?.focus();
  }

  function keyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index] && index > 0) refs.current[index - 1]?.focus();
  }

  return (
    <div className="flex justify-center gap-3" role="group" aria-label={t("driver.codeLabel")}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => { refs.current[index] = element; }}
          value={digit}
          disabled={disabled}
          onChange={(event) => update(index, event.target.value)}
          onKeyDown={(event) => keyDown(index, event)}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={4}
          aria-label={`${t("driver.codeDigit")} ${index + 1}`}
          className="h-16 w-14 rounded-2xl border-2 border-field bg-white text-center text-3xl font-extrabold outline-none focus:border-navy disabled:opacity-50"
        />
      ))}
    </div>
  );
}
