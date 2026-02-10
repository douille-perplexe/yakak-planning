import { Resend } from "resend";

let resend: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

interface SendNotificationEmailParams {
  to: string;
  subject: string;
  message: string;
  eventId?: string;
}

export async function sendNotificationEmail({
  to,
  subject,
  message,
  eventId,
}: SendNotificationEmailParams) {
  const client = getResend();
  if (!client) return; // No API key configured — skip silently

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const eventLink = eventId ? `${appUrl}/events/${eventId}` : appUrl;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; background: #6366f1; border-radius: 8px; width: 40px; height: 40px; line-height: 40px; color: white; font-weight: bold; font-size: 18px;">
          Y
        </div>
        <h1 style="margin: 8px 0 0; font-size: 20px; color: #1a1a1a;">Yakak</h1>
      </div>
      <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 15px; color: #374151; line-height: 1.5;">
          ${message}
        </p>
      </div>
      <div style="text-align: center;">
        <a href="${eventLink}" style="display: inline-block; background: #6366f1; color: white; text-decoration: none; padding: 10px 24px; border-radius: 6px; font-size: 14px; font-weight: 500;">
          View in Yakak
        </a>
      </div>
      <p style="margin-top: 24px; font-size: 12px; color: #9ca3af; text-align: center;">
        You can manage your notification preferences in Yakak settings.
      </p>
    </div>
  `;

  const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  await client.emails.send({
    from: fromEmail,
    to,
    subject: `Yakak: ${subject}`,
    html,
  });
}
