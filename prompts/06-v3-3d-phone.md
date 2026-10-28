The site works, but I want it to look and feel much more like a real phone:
1. A real 3D phone on desktop by default: I can turn it over to see its back, and it reacts
   to my mouse.
2. Every tap, swipe, open, close, scroll and back gesture is smooth, physical and
   interruptible, with springs and gestures like a real phone.

Work on the existing project and keep /content, the tests and the APIs. Create the branch
feat/v3-3d-phone. Work autonomously; don't ask me anything. Anything that needs me goes on the
"Needs me" list in docs/progress.md.

0. Toolbox. Re-inventory skills, plugins and MCP servers. Use emil-design-eng, animate,
   apple-design and impeccable for motion craft; web-design-guidelines and
   vercel-react-best-practices; Context7 before writing code with @react-three/fiber,
   @react-three/drei, three, motion/react or Next.js; Playwright (or Claude in Chrome) to look.

1. Study the reference with recordings. Record Playwright videos (recordVideo) of these on
   {{REFERENCE_SITE_URL}} and on my local build: first load, hover/parallax, drag-rotating the
   phone and letting go, opening/closing 3 apps, scrolling in an app, a detail view and back,
   theme and finish, search, mobile. Write docs/feel-gap.md as a table: Interaction | Reference
   behaviour (plain words) | Mine now | Gap | Fix. Measure durations, spring vs fixed curve,
   whether animations can be interrupted, and long tasks. Use it as your to-do list.

2. Originality rules (non-negotiable): use the reference only for how it behaves. Don't copy
   any of its code, text, images, icons, fonts, 3D model or wallpapers. Don't build or download
   a model of a real phone product, and use no brand logo or brand camera layout. Model an
   original premium phone yourself, in code. No trademarked app icons or fonts. Generic
   smartphone patterns (springs, swipe-home, app switcher, edge-swipe back, rubber-banding,
   control panel, notification banners) are fine; build your own versions.

3. The 3D phone (on by default at 900px and up with WebGL; CSS phone when WebGL is missing,
   the 3D code errors, or Reduce motion is on):
   - Procedural body in R3F: rounded slab with a soft bevel, glossy metal frame, satin glass
     back, thin even bezels. The live HTML screen sits on it with drei <Html transform
     occlude="blending">, so it hides when the back faces the camera, stays crisp and clickable.
   - An original camera module on the back, and my {{YOUR_INITIALS}} mark debossed in the centre.
   - Small original side buttons. Materials from the finish colour, blended over 400ms.
   - Lighting from drei <Environment> with <Lightformer>s (no HDR downloads), contact shadows,
     ACES or AgX tone mapping, correct colour space so screen colours match the CSS phone.
   - Arrival: one spring rise and turn-in, the screen wakes about 150ms after it lands.
   - Drag on the stage beside the phone to turn it (never from the screen); a small pointer
     parallax; the phone faces the camera while I use the screen. frameloop="demand", pause
     when the tab is hidden, ErrorBoundary falls back to the CSS phone with no layout shift.

4. The OS feels like a phone. Every animation is interruptible; animate only transform,
   opacity, clip-path and filter.
   - lib/motion.ts: named springs (snappy 500/40, smooth 300/32, gentle 170/26, launch 380/34,
     home 420/36) and a rubber-band helper (1 - 1/(x*c/d + 1)) * d. Pass gesture velocity into
     springs.
   - Lock screen once per session: clock, date, a notification for my latest post, swipe up
     with rubber-banding (past 30% or a fast flick unlocks); icons fly in with a 20ms stagger.
     Deep links skip it.
   - Home: two pages with dots (page 2: latest post, latest video, skills widgets), paging with
     velocity and rubber-band, trackpad and arrow keys; pull down anywhere for Search; icon press
     0.92 on snappy; long-press 500ms for jiggle mode with drag-to-rearrange (saved); frosted dock.
   - Launch grows from the exact icon rect on the launch spring, icon art crossfades in the
     first 40%, home recedes to 0.9 with dim and blur. Close by swiping up on the home indicator,
     fully interactive (follows the finger, shrinks to 0.6, flies back into the icon with the
     release velocity). Swipe up and hold for an app switcher. Esc, back and the chevron use
     the same fly-back.
   - In apps: large titles collapse into a frosted bar by scroll position; rubber-band overscroll
     on wheel and touch; pushed views shift the parent -30% with an interactive edge-swipe back;
     sheets with medium/large detents; swipe-left row actions; pull-to-refresh on Blog.
   - System UI: a status pill around the camera cutout that morphs for events ("Message sent",
     "Link copied", "Theme: Dark", a progress ring); Control Center from the top-right corner
     (dark mode, finish, wallpaper, reduce motion, larger text, brightness, now playing); one
     notification banner per session.
   - Accessibility stays first-class: every gesture has a button or key; focus trap and return
     still work; reduced motion means CSS phone and crossfades.

5. Mobile (under 600px): the OS is full-screen with 100dvh and safe areas, correct touch-action
   per region, overscroll-behavior: none, no conflict with the browser's own swipe-back, and an
   installable PWA (manifest, icons, display: standalone).

6. Performance budget (measure, don't guess): the 3D chunk loads after the home screen paints;
   initial JS at most 200 KB gzipped; no long tasks over 50ms during launch/close, page swipes,
   rotation or the switcher; Lighthouse desktop 95+, mobile 90+, and 100 for accessibility,
   best practices and SEO.

7. Process, one commit per step: (1) recordings + feel-gap table, (2) motion system and gesture
   helpers, (3) the 3D phone, (4) launch/close + switcher, (5) lock screen, 2-page home, search,
   jiggle, (6) in-app physics, (7) system UI, (8) mobile + PWA, (9) performance and accessibility
   pass, then re-record and add "After" notes to docs/feel-gap.md.
   After every step: npm run lint && npm run typecheck && npm run build && npm test; add tests
   for new gestures (Playwright mouse/touchscreen drags, assert the end state); record a short
   video, extract frames with ffmpeg and fix anything that jumps or flickers; add 2-3 lines to
   docs/progress.md.

When finished, give me one report: what changed, before/after notes, Lighthouse scores, test
results, the "Needs me" list, and how to run it.
