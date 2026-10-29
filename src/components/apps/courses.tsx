"use client";

import Image from "next/image";

import { courseCategories, courses } from "@content/courses";
import { profile } from "@content/profile";
import type { Course } from "@content/schema";
import { AppHeader, AppScreen, PushView, useLastValue } from "@/components/ui/app-shell";
import { ProminentButton, Row, Section, TINT, Tile } from "@/components/ui/grouped";
import { blurOf } from "@/lib/placeholders";
import { openApp } from "@/lib/router";
import { useOS } from "@/lib/store";
import { countLabel } from "@/lib/utils";

/*
 * Courses, laid out like Settings: the featured course on top, then one inset-grouped section per
 * category (a thumbnail, the title and its platform badge), each row pushing a detail screen that ends
 * in a single Enroll button. Every word and link comes from content/courses.ts and content/profile.ts.
 */

const featured = courses.find((c) => c.featured) ?? courses[0];

/** The platform's own badge, kept word for word, set small like an App Store label */
const Badge = ({ children }: { children: string }) => (
  <span className="text-ios-footnote font-semibold tracking-wide text-finish-deep dark:text-finish">{children}</span>
);

function Thumb({ course, className, sizes }: { course: Course; className: string; sizes: string }) {
  return (
    <span aria-hidden className={`relative block shrink-0 overflow-hidden bg-app-background ${className}`}>
      <Image src={course.image} {...blurOf(course.image)} alt="" fill sizes={sizes} className="object-cover" />
    </span>
  );
}

function CourseDetail({ course: c }: { course: Course }) {
  return (
    <AppScreen>
      <AppHeader title={c.title} backLabel="Back to Courses" subtitle={c.blurb} />

      <Thumb course={c} className="mb-5 aspect-video w-full rounded-ios-xl" sizes="(max-width: 600px) 100vw, 400px" />

      <Section header="About this course" inset={16}>
        <Row title="Platform" detail={c.platform} />
        <Row title="Category" detail={c.category} />
        <Row title="Badge" detail={<Badge>{c.badge}</Badge>} />
      </Section>

      <Section header="Who it's for" inset={16}>
        <Row title={c.audience} />
      </Section>

      <ProminentButton href={c.url} label={`Enroll in ${c.title} on ${c.platform} (opens in a new tab)`} data={{ "data-enroll": "" }}>
        Enroll on {c.platform}
      </ProminentButton>
    </AppScreen>
  );
}

function CourseRow({ course: c }: { course: Course }) {
  return (
    <Row
      leading={<Thumb course={c} className="h-9 w-16 rounded-ios-s" sizes="64px" />}
      title={c.title}
      secondary={<Badge>{c.badge}</Badge>}
      onPush={() => openApp("courses", c.id)}
      label={`${c.title}, ${c.badge}, details`}
      data={{ "data-course-row": c.id }}
    />
  );
}

export default function CoursesApp() {
  const sub = useOS((s) => (s.route.app === "courses" ? s.route.sub : null));
  const shown = useLastValue(sub);
  const detail = courses.find((c) => c.id === shown);

  return (
    <>
      <AppScreen>
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

        <Section header="Featured" inset={16}>
          <button
            type="button"
            onClick={() => openApp("courses", featured.id)}
            aria-label={`${featured.title}, featured, details`}
            data-course-featured
            className="block w-full p-4 text-left transition-colors duration-150 active:bg-ios-fill-tertiary [@media(hover:hover)]:hover:bg-ios-fill-quaternary"
          >
            <Thumb course={featured} className="aspect-video w-full rounded-ios-l" sizes="(max-width: 600px) 100vw, 380px" />
            <span className="mt-3 block">
              <Badge>{featured.badge}</Badge>
            </span>
            <span className="mt-0.5 block text-ios-title-3 font-semibold">{featured.title}</span>
            <span className="mt-1 block text-ios-subheadline text-app-muted">{featured.blurb}</span>
          </button>
        </Section>

        {courseCategories.map((cat) => {
          const list = courses.filter((c) => c.category === cat);
          if (!list.length) return null;
          return (
            <Section key={cat} header={cat} inset={92}>
              {list.map((c) => (
                <CourseRow key={c.id} course={c} />
              ))}
            </Section>
          );
        })}

        <Section label="More">
          <Row
            leading={<Tile glyph="cap" tint={TINT.orange} />}
            title={`Explore all ${profile.stats.courses}+ courses`}
            href={profile.udemyProfile}
            label={`Explore all ${profile.stats.courses}+ courses on ${courses.find((c) => c.featured)?.platform ?? "my course platform"} (opens in a new tab)`}
            data={{ "data-udemy-profile": "" }}
          />
          <Row leading={<Tile glyph="globe" tint={TINT.blue} />} title="Platforms" onPush={() => openApp("platforms")} />
          <Row
            leading={<Tile glyph="search" tint={TINT.gray} />}
            title="Search"
            onAction={() => useOS.getState().setSpotlightOpen(true)}
          />
        </Section>
      </AppScreen>

      <PushView open={!!sub && !!courses.find((c) => c.id === sub)} label="Course details">
        {detail && <CourseDetail course={detail} />}
      </PushView>
    </>
  );
}
