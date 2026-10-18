"use client";

import { useState } from "react";
import { useT } from "@/i18n/client";
import { IconCheck, IconCopy } from "./Icons";
import { buttonClass } from "./ui";

export function CopyButton({ text, label, variant = "secondary", size = "md", className = "" }: { text: string; label: string; variant?: "primary" | "secondary" | "action"; size?: "lg" | "md" | "sm"; className?: string }) {
  const { t } = useT();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Old browsers: select-and-copy fallback is not worth the complexity; the text is visible on screen.
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button type="button" onClick={copy} className={buttonClass(variant, size, className)}>
      {copied ? <IconCheck size={18} /> : <IconCopy size={18} />}
      {copied ? t("common.copied") : label}
    </button>
  );
}
