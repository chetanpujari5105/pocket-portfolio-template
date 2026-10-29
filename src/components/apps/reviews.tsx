"use client";

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { useMotionValue } from "motion/react";
import * as m from "motion/react-m";
import { useDrag } from "@use-gesture/react";

import { READ_ON, reviewSource, reviews as allReviews } from "@content/reviews";
import type { Review } from "@content/schema";
import { AppHeader, AppScreen, Chip, ChipGroup, ListGroup, ListRow, PushView, useLastValue } from "@/components/ui/app-shell";
import { releaseVelocity } from "@/lib/gesture";
import { animateTo, haptic, project, rubberBand, withVelocity } from "@/lib/motion";
import { openApp } from "@/lib/router";
import { prefersReducedMotion, useOS } from "@/lib/store";
import { cn } from "@/lib/utils";

/*
 * Reviews, laid out like the App Store's "Ratings & Reviews": a large title, a summary card, a
 * paged carousel of the strongest quotes on glass, and "See All Reviews", which pushes the full
 * inset-grouped list with course filters. Every word of every review comes from content/reviews.ts,
 * copied from the platform in `reviewSource`; the summary is computed from those reviews only.
 * Entries marked `sample` wear a "Sample" tag until they are replaced. Type is in rem, so
 * Settings → Larger text scales all of it.
 */

/* ───────────────────────── Pieces ───────────────────────── */

/** Our own five-point star on a 24 grid (filled; the empty ones are the same shape, faded). */
function StarGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M12 2.9c.4 0 .7.2.9.6l2.3 4.7 5.2.8c.8.1 1.1 1.1.5 1.7l-3.8 3.6.9 5.2c.1.8-.7 1.4-1.4 1L12 18l-4.6 2.5c-.7.4-1.5-.2-1.4-1l.9-5.2-3.8-3.6c-.6-.6-.3-1.6.5-1.7l5.2-.8 2.3-4.7c.2-.4.5-.6.9-.6Z" />
    </svg>
  );
}

function Stars({ rating, size = "size-[0.8125rem]" }: { rating: number; size?: string }) {
  return (
    <span role="img" aria-label={`${rating} out of 5 stars`} className="inline-flex gap-[1px] text-ios-orange">
      {Array.from({ length: 5 }, (_, i) => (
        <StarGlyph key={i} className={cn(size, i >= rating && "opacity-25")} />
      ))}
    </span>
  );
}

/** The first sentence (shown bold, like a review title) and the rest. Nothing is dropped. */
function splitLead(text: string): [string, string] {
  const match = text.match(/^(.+?[.!?;])\s+(\S[\s\S]*)$/);
  return match ? [match[1], match[2]] : [text, ""];
}

/** A relative label like "4 years ago" (read on READ_ON) as the year it points at; anything else as written. */
function yearOf(label: string) {
  const match = label.match(/^(\d+|a|an) (year|month|week|day)s? ago$/);
  const read = new Date(READ_ON);
  if (!match) return label;
  const n = /^\d+$/.test(match[1]) ? Number(match[1]) : 1;
  const days = { year: 365, month: 30.4, week: 7, day: 1 }[match[2] as "year" | "month" | "week" | "day"] * n;
  return String(new Date(read.getTime() - days * 86_400_000).getFullYear());
}

const byline = (r: Review) => `${r.author} · ${yearOf(r.date)}`;

/** Marks a placeholder review, so nobody mistakes the template's samples for real ones. */
function SampleTag({ review }: { review: Review }) {
  if (!review.sample) return null;
  return (
    <span data-sample-tag className="shrink-0 rounded-full bg-ios-fill-tertiary px-2 py-[1px] text-ios-caption-1 font-semibold text-app-muted">
      Sample
    </span>
  );
}

/* ───────────────────────── Summary ───────────────────────── */

