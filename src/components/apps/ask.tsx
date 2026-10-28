"use client";

import Image from "next/image";
import { Fragment, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ArrowUp } from "lucide-react";

import { ask } from "@content/ask";
import { courses } from "@content/courses";
import { profile } from "@content/profile";
import { AppHeader, AppScreen } from "@/components/ui/app-shell";
import { ALLOWED_LINKS, COURSE_TOKEN, type AskMessage, type AskResult } from "@/lib/ask";
import { openApp } from "@/lib/router";
import { cn } from "@/lib/utils";

const URL_RE = /(https?:\/\/[^\s)]+)/g;

/** Plain text with allow-listed links; anything else stays text. */
function Linkified({ text }: { text: string }) {
  return text.split(URL_RE).map((part, i) => {
    const clean = part.replace(/[.,!?]+$/, "");
    if (i % 2 === 1 && ALLOWED_LINKS.has(clean))
      return (
        <Fragment key={i}>
          <a href={clean} target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-2">
            {clean.replace(/^https?:\/\/(www\.)?/, "").slice(0, 38)}
          </a>
          {part.slice(clean.length)}
        </Fragment>
      );
    return <Fragment key={i}>{part}</Fragment>;
  });
}

function CourseCard({ id }: { id: string }) {
  const c = courses.find((x) => x.id === id);
  if (!c) return null;
  return (
    <button
      type="button"
      onClick={() => openApp("courses", c.id)}
      className="mt-2 flex w-full items-center gap-2.5 rounded-[12px] bg-app-background p-2 text-left text-app-ink transition-transform duration-150 ease-out active:scale-[0.98]"
    >
      <span className="relative block h-10 w-16 shrink-0 overflow-hidden rounded-[8px]">
        <Image src={c.image} alt="" fill sizes="64px" className="object-cover" />
      </span>
      <span className="min-w-0">
        <span className="line-clamp-2 block text-[13px] leading-snug font-semibold">{c.title}</span>
        <span className="block text-[11.5px] text-app-muted">{c.badge} · View course</span>
      </span>
    </button>
  );
}

function Reply({ text }: { text: string }) {
  const ids: string[] = [];
  const body = text.replace(COURSE_TOKEN, (_, id: string) => (ids.push(id), "")).replace(/\n{3,}/g, "\n\n").trim();
  return (
    <>
      <p className="whitespace-pre-line">
        <Linkified text={body} />
      </p>
      {ids.slice(0, 2).map((id) => (
        <CourseCard key={id} id={id} />
      ))}
    </>
  );
}

function Bubble({ from, children }: { from: "user" | "assistant"; children: ReactNode }) {
  return (
    <li className={cn("flex", from === "user" ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[82%] rounded-[20px] px-3.5 py-2 text-[15px] leading-snug",
          from === "user" ? "rounded-br-[6px] bg-finish text-finish-ink" : "rounded-bl-[6px] bg-app-group",
        )}
      >
        {children}
      </div>
    </li>
  );
}

export default function AskApp() {
  const [messages, setMessages] = useState<AskMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const endRef = useRef<HTMLLIElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Braces matter: scrollIntoView returns a Promise in newer browsers, which React would take as a cleanup
  useEffect(() => {
    if (messages.length || pending) endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages, pending]);

  const send = async (text: string) => {
    const content = text.trim().slice(0, 1000);
    if (!content || pending) return;
    const next = [...messages, { role: "user" as const, content }].slice(-12);
    setMessages(next);
    setDraft("");
    setPending(true);
    setNotice(null);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = (await res.json()) as AskResult;
      if (data.ok) setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
      else if (data.reason === "rate-limited") setNotice("That's a lot of questions for one hour — try again later.");
      else setNotice(ask.unavailable);
    } catch {
      setNotice(ask.unavailable);
    } finally {
      setPending(false);
      inputRef.current?.focus({ preventScroll: true });
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void send(draft);
  };

  return (
    <>
      <AppScreen className="pb-28">
        <AppHeader title={ask.title} subtitle={ask.intro} />

        <ol aria-label="Conversation" aria-live="polite" className="flex flex-col gap-2">
          {messages.length === 0 && (
            <li className="mb-2 flex flex-wrap gap-2">
              {ask.suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void send(s)}
                  className="rounded-full bg-app-group px-3.5 py-2 text-left text-[13.5px] font-medium transition-transform duration-150 ease-out active:scale-[0.96]"
                >
                  {s}
                </button>
              ))}
            </li>
          )}
          {messages.map((m, i) => (
            <Bubble key={i} from={m.role}>
              {m.role === "assistant" ? <Reply text={m.content} /> : m.content}
            </Bubble>
          ))}
          {pending && (
            <Bubble from="assistant">
              <span className="flex gap-1 py-1.5" aria-label={`${profile.firstName} is typing`}>
                {[0, 1, 2].map((d) => (
                  <span
                    key={d}
                    className="size-2 animate-pulse rounded-full bg-app-muted"
                    style={{ animationDelay: `${d * 160}ms` }}
                  />
                ))}
              </span>
            </Bubble>
          )}
          {notice && (
            <li role="status" className="rounded-[14px] bg-finish/18 px-4 py-3 text-[14px] leading-snug">
              {notice}{" "}
              <a href={`mailto:${profile.email}`} className="font-semibold underline underline-offset-2">
                {profile.email}
              </a>
            </li>
          )}
          <li ref={endRef} aria-hidden className="h-px" />
        </ol>
      </AppScreen>

      <form
        onSubmit={submit}
        className="absolute inset-x-0 bottom-0 z-10 flex items-center gap-2 border-t-[0.5px] border-app-divider bg-app-background/85 px-3 pt-2 pb-[max(env(safe-area-inset-bottom),22px)] backdrop-blur-xl"
      >
        <label htmlFor="ask-input" className="sr-only">
          Your question
        </label>
        <input
          ref={inputRef}
          id="ask-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={1000}
          placeholder={ask.placeholder}
          autoComplete="off"
          className="h-10 min-w-0 flex-1 rounded-full border-[0.5px] border-app-divider bg-app-group px-4 text-[16px] text-app-ink outline-none placeholder:text-app-muted/80"
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={!draft.trim() || pending}
          className="grid size-9 shrink-0 place-items-center rounded-full bg-finish text-finish-ink transition-[transform,opacity] duration-150 ease-out active:scale-[0.9] disabled:opacity-40"
        >
          <ArrowUp className="size-5" strokeWidth={2.6} aria-hidden />
        </button>
      </form>
    </>
  );
}
