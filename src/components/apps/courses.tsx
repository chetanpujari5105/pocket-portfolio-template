"use client";

import Image from "next/image";
import { useState } from "react";
import { ArrowUpRight, GraduationCap, Globe2, Search } from "lucide-react";

import { courseCategories, courses } from "@content/courses";
import { profile } from "@content/profile";
import type { CourseCategory } from "@content/schema";
import {
  AppHeader,
  AppNav,
  AppScreen,
  Chip,
  ChipGroup,
  ListGroup,
  Pill,
  PushView,
  SwipeRow,
  useLastValue,
} from "@/components/ui/app-shell";
import { openApp } from "@/lib/router";
import { useOS } from "@/lib/store";
import { blurOf } from "@/lib/placeholders";
import { countLabel } from "@/lib/utils";

const featured = courses.find((c) => c.featured) ?? courses[0];

function Badge({ children }: { children: string }) {
  return (
    <span className="inline-block rounded-[5px] bg-finish/20 px-1.5 py-[2px] text-[9.5px] font-bold tracking-wide text-finish-deep dark:text-finish">
      {children}
    </span>
  );
}

function CourseDetail({ id }: { id: string }) {
  const course = courses.find((c) => c.id === id);
  if (!course) return null;
  return (
    <AppScreen>
      <div className="mb-4">
        <AppNav backLabel="Back to Courses" title={course.title} />
      </div>
      <div className="relative aspect-video overflow-hidden rounded-[18px] bg-app-group">
        <Image
          src={course.image}
          {...blurOf(course.image)}
          alt=""
          fill
          sizes="(max-width: 600px) 100vw, 400px"
          className="object-cover"
        />
      </div>
      <div className="mt-4 flex items-center gap-2">
        <Badge>{course.badge}</Badge>
        <span className="text-[12.5px] text-app-muted">
          {course.platform} · {course.category}
        </span>
      </div>
      <h2 className="mt-2 text-[24px] leading-tight font-bold tracking-tight">
        {course.title}
      </h2>
      <p className="mt-3 text-[15px] leading-relaxed text-app-secondary">
        {course.blurb}
      </p>
      <ListGroup header="Who it's for" className="mt-5">
        <p className="px-4 py-3 text-[15px] leading-relaxed">
          {course.audience}
        </p>
      </ListGroup>
      <Pill
        href={course.url}
        className="w-full py-3 text-[16px]"
        label={`Enroll in ${course.title} on Udemy`}
      >
        Enroll on {course.platform}
      </Pill>
    </AppScreen>
  );
}

