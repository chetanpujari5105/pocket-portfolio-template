# Build spec: {{YOUR_NAME}}, "Pocket Portfolio"

## Role and goal
You are a senior front-end engineer and interaction designer. Build my personal website as an
interactive "pocket portfolio": the whole site is a phone home screen. Visitors explore my work
by opening apps on the phone: Courses, Journey, Expertise, Platforms, Projects, Blog, Reviews,
Services, Contact and Settings. On desktop the phone floats in the centre of a calm "studio"
backdrop, with my name and a short nav beside it. On a real phone the site becomes the phone:
a full-screen home screen with no device frame.

I'm {{YOUR_NAME}}, {{YOUR_ROLE}}. My line: "{{YOUR_ONE_LINER}}". The site should feel playful,
premium and simple.

Originality rules: design your own icon set, wallpaper and phone frame. Don't reuse any
company's trademarked app icons, and don't recreate the LinkedIn, X or YouTube interfaces.
Brand logos may appear only as small marks on links to my own profiles, following each brand's
guidelines. Don't copy code or assets from any other portfolio site.

## Source of my content
1. my-content.md (my worksheet) is the source of truth.
2. My old site {{YOUR_OLD_SITE_URL}} is mine: open it with Playwright, extract its text and links,
   and download my images. (Delete this line if I have no old site.)
3. My photos are in my-photos/. Convert all images to WebP.
4. Put everything in typed files in /content (see "Content model"). Never hard-code content in
   components. Never invent numbers, ratings, dates or quotes.

## Tech stack
- Latest stable Next.js (App Router) + TypeScript (strict), deployed on Vercel. Domain: {{YOUR_DOMAIN}}.
- Tailwind CSS with CSS custom properties for theme tokens.
- Motion (motion/react) for springs, shared-layout transitions and gestures.
- Zustand for OS state: open app, app stack, theme, phone finish and wallpaper.
- React Three Fiber + drei for a 3D phone on desktop, lazy-loaded; a CSS phone is the fallback.
- next/font with two free fonts: Inter or Geist for UI text, and Archivo (expanded) or
  Unbounded for my name.
- lucide-react for UI glyphs. App icons are custom SVGs.
- Resend for the contact form (to {{YOUR_EMAIL}}), with Zod validation.
- My blog RSS ({{YOUR_BLOG_RSS_URL}}), fetched server-side and revalidated every 6 hours, with
  static fallback posts in /content/blog.ts.
- Playwright for smoke and screenshot tests, plus ESLint and Prettier.

## Information architecture
One page. Each app has its own URL hash so links can be shared and the back button works:
#home #courses #journey #expertise #platforms #projects #blog #reviews #services #contact
#settings #socials (folder) #ask (optional AI app)
- Setting a hash opens that app with the launch animation. Going back (browser back, a swipe,
  or the in-app back chevron) returns to #home.
- document.title changes per app: "{App} - {{YOUR_NAME}}". Home: "{{YOUR_NAME}} - {{YOUR_ROLE}}".
- Loading a deep link opens that app directly, without flashing the home screen first.

## Layout
- Desktop (900px and up): full-viewport studio background with a subtle vignette, light and
  dark. Phone centred, height about min(88vh, 900px), soft shadow. On the right: my name in the
  display font on two lines, a muted one-liner, nav links (Courses, Journey, Contact) that open
  those apps, and a green "Available for projects" pill. Top-left: 3 round swatches for the
  phone finish ({{FINISH_1}}, {{FINISH_2}}, {{FINISH_3}}; {{FINISH_1}} uses {{ACCENT_COLOR}}),
  saved in localStorage (wrapped in try/catch).
- Tablet (600-899px): phone centred, name and nav as a bar below it.
- Mobile (under 600px): no frame and no studio. The home screen fills the viewport and respects
  env(safe-area-inset-*). Apps open full-screen.

## The phone OS
- Status bar: live clock, signal/wifi/battery glyphs in SVG, a pill-shaped camera cutout. Text
  colour adapts to the current app.
- Wallpaper: original, slowly animated glossy ribbons in the finish colour (a light fragment
  shader), with a CSS fallback. Pauses when the tab is hidden; static with reduced motion.
  Settings offers 3 presets.
- Home screen: a 4-column grid of rounded-square icons with labels. An "Impact" widget (4x2)
  with a dot-grid world map and 4 count-up stats from my worksheet. A "Work with me" widget
  (2x2) with 3 service chips, beside a 2x2 block of icons (Journey, Expertise, Platforms,
  Reviews). A row with YouTube, Socials (a folder), Projects and Settings. A frosted "Search"
  pill. A frosted dock: Courses, Blog, Services, Contact. The home indicator bar.
- Icons: one cohesive, original SVG set: soft gradient fill, one bold glyph, subtle highlight,
  its own colour per app.
- App launch and close (the signature interaction): the window expands from the tapped icon's
  position to fill the screen (scale and corner radius), the home screen behind scales to about
  0.92 and dims. Spring about stiffness 380, damping 34. Closing reverses it into the icon.
  Close with the back chevron, browser back, Esc, or a swipe up on the home indicator.
  Icons scale to 0.9 while pressed. With prefers-reduced-motion, everything becomes a crossfade.
