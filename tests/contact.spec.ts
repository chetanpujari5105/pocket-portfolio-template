import { spawn, type ChildProcess } from "node:child_process";
import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";

import { simpleParser, type ParsedMail } from "mailparser";
import { SMTPServer } from "smtp-server";

import { profile } from "../content/profile";
import { expect, test, type Page } from "./fixtures";

/*
 * The Contact form and /api/contact. Gmail and Resend are never called for real:
 * - UI tests answer /api/contact from the browser (page.route).
 * - API tests start the built app (`next start`) on spare ports with GMAIL_SMTP_URL and
 *   RESEND_API_URL pointing at a fake SMTP server and a fake Resend in this process, so the real
 *   route builds and sends the real message.
 */

/** The site's own address, as the route builds it (lib/site.ts without Vercel's variables) */
const HOST = new URL(process.env.NEXT_PUBLIC_SITE_URL || profile.site.url).host;
const OWNER = profile.email;
const escape = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const VALID = { name: "Ada Lovelace", email: "ada@example.com", subject: "A course question", message: "Hello! Is the Notion course still open?" };

/* ───────────────────────── UI ───────────────────────── */

test.describe("form", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem("pp-unlocked", "1"));
  });

  async function openContact(page: Page) {
    await page.goto("/#contact");
    await expect(page.locator("#contact-message")).toBeVisible();
    await page.waitForTimeout(500); // launch spring settles
  }
  async function fill(page: Page, v = VALID) {
    await page.locator("#contact-email").fill(v.email);
    await page.locator("#contact-name").fill(v.name);
    await page.locator("#contact-subject").fill(v.subject);
    await page.locator("#contact-message").fill(v.message);
  }
  const send = (page: Page) => page.locator("[data-contact-send]");

  test("a valid send shows a spinner, then Message sent (form and pill)", async ({ page }) => {
    let body: Record<string, string> = {};
    let release!: () => void;
    const held = new Promise<void>((r) => (release = r));
    await page.route("**/api/contact", async (route) => {
      body = route.request().postDataJSON();
      await held;
      await route.fulfill({ status: 200, json: { ok: true } });
    });
    await openContact(page);
    await fill(page);
    await send(page).click();
    await expect(send(page)).toHaveAttribute("aria-busy", "true");
    await expect(send(page)).toBeDisabled();
    await expect(page.locator("[data-contact-status]")).toContainText("Sending…");
    release();
    await expect(page.locator("[data-contact-status]")).toContainText("Message sent.");
    await expect(page.locator("[data-pill=done]")).toHaveAttribute("aria-label", /^Message sent\./); // the status pill
    await expect(page.locator("#contact-message")).toHaveValue("");
    expect(body).toMatchObject(VALID);
    expect(body.company ?? "").toBe("");
  });

  test("validation errors show by each field, and the first one takes focus", async ({ page }) => {
    let calls = 0;
    await page.route("**/api/contact", (route) => {
      calls++;
      return route.fulfill({ status: 400, json: { ok: false, reason: "invalid", fieldErrors: { email: "That email doesn't look right." } } });
    });
    await openContact(page);
    await send(page).click();
    await expect(page.locator("#contact-email-error")).toHaveText("That email doesn't look right.");
    await expect(page.locator("#contact-message-error")).toBeVisible();
    await expect(page.locator("#contact-email")).toBeFocused();
    expect(calls).toBe(0); // caught before sending
    // The server's verdict shows the same way
    await fill(page, { ...VALID, email: "ada@example" });
    await send(page).click();
    await expect(page.locator("#contact-email-error")).toBeVisible();
    await expect(page.locator("#contact-email")).toHaveAttribute("aria-invalid", "true");
  });

  test("without email set up, it offers email directly and keeps the text", async ({ page }) => {
    await page.route("**/api/contact", (route) =>
      route.fulfill({ status: 503, json: { ok: false, reason: "unavailable", email: OWNER } }),
    );
    await openContact(page);
    await fill(page);
    await send(page).click();
    const problem = page.locator("[data-contact-problem=unavailable]");
    await expect(problem).toContainText("Email isn't set up");
    const link = problem.getByRole("link", { name: "email me directly" });
    await expect(link).toHaveAttribute("href", new RegExp(`^mailto:${escape(OWNER)}\\?subject=A%20course%20question&body=Hello!`));
    await expect(problem.getByRole("button", { name: "Try again" })).toHaveCount(0);
    await expect(page.locator("#contact-message")).toHaveValue(VALID.message);
  });

  test("a network failure keeps the text, and Try again sends it", async ({ page }) => {
    let calls = 0;
    await page.route("**/api/contact", (route) => (++calls === 1 ? route.abort("internetdisconnected") : route.fulfill({ status: 200, json: { ok: true } })));
    await openContact(page);
    await fill(page);
    await send(page).click();
    const problem = page.locator("[data-contact-problem=network]");
    await expect(problem).toContainText("Your message is still here");
    for (const id of ["#contact-email", "#contact-name", "#contact-subject", "#contact-message"])
      await expect(page.locator(id)).not.toHaveValue("");
    await expect(page.locator("#contact-message")).toHaveValue(VALID.message);
    await problem.getByRole("button", { name: "Try again" }).click();
    await expect(page.locator("[data-contact-status]")).toContainText("Message sent.");
    expect(calls).toBe(2);
  });

  test("too many requests says when to try again", async ({ page }) => {
    await page.route("**/api/contact", (route) =>
      route.fulfill({ status: 429, json: { ok: false, reason: "rate-limited", email: OWNER, retryAfter: 540 } }),
    );
    await openContact(page);
    await fill(page);
    await send(page).click();
    const problem = page.locator("[data-contact-problem=rate-limited]");
    await expect(problem).toContainText("Try again in 9 minutes");
    await expect(problem.getByRole("button", { name: "Try again" })).toBeVisible();
    await expect(page.locator("#contact-message")).toHaveValue(VALID.message);
  });

  test("a send that fails on the server keeps the text and offers a retry", async ({ page }) => {
    await page.route("**/api/contact", (route) => route.fulfill({ status: 502, json: { ok: false, reason: "failed", email: "x@y.z" } }));
    await openContact(page);
    await fill(page);
    await send(page).click();
    await expect(page.locator("[data-contact-problem=failed]")).toContainText("Couldn't send just now");
    await expect(page.locator("#contact-message")).toHaveValue(VALID.message);
  });

  test("pressing Send twice (or Send then Enter) sends once", async ({ page }) => {
    let calls = 0;
    await page.route("**/api/contact", async (route) => {
      calls++;
      await new Promise((r) => setTimeout(r, 400));
      await route.fulfill({ status: 200, json: { ok: true } });
    });
    await openContact(page);
    await fill(page);
    // Two clicks in the same task, before React can re-render the button as disabled
    await send(page).evaluate((b: HTMLButtonElement) => {
      b.click();
      b.click();
    });
    await page.locator("#contact-subject").press("Enter");
    await expect(page.locator("[data-contact-status]")).toContainText("Message sent.");
    expect(calls).toBe(1);
  });
});

