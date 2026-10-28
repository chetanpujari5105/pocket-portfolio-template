I opened my live site ({{YOUR_SITE_URL}}) on my phone and found three problems. Fix all of them
on a new branch, feat/v5-mobile, created from main. Work autonomously; don't ask me questions.
Anything that needs me goes on the "Needs me" list in docs/progress.md. Use Context7 for
Next.js, Motion, use-gesture and Serwist docs before writing code; use my design and motion
skills; use Playwright for device emulation, traces and videos.

First write failing Playwright tests that reproduce problems 1 and 2, using the device matrix
below and a 4x CPU-throttled phone profile. Then fix them.

Problem 1: fit every phone, every browser, every orientation. Nothing on the home screen, lock
screen, an app or a system panel may ever be clipped or hidden behind browser toolbars.
1. Use the real visible height: 100dvh (falling back to 100svh, then 100vh), plus
   window.visualViewport written to a --vvh CSS variable. Respect all four
   env(safe-area-inset-*) with viewport-fit=cover, and interactive-widget=resizes-content so
   the Contact form stays visible with the keyboard open.
2. Calculate the home-screen grid from the space available, in a useHomeLayout() hook:
   columns (4 on phones, 3 below 340px, 5-6 on tablets and landscape), icon size
   min(width-based, height-based) clamped to 48-68px with labels and gaps scaling, and how
   many rows fit.
3. Overflow goes to the next page like a real phone: items fill pages in order, widgets take
   whole cells (Impact 4x2, Work with me 2x2, GitHub 4x2, Blog 4x2, YouTube 2x2, Expertise
   stack 2x2), page dots appear automatically. Never shrink icons below 48px. Under 600px of
   usable height, large widgets move to their own page.
4. With no latest video, the YouTube widget shows a proper channel card: the YouTube logo,
   {{YOUR_YOUTUBE_HANDLE}} and "Watch on YouTube". The Expertise stack is a real stacked-cards
   widget that never overflows.
5. The lock screen, apps, Control Center, app switcher, sheets, Spotlight, banner and status
   pill all use the measured height and safe areas. App content scrolls with nothing under
   the home indicator.
6. Landscape on phones must not break: a rotate hint or a 6-7 column home screen, whichever
   looks better. Stop Android text auto-zoom (text-size-adjust: 100%), match the theme-color
   meta to the wallpaper, and never let the page itself scroll or bounce.

Device matrix (tests and screenshots for every one): 320x568, 375x667, 375x812, 393x852,
430x932, 390x664 (Safari with toolbar), 412x915, 412x780 (Chrome with toolbar), 392x690 (Brave
with toolbars), 360x740, 360x800, 360x640, 280x653 and 673x841 (a folding phone), 744x1133,
844x390 and 740x360 (landscape). For every size: every icon, label and widget sits fully
inside the visible area above the Search pill and dock with at least 8px margin (assert with
bounding boxes); nothing clips (scrollHeight <= clientHeight); every app scrolls to its last
element above the home indicator; with the viewport 300px shorter (keyboard), the focused
Contact field and Send stay visible. Save light and dark screenshots to docs/v5/fit/, make a
contact sheet and look at all of it yourself. Also run WebKit with the iPhone presets. Put "test
on a real iPhone Safari, Samsung Internet and the LinkedIn/Instagram in-app browsers" on the
"Needs me" list.

Problem 2: apps must feel instant. Targets on a 4x throttled phone with Fast 4G: tap to first
reaction 50ms or less; the window starts expanding within one frame and never waits on the
network; title and first content readable within 250ms; launch settles by 380ms, close by
300ms, app switching by 450ms; 60fps swipes and scrolling; no long tasks. Repeat visits load
almost instantly from cache.
1. Find the real cause first: record a trace (cold load, open and close Journey, Courses, Blog)
   and write where the time goes, with numbers, to docs/v5/speed.md.