function Summary({ reviews }: { reviews: Review[] }) {
  const count = reviews.length;
  const average = reviews.reduce((sum, r) => sum + r.rating, 0) / count;
  const bars = [5, 4, 3, 2, 1].map((stars) => ({ stars, share: reviews.filter((r) => r.rating === stars).length / count }));
  return (
    <section aria-label="Ratings summary" className="mb-6 rounded-ios-xxl bg-app-group px-4 pt-3.5 pb-3">
      <div className="flex items-center gap-5">
        <div className="shrink-0 text-center">
          <p className="text-[3.5rem] leading-none font-bold tracking-[-0.03em] tabular-nums">{average.toFixed(1)}</p>
          <p className="mt-1 text-ios-footnote font-semibold text-app-muted">out of 5</p>
        </div>
        <div className="min-w-0 flex-1">
          <ul aria-hidden className="space-y-[3px]">
            {bars.map((b) => (
              <li key={b.stars} className="flex items-center gap-2">
                <span className="flex w-[2.75rem] justify-end gap-[1px] text-app-muted">
                  {Array.from({ length: b.stars }, (_, i) => (
                    <StarGlyph key={i} className="size-[0.4375rem]" />
                  ))}
                </span>
                <span className="h-[3px] flex-1 overflow-hidden rounded-full bg-ios-fill-tertiary">
                  <span className="block h-full rounded-full bg-app-muted" style={{ width: `${b.share * 100}%` }} />
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-right text-ios-footnote text-app-muted">
            {count} reviews shown here
          </p>
        </div>
      </div>
      <p className="mt-3 border-t-[0.5px] border-app-divider pt-2.5 text-ios-footnote leading-[1.125rem] text-app-muted">
        {reviews.some((r) => r.sample) ? (
          <>Sample reviews: replace them with real ones copied from {reviewSource.name} (see CONTENT.md).</>
        ) : (
          <>
            {reviewSource.totals &&
              `On ${reviewSource.name}: ${reviewSource.totals.reviews.toLocaleString("en-US")} reviews and ${reviewSource.totals.people.toLocaleString("en-US")} ${reviewSource.totals.peopleLabel}. `}
            The ones here are copied word for word from {reviewSource.name}.
          </>
        )}
      </p>
    </section>
  );
}

/* ───────────────────────── Carousel ───────────────────────── */

const GAP = 12;

function ReviewCard({ review, active }: { review: Review; active: boolean }) {
  const [lead, rest] = splitLead(review.text);
  return (
    <article
      aria-roledescription="slide"
      aria-label={`Review by ${review.author}`}
      aria-hidden={!active || undefined}
      className="review-card flex h-full flex-col p-4"
    >
      <span className="flex items-center justify-between gap-2">
        <Stars rating={review.rating} />
        <SampleTag review={review} />
      </span>
      <h3 className="mt-2 line-clamp-2 text-ios-headline font-semibold">{lead}</h3>
      {rest && <p className="mt-1 line-clamp-4 text-ios-subheadline text-app-muted">{rest}</p>}
      <span className="mt-auto pt-3">
        <span className="block truncate text-ios-footnote font-semibold">{byline(review)}</span>
        <span className="block truncate text-ios-footnote text-app-muted">{review.course}</span>
      </span>
    </article>
  );
}

/**
 * The strongest quotes, one page at a time. It follows the finger, rubber-bands at both ends and
 * lands on the page the flick is heading for (one page per flick at most, like the App Store),
 * carrying the release velocity into the spring. Arrow keys and the page dots move it too.
 */
function Carousel({ reviews }: { reviews: Review[] }) {
  const viewport = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [page, setPage] = useState(0);
  const [cardW, setCardW] = useState(0);
  const pageW = cardW + GAP;
  const last = reviews.length - 1;

  // Cards are 88% of the screen's content width, so the next one peeks in
  useLayoutEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const measure = () => setCardW(Math.round(el.clientWidth * 0.88));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Keep the current page in place when the width changes (rotation, Larger text)
  useEffect(() => {
    if (pageW > GAP) x.set(-page * pageW);
    // Only on a width change; paging animates on its own
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageW]);

  const goTo = (next: number, velocity = 0) => {
    const target = Math.max(0, Math.min(last, next));
    if (target !== page) haptic(6);
    setPage(target);
    if (prefersReducedMotion()) x.set(-target * pageW);
    else animateTo(x, -target * pageW, withVelocity("snappy", velocity));
  };

  useDrag(
    (s) => {
      const [mx] = s.movement;
      const base = -page * pageW;
      if (s.first) x.stop();
      const raw = base + mx;
      const min = -last * pageW;
      x.set(raw > 0 ? rubberBand(raw, pageW) : raw < min ? min - rubberBand(min - raw, pageW) : raw);
      if (!s.last) return;
      const v = releaseVelocity(s, 0);
      // Where the flick would coast to, limited to the neighbouring pages
      const landing = Math.round(-(raw + project(v)) / pageW);
      goTo(Math.max(page - 1, Math.min(page + 1, landing)), v);
    },
    { target: viewport, axis: "x", filterTaps: true, threshold: 6, pointer: { capture: true } },
  );

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight") goTo(page + 1);
    else if (e.key === "ArrowLeft") goTo(page - 1);
    else return;
    e.preventDefault();
  };

  return (
    <section aria-roledescription="carousel" aria-label="Featured reviews" className="mb-6">
      <div className="relative">
        {/* Soft colour under the glass, so the cards read as a material */}
        <span aria-hidden className="review-glow pointer-events-none absolute -inset-x-4 -inset-y-6" />
        <div
          ref={viewport}
          tabIndex={0}
          onKeyDown={onKeyDown}
          data-review-carousel
          aria-label={`Review ${page + 1} of ${reviews.length}. Use the arrow keys to move.`}
          className="relative -mx-4 -my-4 touch-pan-y overflow-hidden px-4 py-4 outline-none focus-visible:ring-2 focus-visible:ring-ios-blue focus-visible:ring-inset"
        >
          <m.ul style={{ x }} className="flex items-stretch" aria-live="polite">
            {reviews.map((r, i) => (
              <li key={r.id} data-review-slide={i} style={{ width: cardW || "88%", marginRight: GAP }} className="shrink-0">
                <ReviewCard review={r} active={i === page} />
              </li>
            ))}
          </m.ul>
        </div>
      </div>
      <div role="tablist" aria-label="Pages" className="relative z-1 mt-3 flex justify-center gap-[7px]">
        {reviews.map((r, i) => (
          <button
            key={r.id}
            type="button"
            role="tab"
            aria-selected={i === page}
            aria-label={`Review ${i + 1}`}
            tabIndex={-1}
            onClick={() => goTo(i)}
            className={cn(
              "size-[7px] rounded-full transition-[background-color,transform] duration-200",
              i === page ? "bg-app-ink" : "bg-ios-label-tertiary",
            )}
          />
        ))}
      </div>
    </section>
  );
}

/* ───────────────────────── All reviews ───────────────────────── */

function AllReviews({ reviews }: { reviews: Review[] }) {
  const courses = [...new Set(reviews.map((r) => r.courseShort))];
  const [filter, setFilter] = useState<string | null>(null);
  const shown = filter ? reviews.filter((r) => r.courseShort === filter) : reviews;
  return (
    <AppScreen>
      <AppHeader title="All Reviews" backLabel="Back to Reviews" />
      <ChipGroup label="Filter by course" className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <Chip active={!filter} onClick={() => setFilter(null)}>
          All
        </Chip>
        {courses.map((c) => (
          <Chip key={c} active={filter === c} onClick={() => setFilter(c)}>
            {c}
          </Chip>
        ))}
      </ChipGroup>
      <ListGroup footer={`Tap a review to open its course on ${reviewSource.name}.`}>
        {shown.map((r) => {
          const [lead, rest] = splitLead(r.text);
          return (
            <a
              key={r.id}
              data-review-row={r.id}
              href={r.courseUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${r.author}, ${r.rating} stars: ${r.text} Course: ${r.course}.${r.sample ? " Sample review." : ""} Opens on ${reviewSource.name}.`}
              className="block px-4 py-3 transition-colors duration-150 active:bg-ios-fill-tertiary"
            >
              <span className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  <Stars rating={r.rating} />
                  <SampleTag review={r} />
                </span>
                <span className="truncate text-ios-footnote text-app-muted">{byline(r)}</span>
              </span>
              <span className="mt-1.5 block text-ios-headline font-semibold">{lead}</span>
              {rest && <span className="mt-0.5 block text-ios-subheadline text-app-muted">{rest}</span>}
              <span className="mt-2 block truncate text-ios-footnote text-ios-label-link">{r.course}</span>
            </a>
          );
        })}
      </ListGroup>
    </AppScreen>
  );
}

/* ───────────────────────── The app ───────────────────────── */

export default function ReviewsApp() {
  const sub = useOS((s) => (s.route.app === "reviews" ? s.route.sub : null));
  const shown = useLastValue(sub);
  const reviews: Review[] = allReviews;
  const featured = reviews.filter((r) => r.featured);

  if (!reviews.length)
    return (
      <AppScreen>
        <AppHeader title="Reviews" />
        <div className="mt-16 flex flex-col items-center px-8 text-center">
          <StarGlyph className="size-10 text-ios-label-tertiary" />
          <h2 className="mt-3 text-ios-title-3 font-semibold">No reviews here yet</h2>
          <p className="mt-1 text-ios-subheadline text-app-muted">Reviews live on {reviewSource.name} for now.</p>
          <a href={reviewSource.url} target="_blank" rel="noopener noreferrer" className="mt-4 text-ios-body text-ios-label-link">
            Open {reviewSource.linkLabel}
          </a>
        </div>
      </AppScreen>
    );

  return (
    <>
      <AppScreen>
        <AppHeader title="Reviews" subtitle={`What people say on ${reviewSource.name}.`} />
        <Summary reviews={reviews} />
        <h2 className="mb-2.5 text-ios-title-3 font-semibold">Most Helpful</h2>
        <Carousel reviews={featured.length ? featured : reviews.slice(0, 8)} />
        <ListGroup>
          <ListRow title="See All Reviews" chevron onClick={() => openApp("reviews", "all")} trailing={<span className="text-ios-body text-app-muted">{reviews.length}</span>} />
          <ListRow title={reviewSource.linkLabel} href={reviewSource.url} />
        </ListGroup>
      </AppScreen>

      <PushView open={sub === "all"} label="All reviews">
        {shown === "all" && <AllReviews reviews={reviews} />}
      </PushView>
    </>
  );
}
