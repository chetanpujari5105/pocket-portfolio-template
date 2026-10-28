import { profile } from "@content/profile";
import { ContactSchema, fieldErrorsOf, type ContactResult } from "@/lib/contact";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { SITE_URL } from "@/lib/site";

const json = (body: ContactResult, status: number) => Response.json(body, { status });

function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export async function POST(request: Request) {
  const to = process.env.CONTACT_TO_EMAIL || profile.email;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, reason: "invalid", fieldErrors: {} }, 400);
  }

  const parsed = ContactSchema.safeParse(body);
  if (!parsed.success) {
    // A filled honeypot looks like success to the bot and sends nothing.
    if (parsed.error.issues.some((i) => i.path[0] === "company")) return json({ ok: true }, 200);
    return json({ ok: false, reason: "invalid", fieldErrors: fieldErrorsOf(parsed.error) }, 400);
  }

  const limit = rateLimit(`contact:${clientIp(request)}`, 3, 60 * 60 * 1000);
  if (!limit.ok) return json({ ok: false, reason: "rate-limited", email: profile.email }, 429);

  const key = process.env.RESEND_API_KEY;
  if (!key) return json({ ok: false, reason: "unavailable", email: profile.email }, 503);

  const { name, email, subject, message } = parsed.data;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.CONTACT_FROM_EMAIL || "Pocket Portfolio <onboarding@resend.dev>",
        to: [to],
        reply_to: email,
        subject: `[${new URL(SITE_URL).host}] ${subject}`,
        text: `From: ${name} <${email}>\n\n${message}`,
        html: `<p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p><p style="white-space:pre-wrap">${escapeHtml(message)}</p>`,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}`);
    return json({ ok: true }, 200);
  } catch (error) {
    console.error("contact: send failed", error);
    return json({ ok: false, reason: "failed", email: profile.email }, 502);
  }
}
