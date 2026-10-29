"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { ArrowUp, Check, LoaderCircle, RotateCw } from "lucide-react";

import { profile } from "@content/profile";
import { BrandTile } from "@/components/os/BrandIcon";
import { SOCIAL_MARK } from "@/components/os/social-icons";
import { AppHeader, AppScreen } from "@/components/ui/app-shell";
import { Row, Section, TINT, Tile } from "@/components/ui/grouped";
import {
  ContactSchema,
  fieldErrorsOf,
  type ContactInput,
  type ContactResult,
} from "@/lib/contact";
import { easeOut } from "@/lib/motion";
import { useOS } from "@/lib/store";
import { cn } from "@/lib/utils";

type Errors = Partial<Record<keyof ContactInput, string>>;
type Status = "idle" | "sending" | "sent";
/** Why the last send didn't go through. Only `unavailable` (email not set up) offers email instead. */
type Problem =
  | { kind: "unavailable" }
  | { kind: "rate-limited"; retryAfter: number }
  | { kind: "failed" }
  | { kind: "network"; offline: boolean };

/*
 * Contact, laid out like Mail's compose sheet inside Settings-style groups: a large title that
 * collapses under the bar (Send stays there), the fields as one inset group, then the ways to reach
 * the owner directly as grouped rows. Type is in rem, so Larger Text scales labels, fields and notes.
 */

const EMPTY = { name: "", email: "", subject: "", message: "", company: "" };

/** "in 12 minutes" / "in a minute" / "in a few seconds" */
function waitFor(seconds: number) {
  if (seconds < 50) return "in a few seconds";
  const minutes = Math.round(seconds / 60);
  return minutes <= 1 ? "in a minute" : `in ${minutes} minutes`;
}

