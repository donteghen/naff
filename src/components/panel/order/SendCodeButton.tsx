"use client";

import { useState } from "react";
import { logCodeSharedAction } from "@/actions/panel-orders";
import { useT } from "@/i18n/client";
import { whatsappLink } from "@/lib/whatsapp";
import { IconWhatsApp } from "../../Icons";
import { useWhatsAppMode } from "./WhatsAppButtons";

/**
 * Delivery code to the receiver, only when the sender asked for it (SPEC §6.5).
 * First tap asks for confirmation; the second opens WhatsApp and records it in the activity log.
 */
export function SendCodeButton({ orderId, phone, text }: { orderId: string; phone: string; text: string }) {
  const { t } = useT();
  const [mode] = useWhatsAppMode();
  const [confirming, setConfirming] = useState(false);
  const style = "press inline-flex min-h-11 items-center gap-2 rounded-xl px-3.5 text-sm font-extrabold";

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className={`${style} bg-amber-soft text-amber-ink`}>
        <IconWhatsApp size={17} />
        {t("wa.sendCodeReceiver")}
      </button>
    );
  }
  return (
    <a
      href={whatsappLink(phone, text, mode)}
      target={mode === "web" ? "_blank" : undefined}
      rel="noreferrer"
      onClick={() => {
        setConfirming(false);
        // Recorded in the background: the link opens straight away.
        void logCodeSharedAction(orderId);
      }}
      className={`${style} bg-amber text-navy`}
    >
      <IconWhatsApp size={17} />
      {t("wa.sendCodeConfirm")}
    </a>
  );
}
