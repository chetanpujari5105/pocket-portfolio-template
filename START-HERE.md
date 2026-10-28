# Start here

A portfolio you use like a phone. Everything visitors read is sample content for "Alex Rivera".
Replace it with yours in four steps. You need Node.js 20.9+ (LTS) and Git.

## 1. Fill in `/content`

Open each file in `content/` and change every line marked `// ✏️ EDIT:`. Start with
`content/profile.ts`: your name, links, GitHub username, site title and URL all live there.
Then `courses.ts`, `services.ts`, `story.ts`, `timeline.ts`, `projects.ts`, `blog.ts`.
Leave reviews `verified: false` until each quote is real and you have permission to publish it.
See [CONTENT.md](CONTENT.md) for what each file holds.

## 2. Add your images

Put them in `public/content/` with the same names as the samples (or new names that you
reference from `/content`):

| Image | Size | Where |
|---|---|---|
| Your photo | square, 480×480 or larger | `public/content/profile.webp` |
| Course / product images | 16:9, 1280×720 | `public/content/courses/<id>.webp` |
| Blog images | 16:9, 1200×675 | `public/content/blog/<name>.webp` |
| Project screenshots | 16:10, 1280×800 | `public/content/projects/<id>.webp` |

Convert JPG/PNG to WebP: `node scripts/optimize-images.mjs <folder-with-images> public/content/<subfolder> 1200`

## 3. Run it

```bash
npm ci
npm run dev          # open http://localhost:3000
```

Before you deploy, run the checks. Update the screenshot baselines once, because your content
changes how the pages look:

```bash
npm run lint && npm run typecheck && npm run build
npx playwright install chromium        # once
npx playwright test --update-snapshots # once, after changing content
npm test
```

## 4. Deploy

Push to your own GitHub repo, then import it at [vercel.com/new](https://vercel.com/new) and
click **Deploy**. Environment variables (all optional) are listed in [README.md](README.md).
