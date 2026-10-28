# Editing the site's content

Everything visitors read lives in `content/*.ts`. Components never hard-code copy or personal
settings, so you can change the site by editing these files only. Every field to change is marked
`// ✏️ EDIT:`. Each file is typed by a Zod schema in `content/schema.ts`; `npm run build` (and
`npm run content:check`) fails with a clear message if an edit breaks a schema or a cross-link.

| File | What it holds |
|---|---|
| `profile.ts` | Name, role, bio, location, email, avatar, socials, GitHub username, YouTube channel id, stats, and `site` (URL, title, description, installed-app name, initials on the phone's back) |
| `story.ts` | Your About story, as short paragraphs (Journey app) |
| `timeline.ts` | Journey milestones: `{ year, text }` |
| `courses.ts` | Courses or products: `{ id, title, platform, badge, category, image, url, featured, blurb, audience }`. Exactly one `featured: true`. |
| `platforms.ts` | Where people find your work (name, profile URL or `null`) and a list of distribution partners |
| `expertise.ts` | Skill areas with tools, plus `relatedCourses` / `relatedServices` ids for the cross-links |
| `services.ts` | Services; `subject` pre-fills the contact form, `chip` puts it on the home widget |
| `philosophy.ts` | "Why people trust me" lines |
| `blog.ts` | Your Substack (or RSS 2.0) feed URL, and fallback posts shown when there's no feed |
| `reviews.ts` | Reviews. **Only `verified: true` reviews are shown.** Verify only real quotes you may publish. |
| `projects.ts` | Projects app: `{ id, name, tagline, description, category, url, image, stack, color, featured }` |
| `ask.ts` | Copy for the optional Ask app. Its answers come only from the files above. |
| `apps.ts` | Home screen + dock layout: label, icon glyph name, gradient colours, and either `app` (opens in the phone) or `href` (new tab) |

## Images

Put images in `public/content/…` and reference them as `/content/…`:

- `public/content/profile.webp` — avatar (square)
- `public/content/courses/<id>.webp` — course images (16:9)
- `public/content/blog/<name>.webp` — fallback blog images (16:9)
- `public/content/projects/<id>.webp` — project screenshots (16:10)

Convert JPG/PNG to WebP with:

```bash
node scripts/optimize-images.mjs <folder-with-jpgs> public/content/<subfolder> 1200
```

`node scripts/make-placeholders.mjs` regenerates the sample images.

## Adding a course

1. Drop the image into `public/content/courses/`.
2. Add an entry to `courses.ts` (category must be one of `courseCategories`; to add a category,
   also add it to `CourseCategorySchema` in `schema.ts`).
3. Optionally reference its `id` from an area in `expertise.ts`.

## Finish colours

The three phone finishes (Electric, Graphite, Chai) are defined in
`src/components/studio/FinishSwatches.tsx` (`FINISH_INFO`) and `src/app/globals.css`
(`[data-finish="…"]`). Change the hex values there to match your brand.
