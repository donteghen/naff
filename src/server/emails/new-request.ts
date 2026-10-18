import { formatPhone } from "@/lib/phone";

function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Admin alert email, always in French and English so every admin can read it.
export function newRequestEmail({ to, number, route, summary, senderPhone, link }: { to: string[]; number: string; route: string; summary: string; senderPhone: string; link: string }) {
  return {
    to: to.join(","),
    subject: `NAFF · Nouvelle demande / New request ${number}`,
    html: `<div style="font-family:Arial,sans-serif;color:#0B1B3F;max-width:520px">
  <h2 style="margin:0 0 8px">${escapeHtml(number)} · ${escapeHtml(route)}</h2>
  <p>${escapeHtml(summary)}</p>
  <p>Expéditeur / Sender: <b>${escapeHtml(formatPhone(senderPhone))}</b></p>
  <p><a href="${link}" style="display:inline-block;background:#FFB81C;color:#0B1B3F;font-weight:800;padding:12px 18px;border-radius:12px;text-decoration:none">Ouvrir / Open</a></p>
</div>`,
  };
}
