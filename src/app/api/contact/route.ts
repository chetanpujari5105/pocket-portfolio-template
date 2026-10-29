import nodemailer from "nodemailer";

import { profile } from "@content/profile";
import { ContactSchema, fieldErrorsOf, type ContactResult } from "@/lib/contact";
import { clientIp, rateLimit, recordHit } from "@/lib/rate-limit";
import { SITE_URL } from "@/lib/site";

/*
 * Contact form → one email through Gmail SMTP (GMAIL_USER + GMAIL_APP_PASSWORD), or Resend's REST
 * API when only RESEND_API_KEY is set. Sent From the site's own address (never the visitor), To
 * the owner, Reply-To the visitor. Every way it can't send is logged with the setting to fix
 * (never a secret); the visitor gets a reason the form can act on (see ContactResult).
 */

/** Resend's shared test sender: only delivers to the Resend account owner's own address. */
const TEST_SENDER = "Pocket Portfolio <onboarding@resend.dev>";
/** `hello@domain.com` or `Name <hello@domain.com>` */
const SENDER = /^(?:[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+|[^<>\r\n]*<[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+>)$/;
/** Gmail over implicit TLS. GMAIL_SMTP_URL points tests at a fake server (smtp:// only on loopback). */
const GMAIL_SMTP = "smtps://smtp.gmail.com:465";
const FROM_NAME = `${profile.name} · website`;
const EMAIL = /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/;
/** Attempts that reach the mail service per IP (burst), and messages actually sent per IP (hourly). */
const ATTEMPTS = { limit: 5, windowMs: 10 * 60 * 1000 };
const SENT = { limit: 3, windowMs: 60 * 60 * 1000 };
const MAX_BODY = 20_000;

const json = (body: ContactResult, status: number, headers?: HeadersInit) => Response.json(body, { status, headers });
const log = (level: "warn" | "error", message: string) => console[level](`[contact] ${message}`);

let warnedTestSender = false;

function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
/** Control characters out (line breaks kept only where asked); no header or markup tricks survive. */
function clean(text: string, multiline = false) {
  const out = text.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0009\u000B-\u001F\u007F\u2028\u2029]/g, (c) => (c === "\t" ? " " : ""));
  return multiline ? out.trim() : out.replace(/\s+/g, " ").trim();
}

type Gmail = { kind: "gmail"; user: string; pass: string; to: string; smtp: URL };
type Resend = { kind: "resend"; key: string; from: string; to: string; api: string };
/** Why a send didn't go through: `settings` means retrying won't help (the form offers email instead). */
type Failure = { settings: boolean; said: string; fix: string };

/** How to send and to whom, or null (logged) when it isn't set up. Gmail wins whenever either Gmail variable is set. */
function settings(): Gmail | Resend | null {
  const to = process.env.CONTACT_TO_EMAIL?.trim() || profile.email;
  const user = process.env.GMAIL_USER?.trim();
  // Google shows app passwords in groups of four ("abcd efgh ijkl mnop")
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");
  if (user || pass) {
    const missing = [!user && "GMAIL_USER", !pass && "GMAIL_APP_PASSWORD"].filter(Boolean).join(" and ");
    if (missing) {
      log("error", `${missing} is not set, so messages can't be sent. Set both GMAIL_USER and GMAIL_APP_PASSWORD (README → "Contact form email"), then redeploy.`);
      return null;
    }
    if (!EMAIL.test(user!)) {
      log("error", "GMAIL_USER isn't an email address. Use the full Gmail address, e.g. you@gmail.com.");
      return null;
    }
    return { kind: "gmail", user: user!, pass: pass!, to, smtp: new URL(process.env.GMAIL_SMTP_URL || GMAIL_SMTP) };
  }

  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    log(
      "error",
      "GMAIL_USER and GMAIL_APP_PASSWORD are not set, so messages can't be sent and the form offers \"email me directly\". " +
        'Create a Google app password (README → "Contact form email") and add both to Vercel → Project → Settings → Environment Variables (Production), then redeploy.',
    );
    return null;
  }
  const configured = process.env.CONTACT_FROM_EMAIL?.trim();
  if (configured && !SENDER.test(configured)) {
    log("error", `CONTACT_FROM_EMAIL "${configured}" isn't an address Resend accepts. Use "hello@your-domain.com" or "Name <hello@your-domain.com>".`);
    return null;
  }
  if (!configured && !warnedTestSender) {
    warnedTestSender = true;
    log(
      "warn",
      "CONTACT_FROM_EMAIL is not set: sending from onboarding@resend.dev, which Resend only delivers to the Resend account owner's own address. " +
        'Verify a domain at resend.com/domains and set CONTACT_FROM_EMAIL="Name <hello@your-domain.com>".',
    );
  }
  return {
    kind: "resend",
    key,
    from: configured || TEST_SENDER,
    to,
    api: (process.env.RESEND_API_URL || "https://api.resend.com").replace(/\/+$/, ""),
  };
}

type Mail = { replyTo: string; subject: string; text: string; html: string };

type SmtpError = Error & { code?: string; responseCode?: number; response?: string; permanent?: boolean };

