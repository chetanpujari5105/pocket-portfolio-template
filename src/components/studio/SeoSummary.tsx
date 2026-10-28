import { courses } from "@content/courses";
import { expertise } from "@content/expertise";
import { platforms } from "@content/platforms";
import { profile } from "@content/profile";
import { story } from "@content/story";
import { projects } from "@content/projects";
import { services } from "@content/services";
import { timeline } from "@content/timeline";
import type { FeedPost } from "@/components/os/server-data";

/**
 * Visually hidden semantic summary of the whole site, in the server HTML, so
 * crawlers and screen-reader users get the content without opening any app.
 */
export function SeoSummary({ posts }: { posts: FeedPost[] }) {
  return (
    <article className="sr-only" aria-label="Site summary">
      <h1>
        {profile.name} — {profile.headline}
      </h1>
      <p>{profile.subHeadline}</p>
      <p>{profile.intro}</p>

      <section>
        <h2>My story</h2>
        {story.map((p) => (
          <p key={p}>{p}</p>
        ))}
        <p>
          {profile.location} · {profile.education}
        </p>
        <ul>
          {timeline.map((t) => (
            <li key={t.year}>
              {t.year}: {t.text}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Courses</h2>
        <ul>
          {courses.map((c) => (
            <li key={c.id}>
              <a href={c.url}>{c.title}</a> — {c.badge}, {c.platform}. {c.blurb}
            </li>
          ))}
        </ul>
        <a href={profile.udemyProfile}>Explore all {profile.stats.courses}+ courses</a>
      </section>

      <section>
        <h2>Services</h2>
        <ul>
          {services.map((s) => (
            <li key={s.id}>
              <strong>{s.title}</strong>: {s.description}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Expertise</h2>
        <ul>
          {expertise.map((e) => (
            <li key={e.id}>
              {e.title}: {e.tools.join(", ")}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Projects</h2>
        <ul>
          {projects.map((p) => (
            <li key={p.id}>
              <a href={p.url}>{p.name}</a> — {p.description}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Platforms</h2>
        <ul>
          {platforms.primary.map((p) => (
            <li key={p.name}>{p.url ? <a href={p.url}>{p.name}</a> : p.name}</li>
          ))}
        </ul>
        <p>Also available via Packt distribution: {platforms.distribution.join(", ")}.</p>
      </section>

      <section>
        <h2>Writing</h2>
        <ul>
          {posts.slice(0, 8).map((p) => (
            <li key={p.url}>
              <a href={p.url}>{p.title}</a> — {p.subtitle}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          <a href={`mailto:${profile.email}`}>{profile.email}</a> — {profile.responseTime}
        </p>
        <ul>
          {profile.socials.map((s) => (
            <li key={s.id}>
              <a href={s.url}>
                {s.label} ({s.handle})
              </a>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