- Spotlight: a frosted overlay with fuzzy search across apps, courses, posts, skills and
  services. Enter opens the result. Cmd/Ctrl+K opens it on desktop.

## Apps (all share one app shell)
Large 34px title and a back chevron; grouped list cards with hairline dividers; scrolling stays
inside the phone; pushed detail views slide in from the right.
1. Courses (or Products): filter chips by category, a featured card, a list with an Enroll/Open
   button, and a detail page per item (blurb and who it's for, from my worksheet only).
2. Journey: photo, name, role and location, up to 3 badges, "My story" in short paragraphs, a
   vertical timeline, education, and one highlight card.
3. Expertise: a grid of skill areas with tools as chips; tapping opens a sheet with related
   courses and services, cross-linked by id.
4. Platforms: where people find my work, each with an "Open profile" link.
5. Projects: cards with screenshot, tagline, tech used and a link; filter chips.
6. Blog: posts from RSS (date, title, subtitle, image); a reader view with the excerpt and a
   "Read the full post" button. Never show the full article text.
7. Reviews: show a review only if verified is true in /content/reviews.ts. Every review starts
   as verified: false. With none verified, show "Stories coming soon".
8. Services: large cards with a "Let's talk" button that opens #contact with the subject
   pre-filled, plus "Why people trust me" lines.
9. Contact: a compose-mail view (To: {{YOUR_EMAIL}} read-only, from, name, subject, message).
   POST to /api/contact via Resend, Zod validation, a honeypot field, 3 messages per hour per IP.
   Without a Resend key, show "email me directly". Paper-plane send animation.
10. Settings: profile row; Accessibility (Reduce motion, Larger text); Display (Light/Dark with
   two mini previews, which changes both the apps and the studio); Wallpaper; Phone finish;
   About (tech used and credits).
11. Socials folder: a folder overlay with my profiles; each opens in a new tab (rel="noopener").
12. Optional Ask app, last: a chat answered by an LLM through a server route, grounded only in
   /content, refusing off-topic requests, rate-limited, behind NEXT_PUBLIC_ENABLE_ASK=true.

## Theming
Tokens on :root and .dark for the studio (bg, ink, muted, line) and the apps (background,
surface, group, ink, secondary, muted, divider, glass), plus --accent set by the finish.
Light studio about #FAFAFA with ink #29292B; dark about #151619 with ink #ECECEE. Glass:
backdrop-filter blur(20px) saturate(160%). Set the theme before first paint (no flash).
Animate theme changes as a circular reveal with the View Transitions API where supported.

## Content model (/content/*.ts, each with a Zod schema and typed exports)
profile.ts (name, role, bio, story, location, education, email, avatar, socials, github, stats),
timeline.ts, courses.ts, platforms.ts, projects.ts, expertise.ts, services.ts, philosophy.ts,
blog.ts (fallback posts), reviews.ts, apps.ts (home-screen and dock layout).
Write CONTENT.md explaining how to edit each file and where images go.

## Quality bar
- Performance: Lighthouse mobile 90+ and desktop 95+; initial JS under 200 KB gzipped; apps and
  the 3D phone loaded with dynamic(); images through next/image.
- Accessibility: every icon is a real button or link with an accessible name; app windows are
  dialogs with focus trapped and returned to the icon on close; arrow keys move around the grid;
  visible focus rings; WCAG AA contrast in both themes; honours prefers-reduced-motion.
- SEO: OpenGraph and Twitter cards with a generated OG image, sitemap.xml, robots.txt, JSON-LD
  Person, and a visually hidden semantic summary in the server HTML.
- Resilience: RSS and the contact API fall back gracefully. No secrets in the client.
  .env.example lists every variable.
- Code: strict TypeScript, no any, small components, shared motion presets in lib/motion.ts.

## Build plan (phases; check each before moving on)
1. Scaffold: Next.js, Tailwind, tokens, fonts, flash-free theme toggle.
2. Content import into /content, images optimised, Zod validation.
3. Studio and CSS phone: swatches, side column, arrival animation, breakpoints.
4. OS shell: status bar, wallpaper, home grid, widgets, dock, icons, hash router, app window
   with launch/close and swipe-to-close, Socials folder.
5. Apps: Courses, Journey, Services, Contact, Blog, Expertise, Platforms, Projects, Reviews,
   Settings.
6. Spotlight, keyboard navigation, focus management, reduced motion.
7. 3D phone (procedural, my {{YOUR_INITIALS}} mark on the back), then the optional Ask app.
8. Polish: SEO, OG image, Lighthouse pass, Playwright tests (open/close every app, theme toggle,
   contact validation, deep links), README with Vercel deploy steps.
After each phase: run npm run lint && npm run build and fix errors; take Playwright screenshots at
1440x900, 834x1112 and 390x844 in both themes and fix anything that looks off; commit; give me a
3-line summary.

## Definition of done
Desktop shows the studio, the phone, my name and nav. A phone shows a full-screen home screen.
Every app opens from its icon with the zoom animation, has a working hash deep link, and closes
with back, Esc or a swipe. All content comes from /content. Theme and finish survive a reload.
Only verified reviews show. Lint, type-check, build and tests pass; Lighthouse targets are met.
