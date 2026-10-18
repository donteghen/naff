"use client";

import { useEffect, useState } from "react";
import { useT } from "@/i18n/client";
import { whatsappLink, type WhatsAppMode } from "@/lib/whatsapp";
import { IconWhatsApp } from "../../Icons";

export const WHATSAPP_MODE_KEY = "naff.whatsappMode";

/** Per-device choice: WhatsApp Web on computers, the app on phones and tablets, unless changed in Settings. */
export function useWhatsAppMode(): [WhatsAppMode, (mode: WhatsAppMode) => void] {
  const [mode, setMode] = useState<WhatsAppMode>("web");
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(WHATSAPP_MODE_KEY);
    } catch {}
    if (saved === "web" || saved === "app") setMode(saved);
    else setMode(window.matchMedia("(pointer: coarse)").matches ? "app" : "web");
  }, []);
  function choose(next: WhatsAppMode) {
    setMode(next);
    try {
      localStorage.setItem(WHATSAPP_MODE_KEY, next);
    } catch {}
  }
  return [mode, choose];
}

export function WhatsAppButtons({ messages }: { messages: { key: string; label: string; phone: string; text: string }[] }) {
  const { t } = useT();
  const [mode] = useWhatsAppMode();
  if (messages.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {messages.map((message) => (
        <a
          key={message.key}
          href={whatsappLink(message.phone, message.text, mode)}
          target={mode === "web" ? "_blank" : undefined}
          rel="noreferrer"
          className="press inline-flex min-h-11 items-center gap-2 rounded-xl bg-green-tint px-3.5 text-sm font-extrabold text-green-ink"
          title={t(mode === "web" ? "wa.opensWeb" : "wa.opensApp")}
        >
          <IconWhatsApp size={17} />
          {message.label}
        </a>
      ))}
    </div>
  );
}
