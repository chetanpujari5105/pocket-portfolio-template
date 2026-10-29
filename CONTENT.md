# Editing the site's content

Everything visitors read lives in `content/*.ts`. Components never hard-code copy or personal
settings, so you can change the whole site by editing these files. Every field to change is marked
`// ✏️ EDIT:` (search the folder for `EDIT`). Each file is typed by a Zod schema in
`content/schema.ts`; `npm run content:check` and `npm run build` fail with a clear message if an
edit breaks a schema or a cross-link.

Everything in the template is sample content for a made-up person, "Alex Rivera". Links point at
`example.com`, GitHub at `octocat` (GitHub's own demo account) and the heatmap snapshot is made up.

## Every file, every field

### `profile.ts`: who you are

| Field | What it does |
| --- | --- |
| `name`, `firstName`, `lastName` | Your name. First and last are the two big lines beside the phone. |
| `tagline`, `headline`, `typingLine`, `subHeadline` | Short lines on the desktop page and in search results |
| `role`, `shortBio`, `intro` | Job title, one sentence, and a 2–4 sentence introduction |
| `footerTagline`, `sideLine` | Small lines under your name |
| `location`, `education` | Shown in Journey and Settings → profile |
| `email`, `responseTime` | Contact app; also where the contact form sends unless `CONTACT_TO_EMAIL` is set |
| `status` | The green pill beside the phone ("Available for projects") |
| `avatar` | Your photo: replace `public/content/profile.webp` (square) |
| `badges` | Up to 3 short labels |
| `highlight` | One proud moment (`title`, `text`), shown in Journey |
| `socials` | Your profiles: `{ id, label, handle, url }`. `id` picks the brand mark: `linkedin`, `x`, `instagram`, `ai-instagram` (a second Instagram account), `substack`, `udemy`, `youtube`, `github`. Delete any you don't use. |
| `udemyProfile` | Your main course or portfolio page ("Explore all courses" links here) |
| `youtube`, `youtubeChannelId`, `youtubeLine` | Channel URL; channel id (starts with `UC`, leave `""` if you don't know it); the line shown until a video is found |
| `substack` | Your newsletter or blog home page |
| `github` | Your GitHub username (the page-2 heatmap) |
| `stats` | Your numbers. Keep them honest; they count up on the home screen. |
| `journeySubtitle` | Subtitle of the Journey app |
| `site.url`, `site.title`, `site.description` | Your address, browser title and search description |
| `site.shortName`, `site.mark` | Name under the icon when installed; your initials on the back of the 3D phone |

### `apps.ts`: the home screen

`block` (the 2×2 next to the "Work with me" widget), `row`, `links` (the brand row on page 1; 4
fit) and `dock`. Each item has `label`, `icon` (a glyph name from `src/components/os/icons.tsx`),
`colors` (top and bottom of the tile's gradient) and either `app` (opens inside the phone) or
`href` + `brand` (a brand tile that opens in a new tab). Every social in `profile.socials` that
isn't placed here goes in the Socials folder. `titles` are the app names in the browser tab.
Visitors can rearrange it all (saved in their browser); Settings → Home Screen → Reset brings back yours.

### `lock-notes.ts`: the lock screen

| Field | What it does |
| --- | --- |
| `latestReel` | Your newest reel or short: `app` (the name on the notification), `url`, `title` and `text` (its caption's first lines, word for word) and `posted` (ISO date). `null` removes it. |
| `lockProjectId` | Which project the third notification points at (an id from `projects.ts`) |
| `cityClock` | The small clock under the time: `city` and an IANA `timeZone` such as `"Europe/Lisbon"` |

The first notification is your newest blog post (from the feed, else the first fallback post).
The widgets under the clock are the visitor's battery, your GitHub week and that clock.

### `courses.ts`

`courseCategories` are the filter chips (to add one, also add it to `CourseCategorySchema` in
`schema.ts`). Each course: `id` (URL-safe, becomes `#courses/<id>`), `title`, `platform` (where
it's sold: shown on the Enroll button), `badge` (a short label), `category`, `image`
(`public/content/courses/<id>.webp`, 16:9), `url` (the enroll link), `featured` (exactly one),
`blurb`, `audience`.

### `services.ts`

`servicesTitle`, `servicesIntro`, `servicesFooter`, and per service: `id`, `title` (also the
subject the Contact form opens with), `summary` (one line in the list), `description`, `points`
(3–5, "What you get"), `goodFor`, optional `tools: { label, items }`, optional `chip` (puts it on
the home screen's "Work with me" widget). Each id's tile (glyph and colour) is in
`src/components/apps/service-tile.tsx`: add a line there for a new id.

### `expertise.ts`

Per area: `id`, `title`, `tools`, `relatedCourses` and `relatedServices` (ids from `courses.ts`
and `services.ts`; a wrong id fails the build). Tiles are in `src/components/apps/expertise-tile.tsx`.

### `reviews.ts`

| Field | What it does |
| --- | --- |
| `READ_ON` | The day you copied the reviews; "2 years ago" style dates count back from it |
| `reviewSource` | The platform: `name`, `url` (your profile there), `linkLabel` (the link row), optional `totals: { reviews, people, peopleLabel }` (the platform's own numbers) |
| `reviews` | `{ id, course, courseShort, courseUrl, rating, text, author, date, source, verified, sample?, featured? }` |

**The template ships 4 sample reviews.** Each has `sample: true`, which puts a grey "Sample" tag
on it and makes the summary say "Sample reviews". Replace them with real reviews copied from your
own platform:

1. Open your reviews on the platform where people left them (Udemy instructor dashboard, Google
   Business Profile, Fiverr, Upwork, …).
2. Copy each review **word for word**: the text, the name exactly as the platform shows it, the
   rating and the platform's date label. Never write, edit, shorten, translate or "improve" a
   review, and never invent one. Leave out anyone who asked not to be quoted, and your own
   family or team.
3. Paste each one as an entry, set `source` to the platform's name and `verified: true`, and
   delete the `sample` line. Mark the strongest few `featured: true` (they fill the carousel).
4. Delete the four samples. `npm run content:check` refuses a review that is both `sample` and `verified`.

[`prompts/12-real-reviews.md`](prompts/12-real-reviews.md) does this with Claude Code, read-only
and at human speed.

### `projects.ts`

Per project: `id`, `name`, `tagline` (keep it under ~30 characters: rows are narrow on the 3D
phone), `description`, `category` (`"Apps"`, `"Games"` or `"Web"`), `url` (or `null` when there's
nothing public to open), optional `status` ("Public beta"), `image`
(`public/content/projects/<id>.webp`, 16:10), `stack`, `color`, `featured` (exactly one: the big card).

### The rest

| File | What it holds |
| --- | --- |
| `story.ts` | Your story, as short paragraphs (Journey → My Story). A paragraph that mentions a year also shows on that year's milestone. |
| `timeline.ts` | Journey milestones, oldest first: `{ year, text }`. Text after a `;` becomes the milestone's detail line. |
| `platforms.ts` | `primary`: where people find your work (`name`, `url` or `null`, optional `handle` that must be part of `url`, `logo`); `distribution`: partner names |
| `philosophy.ts` | "Why people trust me" lines in Services |
| `blog.ts` | `substackFeed` (your Substack or any RSS 2.0 feed, or `""`) and `fallbackPosts`, shown when there's no feed |
| `ask.ts` | Copy for the optional Ask app (`NEXT_PUBLIC_ENABLE_ASK=true`). Its answers come only from the files above. |

### Data files (not `content/`)

| File | What it is |
| --- | --- |
| `public/content/github-contributions.json` | The heatmap's fallback when GitHub can't be reached. The template's is made up (`"user": "sample"`). After setting `github`, run `npx tsx scripts/github-snapshot.mts` and commit the result. |
| `public/content/youtube-latest.json` | The YouTube widget's last good video, used when the channel feed fails. Ships as `null` (the widget links your channel). With `youtubeChannelId` set, Vercel refreshes it before every build; `npx tsx scripts/youtube-snapshot.mts` does it by hand. |

## Images

Put images in `public/content/…` and reference them as `/content/…`:

- `public/content/profile.webp`: avatar (square)
- `public/content/courses/<id>.webp`: course images (16:9)
- `public/content/blog/<name>.webp`: fallback blog images (16:9)
- `public/content/projects/<id>.webp`: project screenshots (16:10)

Convert JPG/PNG to WebP with:

```bash
node scripts/optimize-images.mjs <folder-with-jpgs> public/content/<subfolder> 1200
```

`node scripts/make-placeholders.mjs` regenerates the sample images. The blurred previews shown
while an image loads (`src/lib/placeholders.ts`) are rebuilt from your images on every `npm run build`.

## Phone finishes

Four finishes (Burgundy, Electric, Graphite, Chai) are defined in
`src/components/studio/FinishSwatches.tsx` (`FINISH_INFO`) and `src/app/globals.css`
(`:root` for the default, `[data-finish="…"]` for the rest). Change the hex values to match your brand.
