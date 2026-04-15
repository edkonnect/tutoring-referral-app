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

  if (ENV.emailHost && ENV.emailUser && ENV.emailPassword) {
    _transporter = nodemailer.createTransport({
      host: ENV.emailHost,
      port: ENV.emailPort,
      secure: ENV.emailPort === 465,
      auth: {
        user: ENV.emailUser,
        pass: ENV.emailPassword,
      },
    });

    return _transporter;
  }

  if (ENV.gmailUser && ENV.gmailAppPassword) {
    _transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: ENV.gmailUser,
        pass: ENV.gmailAppPassword,
      },
    });

    return _transporter;
  }

  console.warn("[Email] SMTP credentials not configured (EMAIL_* or GMAIL_* missing)");
  return null;
}

export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const transporter = getTransporter();
  if (!transporter) return false;
  try {
    const info = await transporter.sendMail({
      from:
        ENV.emailFrom ||
        ENV.gmailUser ||
        ENV.emailUser ||
        "no-reply@localhost",
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
