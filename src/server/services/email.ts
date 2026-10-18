// Sends emails over SMTP. Built for Vercel serverless:
// a new connection is opened for each email, the send is awaited, and the connection is always closed.

import nodemailer from "nodemailer";
import { AppError } from "../errors";

type Email = { to: string; subject: string; html: string };

function smtpConfig() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  if (!host || !user || !pass) return null;
  const port = Number(process.env.SMTP_PORT || 587);
  return { host, port: Number.isInteger(port) && port > 0 ? port : 587, user, pass };
}

export function isMailerConfigured(): boolean {
  return smtpConfig() !== null;
}

export async function sendEmail({ to, subject, html }: Email) {
  const config = smtpConfig();
  if (!config) {
    console.error("[email] SMTP is not configured: set SMTP_HOST, SMTP_USER and SMTP_PASSWORD");
    throw new AppError("errors.emailNotConfigured");
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    requireTLS: config.port !== 465,
    auth: { user: config.user, pass: config.pass },
  });

  try {
    await transporter.sendMail({
      // The sender is always the mailbox we log in with: SMTP servers reject other or incomplete addresses.
      from: `"${process.env.SMTP_FROM_NAME || "NAFF"}" <${config.user}>`,
      to,
      subject,
      html,
      text: htmlToText(html),
    });
  } catch (error) {
    console.error("[email] sending failed:", error instanceof Error ? error.message : error);
    throw new AppError("errors.emailFailed");
  } finally {
    transporter.close();
  }
}

/** Plain-text version for email apps that do not show HTML. */
export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, "$2: $1")
    .replace(/<\/(p|div|tr|h[1-6]|li)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
