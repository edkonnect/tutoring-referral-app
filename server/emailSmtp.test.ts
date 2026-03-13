import { describe, it, expect } from "vitest";
import { sendEmail } from "./_core/email";

/**
 * Live SMTP credential validation test.
 * Skipped automatically when GMAIL_USER / GMAIL_APP_PASSWORD are not set
 * (e.g. in CI without secrets). When credentials are present it sends a
 * real email to the configured Gmail address to confirm delivery works.
 */
describe("Gmail SMTP email helper", () => {
  const hasCredentials =
    !!process.env.GMAIL_USER && !!process.env.GMAIL_APP_PASSWORD;

  it("returns false gracefully when credentials are missing", async () => {
    if (hasCredentials) {
      // Credentials present — skip this negative path test
      return;
    }
    const result = await sendEmail({
      to: "test@example.com",
      subject: "Test",
      html: "<p>Test</p>",
    });
    expect(result).toBe(false);
  });

  it(
    "sends a real email and returns true when credentials are configured",
    async () => {
      if (!hasCredentials) {
        console.log("[Test] Skipping live email test — credentials not set");
        return;
      }

      const result = await sendEmail({
        to: process.env.GMAIL_USER!,
        subject: "✅ Tutoring Referral Manager — SMTP Test",
        html: `
          <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:24px;">
            <h2 style="color:#1d4ed8;">Gmail SMTP is working!</h2>
            <p>This is an automated test email from the Tutoring Referral Manager app.</p>
            <p style="color:#64748b;font-size:13px;">Sent at: ${new Date().toISOString()}</p>
          </div>`,
        text: "Gmail SMTP is working! This is an automated test from the Tutoring Referral Manager app.",
      });

      expect(result).toBe(true);
    },
    30_000 // 30s timeout for real network call
  );
});