export default function CoursesApp() {
  const [filter, setFilter] = useState<CourseCategory | "All">("All");
  const sub = useOS((s) => (s.route.app === "courses" ? s.route.sub : null));
  const shown = useLastValue(sub);
  const list =
    filter === "All" ? courses : courses.filter((c) => c.category === filter);

  return (
    <>
      <AppScreen className="pb-28">
        <AppHeader
          title="Courses"
          subtitle={`${profile.stats.courses}+ courses · ${countLabel(profile.stats.students)} students`}
          action={
            <Image
              src={profile.avatar}
              {...blurOf(profile.avatar)}
              alt={profile.name}
              width={36}
              height={36}
              className="size-9 rounded-full object-cover"
            />
          }
        />

        <ChipGroup
          label="Filter courses"
          className="-mx-4 mb-5 no-scrollbar flex gap-2 overflow-x-auto px-4"
        >
          {(["All", ...courseCategories] as const).map((c) => (
            <Chip key={c} active={filter === c} onClick={() => setFilter(c)}>
              {c}
            </Chip>
          ))}
        </ChipGroup>

        {(filter === "All" || filter === featured.category) && (
          <article className="relative mb-7 overflow-hidden rounded-[22px] bg-[linear-gradient(150deg,var(--accent),var(--accent-deep))] p-4 text-finish-ink shadow-[0_10px_30px_-12px_var(--accent-deep)]">
            <button
              type="button"
              onClick={() => openApp("courses", featured.id)}
              className="block w-full text-left"
              aria-label={`${featured.title} — details`}
            >
              <span className="text-[11px] font-bold tracking-wider uppercase opacity-80">
                Featured · {featured.badge}
              </span>
              <span className="mt-1 block text-[21px] leading-tight font-bold tracking-tight">
                {featured.title}
              </span>
              <span className="relative mt-3 block aspect-video overflow-hidden rounded-[14px] shadow-lg">
                <Image
                  src={featured.image}
                  {...blurOf(featured.image)}
                  alt=""
                  fill
                  sizes="(max-width: 600px) 100vw, 380px"
                  className="object-cover"
                  priority={false}
                />
              </span>
            </button>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-[13px] leading-snug font-medium opacity-85">
                {featured.blurb}
              </span>
              <Pill
                href={featured.url}
                label={`Enroll in ${featured.title}`}
                className="bg-white text-black"
              >
                Enroll
              </Pill>
            </div>
          </article>
        )}

        <ListGroup header="Learn from me">
          {list.map((c) => (
            <SwipeRow
              key={c.id}
              label="Enroll"
              icon={<ArrowUpRight className="size-[18px]" aria-hidden />}
              onAction={() =>
                window.open(c.url, "_blank", "noopener,noreferrer")
              }
            >
              <div className="flex items-center gap-3 px-3 py-3">
                <button
                  type="button"
                  onClick={() => openApp("courses", c.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <span className="relative h-[48px] w-[76px] shrink-0 overflow-hidden rounded-[10px] bg-app-background">
                    <Image
                      src={c.image}
                      {...blurOf(c.image)}
                      alt=""
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </span>
                  <span className="min-w-0">
                    <span className="line-clamp-2 text-[14px] leading-snug font-semibold">
                      {c.title}
                    </span>
                    <span className="mt-1 flex items-center gap-1.5">
                      <Badge>{c.badge}</Badge>
                      <span className="text-[11.5px] text-app-muted">
                        {c.platform}
                      </span>
                    </span>
                  </span>
                </button>
                <Pill
                  href={c.url}
                  label={`Enroll in ${c.title}`}
                  className="bg-app-background px-3 text-[12.5px] text-finish-deep dark:text-finish"
                >
                  Enroll
                </Pill>
              </div>
            </SwipeRow>
          ))}
        </ListGroup>

        <a
          href={profile.udemyProfile}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between rounded-[14px] bg-app-group px-4 py-4 text-[15px] font-semibold transition-transform duration-150 active:scale-[0.98]"
        >
          Explore all {profile.stats.courses}+ courses
          <span aria-hidden className="text-finish-deep dark:text-finish">
            →
          </span>
        </a>
      </AppScreen>

      <nav
        aria-label="Courses tabs"
        className="glass absolute inset-x-6 bottom-[calc(max(env(safe-area-inset-bottom),8px)+22px)] z-5 flex justify-around rounded-full py-1.5 shadow-[0_8px_24px_rgb(0_0_0/0.14)]"
      >
        <span
          className="flex flex-col items-center px-4 text-[10.5px] font-semibold text-finish-deep dark:text-finish"
          aria-current="page"
        >
          <GraduationCap className="size-5" aria-hidden />
          Courses
        </span>
        <button
          type="button"
          onClick={() => openApp("platforms")}
          className="flex flex-col items-center px-4 text-[10.5px] font-medium text-app-muted"
        >
          <Globe2 className="size-5" aria-hidden />
          Platforms
        </button>
        <button
          type="button"
          onClick={() => useOS.getState().setSpotlightOpen(true)}
          className="flex flex-col items-center px-4 text-[10.5px] font-medium text-app-muted"
        >
          <Search className="size-5" aria-hidden />
          Search
        </button>
      </nav>

      <PushView open={!!sub} label="Course details">
        {shown && <CourseDetail id={shown} />}
      </PushView>
    </>
  );
}
