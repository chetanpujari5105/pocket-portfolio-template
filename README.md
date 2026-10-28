# Pocket Portfolio (template)

A personal website you use like a phone. On desktop a 3D phone sits in a calm studio: drag beside it
to turn it over, and use its screen like a real phone. Every section is an app on the home screen
(Courses, Journey, Expertise, Platforms, Reviews, Projects, Blog, Services, Contact, Settings), with a
Socials folder, a lock screen, home pages (one has a live GitHub heatmap), Control Center, an
app switcher, Spotlight search (⌘K), deep links (`/#courses`) and light/dark themes. Below 600px the
site *is* the phone, and it installs to a home screen as an app.

- **Fits every phone.** The home screen works out its columns, icon size and pages from the screen
  it's on, and it's tested at 17 sizes, from 320×568 to landscape tablets, with browser toolbars and
  the keyboard showing.
- **A home screen visitors can edit.** Long-press (or right-click) an icon to move apps and widgets,
  make folders, remove apps, edit the dock and open the App Library. Settings → Home Screen resets it.
  Changes stay in the visitor's browser.
- **Fast.** Every app's code is on the device before the first tap, so an app opens in the same frame
  as the tap. A service worker makes repeat visits load almost at once, and offline after one visit.

Built with Next.js 16 (App Router, Cache Components), React 19, Tailwind CSS v4, Motion, Zustand,
Zod and React Three Fiber.

**New here? Read [START-HERE.md](START-HERE.md).** All content is sample content for "Alex Rivera";
every field to change is marked `// ✏️ EDIT:` in `content/*.ts` (see [CONTENT.md](CONTENT.md)).
The Claude Code prompts from the guide *Build Your Own Pocket Portfolio* are in [`prompts/`](prompts/).

## Run locally

Requires Node.js 20.9+ (tested on Node 24).

```bash
npm ci
cp .env.example .env.local   # optional: fill in keys (see "Deploy to Vercel")
npm run dev                  # http://localhost:3000
```

Production build:

```bash
npm run build && npm run start   # add `-- -p 3100` for another port
```

## Checks

```bash
npm run lint          # ESLint
npm run typecheck     # TypeScript
npm run content:check # validate content/*.ts against the schemas
npx playwright install chromium   # once
npm test              # Playwright, all checks below (builds and serves on :3100)
npx playwright test --update-snapshots   # after changing content or design
```

`npm test` covers the smoke tests, visual snapshots, the 17-size fit check (`tests/fit.spec.ts`,
sizes in `tests/devices.json`), home-screen editing (`tests/home-edit.spec.ts`) and, last and on
their own, launch timings on a phone slowed to 4× (`tests/speed.spec.ts`). The speed target is
"moving within 50 ms of the tap". Headless Chromium adds a short stall of its own, so a time over
50 ms is noted in the report and only one over 120 ms fails.

`npm test` reuses a server already running on port 3100. If another app holds that port, run
`PORT=3200 npm test`.

Extra scripts (run against a server on :3100):
- `node scripts/check-os.mjs <outDir>`: a click-through.
- `node scripts/a11y.mjs`: axe and keyboard checks.
- `node scripts/fit-shots.mjs`: screenshots at all 17 sizes, to `screenshots/fit/`.
- `node scripts/speed-moments.mjs` and `node scripts/longtasks.mjs`: launch, switch and swipe timings, and long tasks.

Before every `npm run build`, `prebuild` regenerates the blurred image previews in
`src/lib/placeholders.ts` and writes the service worker (`public/sw.js`, from `sw/sw.ts`). It has
to exist before `next build`, because Vercel collects `public/` during the build.

## Deploy to Vercel

1. Push this project to your own GitHub repo.
2. [vercel.com/new](https://vercel.com/new) → import the repo. Next.js is detected; keep the default
   build settings and production branch `main`.
3. Add any variables below under *Settings → Environment Variables* (all optional), then **Deploy**.
4. Add your domain under *Settings → Domains*.

| Variable | Used for | Without it |
|---|---|---|
| `RESEND_API_KEY` | Contact form email via Resend (server only) | Form shows "email me directly" |
| `CONTACT_TO_EMAIL` | Where contact messages go | `profile.email` |
| `CONTACT_FROM_EMAIL` | Sender on a domain verified in Resend, e.g. `Your Name <hello@yourdomain.com>` | `onboarding@resend.dev` (Resend test sender) |
| `NEXT_PUBLIC_ENABLE_ASK` | `true` shows the Ask app | Hidden |
| `OPENAI_API_KEY` | Ask app answers (server only) | App shows "email me directly" |
| `OPENAI_MODEL` | Model for the Ask app | `gpt-5-mini` |
| `GITHUB_TOKEN` | GitHub heatmap via GraphQL; a fine-grained token with no permissions is enough (server only) | Parses the public contributions page |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL for SEO, sitemap and OG images | `VERCEL_PROJECT_PRODUCTION_URL` (set by Vercel), then `site.url` in `content/profile.ts` |

`NEXT_PUBLIC_*` values are baked in at build time, so redeploy after changing them.

## Attribution

- **Built by Chetan Pujari.** Released under the [MIT License](LICENSE).
- The interaction idea was inspired by Prasad Ware's portfolio ([prsd.dev](https://www.prsd.dev/)).
  No code, text, images, icons, fonts or 3D models from it are used.
- Brand marks: [Simple Icons](https://simpleicons.org/) (CC0) and
  [Font Awesome Free](https://fontawesome.com/license/free) (CC BY 4.0, the LinkedIn mark). Use them only
  to link to your own profiles, following each brand's guidelines.
- Map data: [Natural Earth](https://www.naturalearthdata.com/) (public domain).
- App icons, wallpaper shader, phone model and UI are original. Fonts: Geist and Archivo via
  `next/font` (SIL OFL).