function Field({
  label,
  id,
  error,
  children,
}: {
  label: string;
  id: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="px-4 py-2.5">
      <div className="flex min-h-[1.5rem] items-baseline gap-2">
        <label htmlFor={id} className="w-[5rem] shrink-0 text-ios-body text-app-muted">
          {label}
        </label>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 pl-[5.5rem] text-ios-footnote text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/** A one-line note above the form: sending, sent, or what went wrong (with its fix). */
function Note({ tone, action, children }: { tone: "quiet" | "good" | "warn"; action?: ReactNode; children: ReactNode }) {
  return (
    <div
      className={cn(
        "mb-4 flex items-start gap-2 rounded-ios-xl px-4 py-3 text-ios-subheadline",
        tone === "quiet" && "bg-app-group text-app-secondary",
        tone === "good" && "bg-available/14 text-app-ink",
        tone === "warn" && "bg-finish/18 text-app-ink",
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-2">{children}</div>
      {action}
    </div>
  );
}

function RetryButton({ onRetry }: { onRetry: () => void }) {
  return (
    <button
      type="button"
      onClick={onRetry}
      className="-my-1 flex min-h-[2.75rem] shrink-0 items-center gap-1 rounded-full bg-app-surface px-3 text-ios-footnote font-semibold shadow-[0_1px_2px_rgb(0_0_0/0.08)] transition-transform duration-150 ease-out active:scale-[0.96]"
    >
      <RotateCw className="size-3.5" strokeWidth={2.4} aria-hidden />
      Try again
    </button>
  );
}

const FIELD_ORDER = ["email", "name", "subject", "message"] as const;

const inputClass =
  "w-full bg-transparent text-ios-body text-app-ink outline-none placeholder:text-app-muted/70 aria-invalid:text-destructive";

export default function ContactApp() {
  const initialSubject = useOS((s) => s.contactSubject);
  const [values, setValues] = useState({ ...EMPTY, subject: initialSubject });
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [problem, setProblem] = useState<Problem | null>(null);
  const [copied, setCopied] = useState(false);
  const [flying, setFlying] = useState(0);
  /** One send at a time, even if Send is pressed twice before React re-renders */
  const inFlight = useRef(false);

  const set =
    (key: keyof typeof values) => (e: { target: { value: string } }) => {
      setValues((v) => ({ ...v, [key]: e.target.value }));
      if (errors[key as keyof Errors])
        setErrors((er) => ({ ...er, [key]: undefined }));
      // Writing again: the "Message sent" note has done its job
      if (status === "sent") setStatus("idle");
    };

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(profile.email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      window.location.href = `mailto:${profile.email}`;
    }
  };

  const send = async () => {
    if (inFlight.current) return;
    const parsed = ContactSchema.safeParse(values);
    if (!parsed.success) {
      const fe = fieldErrorsOf(parsed.error);
      setErrors(fe);
      // Focus the first invalid field in on-screen order
      const first = FIELD_ORDER.find((f) => fe[f]);
      if (first) document.getElementById(`contact-${first}`)?.focus();
      return;
    }
    inFlight.current = true;
    setStatus("sending");
    setProblem(null);
    let data: ContactResult | null = null;
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
        signal: AbortSignal.timeout(20_000),
      });
      data = (await res.json().catch(() => null)) as ContactResult | null;
    } catch {
      // No answer at all: offline, a dropped connection or a timeout. The text stays put.
      inFlight.current = false;
      setStatus("idle");
      setProblem({ kind: "network", offline: !navigator.onLine });
      return;
    }
    inFlight.current = false;
    if (data?.ok) {
      setFlying((n) => n + 1);
      setStatus("sent");
      setValues(EMPTY);
      setErrors({});
      useOS.getState().setContactSubject("");
      useOS.getState().showPill("done", "Message sent");
      return;
    }
    setStatus("idle");
    if (data?.reason === "invalid") {
      setErrors(data.fieldErrors);
      const first = FIELD_ORDER.find((f) => data.fieldErrors[f]);
      if (first) document.getElementById(`contact-${first}`)?.focus();
    } else if (data?.reason === "unavailable") setProblem({ kind: "unavailable" });
    else if (data?.reason === "rate-limited") setProblem({ kind: "rate-limited", retryAfter: data.retryAfter });
    else setProblem({ kind: "failed" });
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void send();
  };

  // Their own email app, with what they wrote, when the form can't send it
  const mailto = `mailto:${profile.email}?subject=${encodeURIComponent(values.subject)}&body=${encodeURIComponent(values.message)}`;

  const describedBy = (k: keyof Errors) =>
    errors[k] ? `contact-${k}-error` : undefined;

  return (
    <>
      <AppScreen>
        {/* Send sits in the frosted bar, so it never scrolls away (and stays above the keyboard) */}
        <AppHeader
          title="Contact"
          subtitle={profile.responseTime}
          action={
            <button
              type="submit"
              form="contact-form"
              aria-label={status === "sending" ? "Sending message" : "Send message"}
              data-contact-send
              aria-busy={status === "sending"}
              disabled={status === "sending"}
              className="grid size-[44px] place-items-center rounded-full bg-finish text-finish-ink transition-transform duration-150 ease-out active:scale-[0.9] disabled:opacity-70"
            >
              {status === "sending" ? (
                <LoaderCircle className="size-5 animate-spin" strokeWidth={2.6} aria-hidden />
              ) : (
                <ArrowUp className="size-5" strokeWidth={2.6} aria-hidden />
              )}
            </button>
          }
        />
        <form id="contact-form" onSubmit={submit} noValidate aria-label="Contact form">

          <div aria-live="polite" data-contact-status>
            {status === "sending" && (
              <Note tone="quiet">
                <LoaderCircle className="mt-px size-4 shrink-0 animate-spin" aria-hidden />
                Sending…
              </Note>
            )}
            {status === "sent" && (
              <Note tone="good">
                <Check className="mt-px size-4 shrink-0" strokeWidth={2.6} aria-hidden />
                <span>
                  <strong className="font-semibold">Message sent.</strong> {profile.responseTime}
                </span>
              </Note>
            )}
          </div>
          {problem && (
            <div role="alert" data-contact-problem={problem.kind}>
              {problem.kind === "unavailable" ? (
                <Note tone="warn">
                  <span>
                    Email isn&apos;t set up on this site yet, so the form can&apos;t send. Your message is still here:{" "}
                    <a href={mailto} className="font-semibold underline underline-offset-2">
                      email me directly
                    </a>{" "}
                    at {profile.email}.
                  </span>
                </Note>
              ) : (
                <Note tone="warn" action={<RetryButton onRetry={() => void send()} />}>
                  <span>
                    {problem.kind === "rate-limited"
                      ? `That's a few messages in a row. Try again ${waitFor(problem.retryAfter)}, or email me at ${profile.email}.`
                      : problem.kind === "network"
                        ? problem.offline
                          ? "You're offline. Your message is still here; send it once you're connected."
                          : "Couldn't reach the server. Your message is still here."
                        : "Couldn't send just now. Your message is still here."}
                  </span>
                </Note>
              )}
            </div>
          )}

          <div className="mb-6 overflow-hidden rounded-ios-xxl bg-app-group [&>*+*]:border-t-[0.5px] [&>*+*]:border-app-divider">
            <Field label="To:" id="contact-to">
              <input
                id="contact-to"
                value={profile.email}
                readOnly
                className={cn(inputClass, "text-app-secondary")}
              />
            </Field>
            <Field label="From:" id="contact-email" error={errors.email}>
              <input
                id="contact-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={values.email}
                onChange={set("email")}
                aria-invalid={!!errors.email}
                aria-describedby={describedBy("email")}
                className={inputClass}
              />
            </Field>
            <Field label="Name:" id="contact-name" error={errors.name}>
              <input
                id="contact-name"
                autoComplete="name"
                placeholder="Your name"
                value={values.name}
                onChange={set("name")}
                aria-invalid={!!errors.name}
                aria-describedby={describedBy("name")}
                className={inputClass}
              />
            </Field>
            <Field label="Subject:" id="contact-subject" error={errors.subject}>
              <input
                id="contact-subject"
                placeholder="What's it about?"
                value={values.subject}
                onChange={set("subject")}
                aria-invalid={!!errors.subject}
                aria-describedby={describedBy("subject")}
                className={inputClass}
              />
            </Field>
            <div className="px-4 py-3">
              <label htmlFor="contact-message" className="sr-only">
                Message
              </label>
              <textarea
                id="contact-message"
                rows={7}
                placeholder="Write your message…"
                value={values.message}
                onChange={set("message")}
                aria-invalid={!!errors.message}
                aria-describedby={describedBy("message")}
                className={cn(inputClass, "resize-none leading-relaxed")}
              />
              {errors.message && (
                <p
                  id="contact-message-error"
                  role="alert"
                  className="mt-1 text-ios-footnote text-destructive"
                >
                  {errors.message}
                </p>
              )}
            </div>
            {/* Honeypot */}
            <div
              aria-hidden
              className="absolute -left-[9999px] h-0 overflow-hidden"
            >
              <label>
                Company
                <input
                  name="company"
                  tabIndex={-1}
                  autoComplete="off"
                  value={values.company}
                  onChange={set("company")}
                />
              </label>
            </div>
          </div>
        </form>

        <Section header="Or reach me directly">
          <Row
            leading={<Tile glyph="mail" tint={TINT.blue} />}
            title={<span className="[overflow-wrap:anywhere]">{profile.email}</span>}
            detail={copied ? "Copied" : "Copy"}
            onAction={copyEmail}
            label={copied ? `${profile.email} copied` : `Copy ${profile.email}`}
            data={{ "data-copy-email": "" }}
          />
          {profile.socials
            .filter((s) => ["linkedin", "x", "instagram", "substack", "github"].includes(s.id))
            .map((s) => (
              <Row
                key={s.id}
                leading={<BrandTile mark={SOCIAL_MARK[s.id]} />}
                title={s.label}
                secondary={s.handle}
                href={s.url}
                label={`Open ${s.label} profile (opens in a new tab)`}
                data={{ "data-contact-social": s.id }}
              />
            ))}
        </Section>
      </AppScreen>

      {/* Paper-plane fly-off */}
      <AnimatePresence>
        {flying > 0 && status === "sent" && (
          <m.svg
            key={flying}
            viewBox="0 0 24 24"
            aria-hidden
            className="pointer-events-none absolute top-[45%] left-1/2 z-20 size-14 fill-finish"
            initial={{
              transform: "translate(-50%, 0) rotate(0deg) scale(1)",
              opacity: 1,
            }}
            animate={{
              transform: "translate(160%, -420%) rotate(-18deg) scale(0.4)",
              opacity: 0,
              transition: { duration: 0.9, ease: easeOut },
            }}
            onAnimationComplete={() => setStatus("idle")}
          >
            <path d="M21.6 2.4 2.9 10.1c-.8.3-.8 1.5.1 1.8l6.1 2.3L21.6 2.4Z" />
            <path
              d="M21.6 2.4 9.9 14.9l2.3 6.1c.3.9 1.5.9 1.8.1L21.6 2.4Z"
              opacity=".7"
            />
          </m.svg>
        )}
      </AnimatePresence>

    </>
  );
}
