import nodemailer from "nodemailer";
import { ENV } from "./env";

export type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

let _transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (_transporter) return _transporter;

  if (!ENV.gmailUser || !ENV.gmailAppPassword) {
    console.warn("[Email] Gmail credentials not configured (GMAIL_USER / GMAIL_APP_PASSWORD missing)");
    return null;
  }

  _transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: ENV.gmailUser,
      pass: ENV.gmailAppPassword,
    },
  });

  return _transporter;
}

/**
 * Send a transactional email via Gmail SMTP using nodemailer.
 * Returns true on success, false on failure (never throws).
 */
export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const transporter = getTransporter();
  if (!transporter) return false;

  try {
    const info = await transporter.sendMail({
      from: `"Tutoring Referral Manager" <${ENV.gmailUser}>`,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text ?? payload.subject,
    });

    console.log(`[Email] Sent to ${payload.to} — messageId: ${info.messageId}`);
    return true;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[Email] Failed to send to ${payload.to}: ${msg}`);
    return false;
  }
}