2. Never wait for code on tap: prefetch every app's chunk when the home screen is idle
   (requestIdleCallback, 1500ms timeout) and again on pointerdown of its icon. If a chunk still
   isn't ready, the launch runs anyway with the skeleton and the content fades in.
3. Make the launch cheap: no filter: blur() during launch on phones (opacity and scale only),
   no backdrop-filters under the animating window while it moves, contain: layout paint on
   app screens.
4. Fast first renders: above-the-fold first, content-visibility: auto for long lists, correct
   image sizes, priority only for the first visible image.
5. Tune the launch spring to about 350ms and the close to about 280ms, readable by 40%
   progress, always interruptible.
6. Add a service worker with Serwist (the serwist package; @serwist/next needs webpack, so
   bundle sw/sw.ts with esbuild after next build): cache the app shell, chunks, fonts and
   icons; stale-while-revalidate for RSS, GitHub and YouTube data; it must not break the dev
   server, and new deploys activate on the next load.
7. Keep the budgets: initial JS at most 200 KB gzipped, Lighthouse mobile 92+ and desktop 100.
Add tests/speed.spec.ts (CPU throttled via CDP) as its own Playwright project that runs last
and alone, one test at a time (throttled browsers side by side double every number): open 5
apps from a fresh load; the window moves within 50ms of the click, the title shows within
400ms, and no chunk request happens after the tap. Put the before/after timing table in
docs/v5/speed.md.

Problem 3: real home-screen editing, saved per visitor in localStorage (versioned key, with a
migration from the current icon order).
- Edit mode: long-press an icon or an empty spot for 500ms. Icons wiggle, removable ones show
  a "-" badge, a "Done" pill shows top-right and a "+" top-left opens the App Library. Outside
  edit mode, a long-press opens a frosted context menu: Open, Share (brand links), Edit Home
  Screen, Remove App.
- Folders: drag one app onto another and hold about 400ms to make a folder with a default
  name from their category (Social, Learn, About Me, Work, or "Folder"); drag more apps onto
  it to add them; tapping zooms it open (3x3 grid, pages past 9, home screen blurred behind);
  tap the title in edit mode to rename; drag an app out past the folder's edge to put it back
  on the home screen; a folder with one app left dissolves. The Socials folder becomes a
  regular folder that exists by default.
- Remove: the "-" badge opens a sheet with "Remove from Home Screen" (the app stays in the App
  Library) and Cancel; the icon shrinks away and neighbours reflow on springs. Settings can't
  be removed, so people can always get things back.
- App Library: a sheet (from "+" in edit mode and Settings > Home Screen) listing everything
  not on the home screen; tapping one adds it to the first free slot. Settings > Home Screen
  > "Reset Home Screen Layout" restores the default, with a confirm sheet.
- Dock: in edit mode, drag apps into or out of the dock (at most 4 items; folders allowed).
- Feel and access: drags follow the finger, other icons make room on springs, holding at an
  edge for about 600ms changes page. In edit mode, arrow keys move the focused icon, Delete
  removes it, F makes a folder with the next icon, and screen readers announce each change.
  Reduced motion turns wiggle and springs into fades.
- Load the editor as its own chunk, fetched at idle with the apps, so a press never requests
  script during a launch and tests/speed.spec.ts still passes.
- Tests (tests/home-edit.spec.ts, mouse and touch): create, rename, add a third app, drag one
  out, dissolve, remove and restore from the App Library, drag into the dock, reset, persist
  across a reload, and still fit at 320x568 and 392x690 with everything added back.

Process: Problem 1, then 2, then 3. After each: npm run lint && npm run typecheck && npm run
build && npm test, review the device-matrix screenshots and video, commit, and add 2-3 lines to
docs/progress.md. When finished, fast-forward main and push so Vercel deploys, then run the
device-matrix screenshots and the speed test against {{YOUR_SITE_URL}}. Report what changed,
the before/after speed table, the contact sheet paths, test results and the "Needs me" list.