/* ───────────────────────── API (real route, fake Gmail SMTP and Resend) ───────────────────────── */

type Sent = { auth?: string; body: Record<string, unknown> };
type Reply = { status: number; json: unknown };
type Smtp = { user: string; pass: string; mail: ParsedMail };
/** How the fake Gmail answers: accept, refuse the login (535), or refuse the message with a code. */
type SmtpReply = { auth: "ok" | 535; data: "ok" | { code: number; text: string } };

const GMAIL = { GMAIL_USER: "site@example.com", GMAIL_APP_PASSWORD: "abcd efgh ijkl mnop" };

test.describe("api", () => {
  test.describe.configure({ mode: "serial" });

  let resend: Server;
  let smtp: SMTPServer;
  const sent: Sent[] = [];
  const mails: Smtp[] = [];
  let reply: Reply = { status: 200, json: { id: "email_123" } };
  let smtpReply: SmtpReply = { auth: "ok", data: "ok" };
  const apps: { proc: ChildProcess; url: string; log: string[] }[] = [];

  const readBody = (req: IncomingMessage) =>
    new Promise<string>((resolve) => {
      let data = "";
      req.on("data", (c) => (data += c));
      req.on("end", () => resolve(data));
    });
  const smtpError = (code: number, text: string) => Object.assign(new Error(text), { responseCode: code });

  async function startApp(port: number, env: Record<string, string | undefined>) {
    const log: string[] = [];
    const clean = { ...process.env };
    for (const k of ["RESEND_API_KEY", "CONTACT_FROM_EMAIL", "CONTACT_TO_EMAIL", "RESEND_API_URL", "GMAIL_USER", "GMAIL_APP_PASSWORD", "GMAIL_SMTP_URL"])
      delete clean[k];
    const proc = spawn("node_modules/.bin/next", ["start", "-p", String(port)], { env: { ...clean, ...env }, stdio: ["ignore", "pipe", "pipe"] });
    proc.stdout!.on("data", (d) => log.push(String(d)));
    proc.stderr!.on("data", (d) => log.push(String(d)));
    const url = `http://localhost:${port}`;
    for (let i = 0; i < 100; i++) {
      try {
        if ((await fetch(url)).ok) break;
      } catch {}
      await new Promise((r) => setTimeout(r, 200));
    }
    const app = { proc, url, log };
    apps.push(app);
    return app;
  }

  let gmail: Awaited<ReturnType<typeof startApp>>;
  let gmailHalf: Awaited<ReturnType<typeof startApp>>;
  let resendOnly: Awaited<ReturnType<typeof startApp>>;
  let noMail: Awaited<ReturnType<typeof startApp>>;

  test.beforeAll(async ({}, info) => {
    test.skip(info.project.name !== "desktop", "server-only: one project is enough");
    resend = createServer(async (req, res) => {
      sent.push({ auth: req.headers.authorization, body: JSON.parse(await readBody(req)) });
      res.writeHead(reply.status, { "Content-Type": "application/json" }).end(JSON.stringify(reply.json));
    });
    await new Promise<void>((r) => resend.listen(0, r));
    smtp = new SMTPServer({
      logger: false,
      disabledCommands: ["STARTTLS"],
      authMethods: ["PLAIN", "LOGIN"],
      onAuth(auth, _session, cb) {
        if (smtpReply.auth === 535) return cb(smtpError(535, "5.7.8 Username and Password not accepted."));
        cb(null, { user: `${auth.username}\n${auth.password}` });
      },
      onData(stream, session, cb) {
        simpleParser(stream).then((mail) => {
          if (smtpReply.data !== "ok") return cb(smtpError(smtpReply.data.code, smtpReply.data.text));
          const [user, pass] = String(session.user).split("\n");
          mails.push({ user, pass, mail });
          cb();
        }, cb);
      },
    });
    await new Promise<void>((r) => smtp.listen(0, "127.0.0.1", r));
    const resendUrl = `http://127.0.0.1:${(resend.address() as AddressInfo).port}`;
    const smtpUrl = `smtp://127.0.0.1:${(smtp.server.address() as AddressInfo).port}`;
    const port = 3300 + Math.floor(Math.random() * 400);
    [gmail, gmailHalf, resendOnly, noMail] = await Promise.all([
      // Resend is set too: Gmail must win
      startApp(port, { ...GMAIL, GMAIL_SMTP_URL: smtpUrl, RESEND_API_KEY: "re_test_key", RESEND_API_URL: resendUrl }),
      startApp(port + 1, { GMAIL_USER: GMAIL.GMAIL_USER, GMAIL_SMTP_URL: smtpUrl, RESEND_API_KEY: "re_test_key", RESEND_API_URL: resendUrl }),
      startApp(port + 2, { RESEND_API_KEY: "re_test_key", RESEND_API_URL: resendUrl }),
      startApp(port + 3, { GMAIL_SMTP_URL: smtpUrl, RESEND_API_URL: resendUrl }),
    ]);
  });

  test.afterAll(async () => {
    for (const a of apps) a.proc.kill();
    if (resend) await new Promise((r) => resend.close(r));
    if (smtp) await new Promise<void>((r) => smtp.close(() => r()));
  });

  test.beforeEach(() => {
    sent.length = 0;
    mails.length = 0;
    reply = { status: 200, json: { id: "email_123" } };
    smtpReply = { auth: "ok", data: "ok" };
  });

  let ip = 0;
  const post = (base: string, body: unknown, headers: Record<string, string> = {}) =>
    fetch(`${base}/api/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Forwarded-For": `10.0.0.${++ip}`, ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    });

  test("Gmail: From GMAIL_USER, To the owner, Reply-To the visitor, escaped; Resend untouched", async () => {
    const res = await post(gmail.url, { ...VALID, name: "Ada <b>Lovelace</b>", message: "Hi <script>alert(1)</script>\nLine two" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mails).toHaveLength(1);
    expect(sent).toHaveLength(0);
    const { user, pass, mail } = mails[0];
    expect(user).toBe("site@example.com");
    expect(pass).toBe("abcdefghijklmnop"); // the spaces Google shows are dropped
    expect(mail.from?.value[0]).toEqual({ name: `${profile.name} · website`, address: "site@example.com" });
    expect(mail.to && !Array.isArray(mail.to) ? mail.to.value.map((a) => a.address) : []).toEqual([OWNER]);
    expect(mail.replyTo?.value[0].address).toBe("ada@example.com");
    expect(mail.subject).toBe(`[${HOST}] A course question (from Ada <b>Lovelace</b>)`);
    expect(mail.text).toContain("From: Ada <b>Lovelace</b> <ada@example.com>\nSubject: A course question\n\nHi <script>alert(1)</script>\nLine two");
    expect(mail.html).toContain("Ada &lt;b&gt;Lovelace&lt;/b&gt; &lt;ada@example.com&gt;");
    expect(mail.html).toContain("Hi &lt;script&gt;alert(1)&lt;/script&gt;");
    expect(String(mail.html)).not.toContain("<script>");
  });

  test("Gmail: never sends From the visitor, and strips line breaks from the subject", async () => {
    await post(gmail.url, { ...VALID, subject: "Hi\r\nBcc: victim@example.com" });
    const { mail } = mails[0];
    expect(mail.from?.value[0].address).toBe("site@example.com");
    expect(mail.subject).toBe(`[${HOST}] Hi Bcc: victim@example.com (from Ada Lovelace)`);
    expect(mail.bcc).toBeUndefined();
  });

  test("Gmail login refused (535) → unavailable; the log names both settings, never the password", async () => {
    smtpReply = { auth: 535, data: "ok" };
    const res = await post(gmail.url, VALID);
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, reason: "unavailable", email: OWNER });
    const log = gmail.log.join("");
    expect(log).toContain("[contact] Gmail refused the email (535");
    expect(log).toContain("Check GMAIL_USER / GMAIL_APP_PASSWORD");
    expect(log).not.toMatch(/abcd ?efgh/);
  });

  test("Gmail refusing the message for good (550) → unavailable; for now (451) → 502 failed", async () => {
    smtpReply = { auth: "ok", data: { code: 550, text: "5.4.5 Daily user sending limit exceeded." } };
    let res = await post(gmail.url, VALID);
    expect(res.status).toBe(503);
    expect(gmail.log.join("")).toContain("Gmail refused the email (550");
    smtpReply = { auth: "ok", data: { code: 451, text: "4.3.0 Mail server temporarily rejected message." } };
    res = await post(gmail.url, VALID);
    expect(res.status).toBe(502);
    expect((await res.json()).reason).toBe("failed");
    expect(gmail.log.join("")).toContain("Gmail couldn't send right now (451");
  });

  test("only one Gmail variable set: 503, nothing sent (not even through Resend), the log names the missing one", async () => {
    const res = await post(gmailHalf.url, VALID);
    expect(res.status).toBe(503);
    expect(mails).toHaveLength(0);
    expect(sent).toHaveLength(0);
    expect(gmailHalf.log.join("")).toContain("[contact] GMAIL_APP_PASSWORD is not set");
  });

  test("nothing set: 503 unavailable, the log names the Gmail settings", async () => {
    const res = await post(noMail.url, VALID);
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, reason: "unavailable", email: OWNER });
    expect(mails).toHaveLength(0);
    expect(sent).toHaveLength(0);
    expect(noMail.log.join("")).toContain("[contact] GMAIL_USER and GMAIL_APP_PASSWORD are not set");
  });

  test("Resend fallback (only RESEND_API_KEY): sends through Resend from its test sender, and says why once", async () => {
    const res = await post(resendOnly.url, VALID);
    expect(res.status).toBe(200);
    expect(mails).toHaveLength(0);
    const { auth, body } = sent[0];
    expect(auth).toBe("Bearer re_test_key");
    expect(body.from).toBe("Pocket Portfolio <onboarding@resend.dev>");
    expect(body.to).toEqual([OWNER]);
    expect(body.reply_to).toBe("ada@example.com");
    expect(body.subject).toBe(`[${HOST}] A course question (from Ada Lovelace)`);
    expect(resendOnly.log.join("")).toContain("CONTACT_FROM_EMAIL is not set: sending from onboarding@resend.dev");
  });

  test("Resend refusing the settings (403 test sender) → unavailable, with the fix in the log", async () => {
    reply = { status: 403, json: { name: "validation_error", message: "You can only send testing emails to your own email address (a@b.c)." } };
    const res = await post(resendOnly.url, VALID);
    expect(res.status).toBe(503);
    expect((await res.json()).reason).toBe("unavailable");
    expect(resendOnly.log.join("")).toContain("Resend refused the email (403 validation_error");
    expect(resendOnly.log.join("")).toContain("Verify a domain at resend.com/domains");
  });

  test("Resend down (500) → 502 failed, which the form offers to retry", async () => {
    reply = { status: 500, json: { name: "internal_server_error", message: "boom" } };
    const res = await post(resendOnly.url, VALID);
    expect(res.status).toBe(502);
    expect((await res.json()).reason).toBe("failed");
  });

  test("validation errors: 400 with a message per field; bad JSON is 400 too", async () => {
    const res = await post(gmail.url, { name: "A", email: "nope", subject: "x", message: "short" });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.reason).toBe("invalid");
    expect(Object.keys(json.fieldErrors).sort()).toEqual(["email", "message", "name", "subject"]);
    expect((await post(gmail.url, "{bad")).status).toBe(400);
    expect(mails).toHaveLength(0);
  });

  test("a filled honeypot looks like success and sends nothing", async () => {
    const res = await post(gmail.url, { ...VALID, company: "Spam Inc" });
    expect(res.status).toBe(200);
    expect(mails).toHaveLength(0);
  });

  test("another site can't post to it", async () => {
    const res = await post(gmail.url, VALID, { Origin: "https://evil.example" });
    expect(res.status).toBe(403);
    expect(mails).toHaveLength(0);
  });

  test("rate limits: 3 sent per hour, then 429 with Retry-After", async () => {
    const headers = { "X-Forwarded-For": "10.9.9.9" };
    for (let i = 0; i < 3; i++) expect((await post(gmail.url, VALID, headers)).status).toBe(200);
    const res = await post(gmail.url, VALID, headers);
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("retry-after"))).toBeGreaterThan(0);
    const json = await res.json();
    expect(json.reason).toBe("rate-limited");
    expect(json.retryAfter).toBeGreaterThan(0);
    expect(mails).toHaveLength(3);
  });

  test("rate limits: failed attempts are capped too (5 per 10 minutes)", async () => {
    smtpReply = { auth: "ok", data: { code: 451, text: "4.3.0 Try again later." } };
    const headers = { "X-Forwarded-For": "10.8.8.8" };
    for (let i = 0; i < 5; i++) expect((await post(gmail.url, VALID, headers)).status).toBe(502);
    expect((await post(gmail.url, VALID, headers)).status).toBe(429);
  });
});
