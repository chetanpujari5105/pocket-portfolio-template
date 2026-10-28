import { courses } from "@content/courses";
import { profile } from "@content/profile";
import { SITE_URL } from "@/lib/site";

/** schema.org Person + the courses, built from /content. */
export function JsonLd() {
  const person = {
    "@type": "Person",
    "@id": `${SITE_URL}/#person`,
    name: profile.name,
    jobTitle: profile.role,
    description: profile.shortBio,
    url: SITE_URL,
    image: `${SITE_URL}${profile.avatar}`,
    email: `mailto:${profile.email}`,
    address: { "@type": "PostalAddress", addressLocality: profile.location },
    alumniOf: profile.education,
    sameAs: [...profile.socials.map((s) => s.url), profile.udemyProfile, profile.youtube],
  };
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      person,
      ...courses.map((c) => ({
        "@type": "Course",
        name: c.title,
        description: c.blurb,
        url: c.url,
        image: `${SITE_URL}${c.image}`,
        provider: { "@type": "Organization", name: c.platform },
        instructor: { "@id": `${SITE_URL}/#person` },
      })),
    ],
  };
  return (
    <script
      type="application/ld+json"
      // Escape "<" so content can never close the script tag
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph).replace(/</g, "\\u003c") }}
    />
  );
}
