import { translate } from "@/i18n";
import type { Language } from "@/lib/constants";

function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function pinResetEmail({ to, name, tempPin, minutes, language }: { to: string; name: string; tempPin: string; minutes: number; language: string }) {
  const lang = (language === "en" ? "en" : "fr") as Language;
  const t = (key: string, values?: Record<string, string | number>) => translate(lang, key, values);
  return {
    to,
    subject: t("email.pinReset.subject"),
    html: `<div style="font-family:Arial,sans-serif;color:#0B1B3F;max-width:480px">
  <h2 style="margin:0 0 12px">NAFF</h2>
  <p>${escapeHtml(t("email.pinReset.hello", { name }))}</p>
  <p>${escapeHtml(t("email.pinReset.body", { minutes }))}</p>
  <p style="font-size:32px;font-weight:800;letter-spacing:8px;background:#FFF1CC;padding:12px 16px;border-radius:12px;display:inline-block">${tempPin}</p>
  <p>${escapeHtml(t("email.pinReset.footer"))}</p>
</div>`,
  };
}
