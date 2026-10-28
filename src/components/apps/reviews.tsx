"use client";

import { profile } from "@content/profile";
import { verifiedReviews } from "@content/reviews";
import { AppHeader, AppScreen, Pill, Stars } from "@/components/ui/app-shell";

/** Only reviews marked `verified: true` in content/reviews.ts are ever shown. */
export default function ReviewsApp() {
  return (
    <AppScreen>
      <AppHeader title="Reviews" subtitle="What people say." />

      {verifiedReviews.length === 0 ? (
        <div className="mt-10 flex flex-col items-center px-6 text-center">
          <span aria-hidden className="grid size-16 place-items-center rounded-[20px] bg-[linear-gradient(165deg,#ffd76a,#f08a00)] text-[30px] text-white">
            ★
          </span>
          <h2 className="mt-4 text-[20px] font-bold tracking-tight">Stories coming soon</h2>
          <p className="mt-1.5 text-[14.5px] leading-snug text-app-muted">
            Meanwhile, you can read reviews on my course pages.
          </p>
          <Pill href={profile.udemyProfile} className="mt-5">
            Read reviews
          </Pill>
        </div>
      ) : (
        <ul
          aria-label="Student reviews"
          className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2"
        >
          {verifiedReviews.map((r) => (
            <li key={r.name} className="w-[86%] shrink-0 snap-center rounded-[20px] bg-app-group p-5">
              <Stars rating={r.rating} />
              <blockquote className="mt-3 text-[15.5px] leading-relaxed">“{r.quote}”</blockquote>
              <p className="mt-4 text-[14px] font-semibold">{r.name}</p>
              <p className="text-[12.5px] text-app-muted">
                {r.role}, {r.city}
              </p>
            </li>
          ))}
        </ul>
      )}
    </AppScreen>
  );
}
