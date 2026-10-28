"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { ArrowUp, Check, Copy, Mail } from "lucide-react";

import { profile } from "@content/profile";
import { BrandTile } from "@/components/os/BrandIcon";
import { SOCIAL_MARK } from "@/components/os/social-icons";
import {
  AppScreen,
  BackButton,
  ListGroup,
  ListRow,
} from "@/components/ui/app-shell";
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
type Status = "idle" | "sending" | "sent" | "fallback";

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
      <div className="flex items-baseline gap-2">
        <label
          htmlFor={id}
          className="w-[64px] shrink-0 text-[15px] text-app-muted"
        >
          {label}
        </label>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1 pl-[72px] text-[12.5px] text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  );
}

const FIELD_ORDER = ["email", "name", "subject", "message"] as const;

const inputClass =
  "w-full bg-transparent text-[16px] text-app-ink outline-none placeholder:text-app-muted/70 aria-invalid:text-destructive";

export default function ContactApp() {
  const initialSubject = useOS((s) => s.contactSubject);
  const [values, setValues] = useState({
    name: "",
    email: "",
    subject: initialSubject,
    message: "",
    company: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [toast, setToast] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [flying, setFlying] = useState(0);

  const set =
    (key: keyof typeof values) => (e: { target: { value: string } }) => {
      setValues((v) => ({ ...v, [key]: e.target.value }));
      if (errors[key as keyof Errors])
        setErrors((er) => ({ ...er, [key]: undefined }));
    };

  const showToast = (text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(null), 3200);
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

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (status === "sending") return;
    const parsed = ContactSchema.safeParse(values);
    if (!parsed.success) {
      const fe = fieldErrorsOf(parsed.error);
      setErrors(fe);
      // Focus the first invalid field in on-screen order
      const first = FIELD_ORDER.find((f) => fe[f]);
      if (first) document.getElementById(`contact-${first}`)?.focus();
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = (await res.json()) as ContactResult;
      if (data.ok) {
        setFlying((n) => n + 1);
        setStatus("sent");
        setValues({
          name: "",
          email: "",
          subject: "",
          message: "",
          company: "",
        });
        useOS.getState().setContactSubject("");
        useOS.getState().showPill("done", "Message sent");
        showToast(`Sent! ${profile.responseTime}`);
      } else if (data.reason === "invalid") {
        setErrors(data.fieldErrors);
        setStatus("idle");
      } else {
        // The banner explains it; only the rate limit needs its own note
        setStatus("fallback");
        if (data.reason === "rate-limited") showToast("That's a lot of messages — email me directly.");
      }
    } catch {
      setStatus("fallback");
    }
  };

  const describedBy = (k: keyof Errors) =>
    errors[k] ? `contact-${k}-error` : undefined;

  return (
    <>
      <AppScreen>
        <form onSubmit={submit} noValidate aria-label="Contact form">
          <header className="mb-4 flex h-[38px] items-center justify-between">
            <BackButton label="Back to Home" />
            <span className="text-[16px] font-semibold">New Message</span>
            <button
              type="submit"
              aria-label="Send message"
              disabled={status === "sending"}
              className="grid size-[34px] place-items-center rounded-full bg-finish text-finish-ink transition-transform duration-150 ease-out active:scale-[0.9] disabled:opacity-50"
            >
              <ArrowUp className="size-5" strokeWidth={2.6} aria-hidden />
            </button>
          </header>

          <h1 className="mb-4 text-[34px] leading-[1.08] font-bold tracking-[-0.02em]">
            Contact
          </h1>

          {status === "fallback" && (
            <div
              role="status"
              className="mb-4 rounded-[14px] bg-finish/18 px-4 py-3 text-[14px] leading-snug"
            >
              The form isn&apos;t available right now — email me directly at{" "}
              <a
                href={`mailto:${profile.email}`}
                className="font-semibold underline underline-offset-2"
              >
                {profile.email}
              </a>
              .
            </div>
          )}

          <div className="mb-6 overflow-hidden rounded-[14px] bg-app-group [&>*+*]:border-t-[0.5px] [&>*+*]:border-app-divider">
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
                  className="mt-1 text-[12.5px] text-destructive"
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
                  tabIndex={-1}
                  autoComplete="off"
                  value={values.company}
                  onChange={set("company")}
                />
              </label>
            </div>
          </div>
        </form>

        <p className="mb-3 px-1 text-[13.5px] text-app-muted">
          {profile.responseTime}
        </p>

        <ListGroup header="Or reach me directly">
          <ListRow
            onClick={copyEmail}
            leading={
              <Mail
                className="size-5 text-finish-deep dark:text-finish"
                aria-hidden
              />
            }
            title={profile.email}
            trailing={
              <span className="flex items-center gap-1 text-[13px] text-app-muted">
                {copied ? (
                  <Check className="size-4 text-available" aria-hidden />
                ) : (
                  <Copy className="size-4" aria-hidden />
                )}
                {copied ? "Copied" : "Copy"}
              </span>
            }
          />
          {profile.socials
            .filter((s) =>
              ["linkedin", "x", "instagram", "substack", "github"].includes(s.id),
            )
            .map((s) => (
              <ListRow
                key={s.id}
                href={s.url}
                leading={<BrandTile mark={SOCIAL_MARK[s.id]} />}
                title={s.label}
                subtitle={s.handle}
              />
            ))}
        </ListGroup>
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

      <AnimatePresence>
        {toast && (
          <m.div
            role="status"
            initial={{ opacity: 0, transform: "translate(-50%, -12px)" }}
            animate={{
              opacity: 1,
              transform: "translate(-50%, 0px)",
              transition: { duration: 0.22, ease: easeOut },
            }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            className="glass absolute top-[max(env(safe-area-inset-top),12px)] left-1/2 z-30 w-[86%] rounded-[16px] px-4 py-3 text-center text-[14px] font-medium shadow-lg tab:top-[6.5cqh]"
          >
            {toast}
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
}
