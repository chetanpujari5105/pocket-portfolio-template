Personalize this Pocket Portfolio template with my details. Work autonomously; don't ask me
questions. Anything you can't do or aren't sure about goes on a "Needs me" list at the end.

Sources (read all of them first):
- my-content.md: my worksheet. This is the source of truth.
- linkedin.txt (if it exists): my LinkedIn About and Experience text.
- My old site, if my-content.md lists one: open it with Playwright, read the text and links.
  It's my own site, so you may reuse its text and my images. Don't log in anywhere.
- my-photos/: my photos.
- START-HERE.md and CONTENT.md: how this template is organised.

1. Content. Fill every file in content/ with my details. Change every line marked
   "EDIT:" (search for it). Keep the same structure and id style.
   - content/profile.ts: name, role, bio, email, socials, github (my GitHub username),
     youtubeChannelId (leave "" if unknown), youtubeLine, stats, sideLine, journeySubtitle, and site
     (url, title, description, shortName, mark = my initials).
   - content/apps.ts: the brand row (links) and dock. Remove "ai-instagram" here and in
     profile.socials if I have only one Instagram account.
   - content/lock-notes.ts: my newest reel (its link and the first lines of its caption, word
     for word; null if I have none), the project the lock screen shows, and my city's clock
     (city + IANA time zone).
   - New ids in services.ts or expertise.ts need a tile line in
     src/components/apps/service-tile.tsx or expertise-tile.tsx (glyph + tint).
   - Remove sample entries I have no replacement for. Never invent numbers, ratings,
     dates, quotes or links. If something is missing, leave it out and list it.
   - Reviews: leave content/reviews.ts alone (the 4 "Sample" reviews stay until I run
     prompts/12-real-reviews.md), but set reviewSource to the platform my reviews are on.
   - After setting github, run: npx tsx scripts/github-snapshot.mts (replaces the sample heatmap).
2. Photos. Convert my photos with:
   node scripts/optimize-images.mjs my-photos public/content/_import 1200
   Then move each file to its place: public/content/profile.webp (square avatar),
   public/content/courses/<id>.webp (16:9), public/content/projects/<id>.webp (16:10),
   public/content/blog/<name>.webp. Crop to the right shape if needed. Delete sample
   images that are no longer used, and delete public/content/_import.
3. Colours. Pick four phone finishes that suit my brand colour from my-content.md:
   edit FINISH_INFO in src/components/studio/FinishSwatches.tsx and the matching
   [data-finish] blocks (and :root --accent) in src/app/globals.css. Keep text readable
   (WCAG AA contrast) in light and dark. You may rename the finishes.
4. Checks. Run, and fix anything that fails:
   npm run content:check && npm run lint && npm run typecheck && npm run build
   Then update the visual baselines once and run the tests:
   npx playwright test tests/visual.spec.ts --update-snapshots=changed && npm test
   If port 3100 is busy, add PORT=3200 in front of both commands.
5. Look at it. Start the site (npm run start -- -p 3200) and take Playwright screenshots
   at 1440x900 and 390x844 in light and dark: home, home page 2, Journey, Courses,
   Contact, the lock screen (open a fresh tab) and the back of the phone (button "Flip the phone"). Look at every
   screenshot and fix anything that looks wrong (cut-off text, wrong photo crop,
   leftover sample text). Save them in screenshots/.
6. Leftovers. Search the whole project (not node_modules) for "Alex", "Rivera", "Lisbon",
   "Sample", "example.com" and "octocat". Replace or remove every match in content/
   and public/ (except the sample reviews, which prompts/12 replaces). Report any match you
   kept and why.
7. Report: what you changed, the screenshot paths, test results, and the "Needs me" list.
