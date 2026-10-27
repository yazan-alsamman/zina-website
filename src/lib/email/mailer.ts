import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import type { Email } from "./templates";

let transporter: Transporter | null = null;

function smtpConfig() {
  const host = process.env.SMTP_HOST;
  const from = process.env.SMTP_FROM;
  if (!host || !from) return null;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  return {
    from,
    options: {
      host,
      port,
      secure: port === 465,
      auth: user ? { user, pass: process.env.SMTP_PASS ?? "" } : undefined,
    },
  };
}

/**
 * Sends one email. Never throws: without SMTP settings it logs "email skipped", and delivery
 * errors are logged, so an order can never fail because of email.
 */
export async function sendEmail(to: string, email: Email): Promise<"sent" | "skipped" | "failed"> {
  const config = smtpConfig();
  if (!config) {
    console.info(`[email] email skipped (SMTP not configured): "${email.subject}"`);
    return "skipped";
  }
  try {
    transporter ??= nodemailer.createTransport(config.options);
    await transporter.sendMail({
      from: config.from,
      to,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
    return "sent";
  } catch (error) {
    console.error(`[email] could not send "${email.subject}":`, (error as Error).message);
    return "failed";
  }
}