/** One message through Gmail. Never logs the password: only the error code and Google's reply. */
async function sendGmail(config: Gmail, mail: Mail): Promise<Failure | null> {
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(config.smtp.hostname);
  const transport = nodemailer.createTransport({
    host: config.smtp.hostname,
    port: Number(config.smtp.port) || 465,
    secure: config.smtp.protocol === "smtps:",
    ignoreTLS: loopback && config.smtp.protocol === "smtp:",
    auth: { user: config.user, pass: config.pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 10_000,
  });
  try {
    await transport.sendMail({ from: { name: FROM_NAME, address: config.user }, to: config.to, ...mail });
    return null;
  } catch (error) {
    const e = error as SmtpError;
    const reply = (e.response ?? e.message ?? "").split("\n")[0].split(config.pass).join("***").slice(0, 200);
    const said = [e.responseCode ?? e.code ?? "error", reply].filter(Boolean).join(": ");
    if (e.code === "EAUTH" || e.responseCode === 535)
      return {
        settings: true,
        said,
        fix: "Check GMAIL_USER / GMAIL_APP_PASSWORD: the password must be a 16-character app password for that account (Google Account → Security → 2-Step Verification → App passwords), not the Google password.",
      };
    if (e.code === "EENVELOPE" || e.permanent)
      return { settings: true, said, fix: "Check CONTACT_TO_EMAIL and GMAIL_USER (Gmail's reply above says why; 550 5.4.5 is its daily sending limit)." };
    return { settings: false, said, fix: "The visitor can retry." };
  } finally {
    transport.close();
  }
}

/** One message through Resend's REST API. */
async function sendResend(config: Resend, mail: Mail): Promise<Failure | null> {
  let res: Response;
  try {
    res = await fetch(`${config.api}/emails`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: config.from, to: [config.to], reply_to: mail.replyTo, subject: mail.subject, text: mail.text, html: mail.html }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    return { settings: false, said: `couldn't reach it, ${error instanceof Error ? error.name : "error"}`, fix: "The visitor can retry." };
  }
  if (res.ok) return null;
  const detail = (await res.json().catch(() => null)) as { message?: string; name?: string } | null;
  const said = `${res.status}${detail?.name ? ` ${detail.name}` : ""}: ${detail?.message ?? res.statusText}`;
  // 400/401/403/422 are the settings, not the visitor: retrying won't help
  if ([400, 401, 403, 422].includes(res.status)) return { settings: true, said, fix: hint(res.status, detail?.message ?? "", config.from === TEST_SENDER) };
  return { settings: false, said, fix: "The visitor can retry." };
}

/** What to fix when Resend turns the settings down (400/401/403/422). */
function hint(status: number, message: string, testSender: boolean) {
  if (status === 401) return "Check RESEND_API_KEY: copy a fresh key from resend.com/api-keys.";
  if (status === 403 && (testSender || /testing emails/i.test(message)))
    return "The test sender onboarding@resend.dev only delivers to the Resend account owner. Verify a domain at resend.com/domains and set CONTACT_FROM_EMAIL to an address on it.";
  if (status === 403) return "Verify the domain in CONTACT_FROM_EMAIL at resend.com/domains (or use a key with sending access).";
  return "Check CONTACT_FROM_EMAIL and CONTACT_TO_EMAIL.";
}

export async function POST(request: Request) {
  // Only this site's own pages may post (a page elsewhere can't use the form as a relay)
  const origin = request.headers.get("origin");
  if (origin) {
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    let from = "";
    try {
      from = new URL(origin).host;
    } catch {}
    if (from !== host) return json({ ok: false, reason: "forbidden" }, 403);
  }
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY) return json({ ok: false, reason: "invalid", fieldErrors: {} }, 413);

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

  const config = settings();
  if (!config) return json({ ok: false, reason: "unavailable", email: profile.email }, 503);

  const ip = clientIp(request);
  const limited = [
    rateLimit(`contact:sent:${ip}`, SENT.limit, SENT.windowMs, { record: false }),
    rateLimit(`contact:try:${ip}`, ATTEMPTS.limit, ATTEMPTS.windowMs),
  ].find((r) => !r.ok);
  if (limited && !limited.ok)
    return json({ ok: false, reason: "rate-limited", email: profile.email, retryAfter: limited.retryAfter }, 429, {
      "Retry-After": String(limited.retryAfter),
    });

  const name = clean(parsed.data.name);
  const subject = clean(parsed.data.subject);
  const message = clean(parsed.data.message, true);
  const email = parsed.data.email;
  const mail: Mail = {
    replyTo: email,
    subject: `[${new URL(SITE_URL).host}] ${subject} (from ${name})`.slice(0, 250),
    text: `From: ${name} <${email}>\nSubject: ${subject}\n\n${message}\n\n(Reply to this email to answer ${name}.)`,
    html:
      `<p style="margin:0 0 4px"><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p>` +
      `<p style="margin:0 0 16px"><strong>Subject:</strong> ${escapeHtml(subject)}</p>` +
      `<p style="margin:0 0 16px;white-space:pre-wrap">${escapeHtml(message)}</p>` +
      `<p style="margin:0;color:#777;font-size:12px">Reply to this email to answer ${escapeHtml(name)}.</p>`,
  };

  const failure = config.kind === "gmail" ? await sendGmail(config, mail) : await sendResend(config, mail);
  if (!failure) {
    recordHit(`contact:sent:${ip}`);
    return json({ ok: true }, 200);
  }
  const service = config.kind === "gmail" ? "Gmail" : "Resend";
  if (failure.settings) {
    log("error", `${service} refused the email (${failure.said}). ${failure.fix}`);
    return json({ ok: false, reason: "unavailable", email: profile.email }, 503);
  }
  log("error", `${service} couldn't send right now (${failure.said}). ${failure.fix}`);
  return json({ ok: false, reason: "failed", email: profile.email }, 502);
}
