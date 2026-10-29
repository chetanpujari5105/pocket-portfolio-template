# Start here

A personal website that works like a phone. Everything visitors read is sample content for a
made-up person, "Alex Rivera". Replace it with yours in five steps. You need Node.js 20.9+ (LTS)
and Git, and about 3 GB of free disk space.

## The quick way: let Claude Code do it

Every prompt is in [`prompts/`](prompts/), one file each. The template already includes everything
the build prompts make, so start with [`prompts/02-personalize.md`](prompts/02-personalize.md):
fill in a `my-content.md` worksheet, open Claude Code in this folder and paste the prompt. Then
[`prompts/12-real-reviews.md`](prompts/12-real-reviews.md) for your reviews,
[`prompts/11-apple-style-polish.md`](prompts/11-apple-style-polish.md) for a final polish and
[`prompts/09-fix-list.md`](prompts/09-fix-list.md) for changes afterwards. The steps below are the
same work by hand.

## 1. Get your copy

Click **Use this template** on GitHub (or the **Deploy with Vercel** button in the README, which
also deploys it), then clone your copy:

```bash
git clone https://github.com/<you>/<your-repo>.git
cd <your-repo>
npm ci
npm run dev          # open http://localhost:3000
```

## 2. Fill in `/content`

Open each file in `content/` and change every line marked `// ✏️ EDIT:` (search for `EDIT`).
[CONTENT.md](CONTENT.md) explains every field. A good order:

1. `profile.ts`: your name, links, email, GitHub username, YouTube channel, site title and URL.
2. `apps.ts`: the home screen (the brand row and the dock).
3. `courses.ts`, `services.ts`, `expertise.ts`, `projects.ts`, `platforms.ts`.
4. `story.ts` and `timeline.ts` (Journey), `blog.ts` (your feed), `philosophy.ts`.
5. `lock-notes.ts`: your newest reel, the project on the lock screen and your city's clock.
6. `reviews.ts`: replace the 4 **Sample** reviews with real ones, copied word for word from your
   own platform (CONTENT.md → Reviews). Never write or edit a review.

Check as you go: `npm run content:check` names the file and field of any mistake.

## 3. Add your images and data

Put images in `public/content/` with the same names as the samples (or new names that you
reference from `/content`):

| Image | Size | Where |
| --- | --- | --- |
| Your photo | square, 480×480 or larger | `public/content/profile.webp` |
| Course / product images | 16:9, 1280×720 | `public/content/courses/<id>.webp` |
| Blog images | 16:9, 1200×675 | `public/content/blog/<name>.webp` |
| Project screenshots | 16:10, 1280×800 | `public/content/projects/<id>.webp` |

Convert JPG/PNG to WebP: `node scripts/optimize-images.mjs <folder-with-images> public/content/<subfolder> 1200`

Then replace the sample heatmap with your own GitHub data:

```bash
npx tsx scripts/github-snapshot.mts   # writes public/content/github-contributions.json
```

## 4. Brand colour (optional)

The phone has four finishes (Burgundy is the default). Change their colours in
`src/components/studio/FinishSwatches.tsx` (`FINISH_INFO`) and the matching blocks in
`src/app/globals.css` (`:root` and `[data-finish="…"]`). Keep text readable in light and dark.

## 5. Check and deploy

```bash
npm run lint && npm run typecheck && npm run content:check && npm run build
npx playwright install chromium                                       # once
npx playwright test tests/visual.spec.ts --update-snapshots=changed   # once, after changing content
npm test
```

Then deploy: import your repo at [vercel.com/new](https://vercel.com/new) and click **Deploy**.
You don't need a domain: Vercel gives you `your-project.vercel.app`. For the contact form, add
`GMAIL_USER` and `GMAIL_APP_PASSWORD` (README → "Contact form email") and redeploy. Every variable
is listed in [README.md](README.md#environment-variables); something not working? See
[README → Troubleshooting](README.md#troubleshooting).
