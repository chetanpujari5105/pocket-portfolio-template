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
   - Remove sample entries I have no replacement for. Never invent numbers, ratings,
     dates, quotes or links. If something is missing, leave it out and list it.
   - Reviews: add only real quotes from my sources, and keep every one verified: false.
2. Photos. Convert my photos with:
   node scripts/optimize-images.mjs my-photos public/content/_import 1200
   Then move each file to its place: public/content/profile.webp (square avatar),
   public/content/courses/<id>.webp (16:9), public/content/projects/<id>.webp (16:10),
   public/content/blog/<name>.webp. Crop to the right shape if needed. Delete sample
   images that are no longer used, and delete public/content/_import.
3. Colours. Pick three phone finishes that suit my brand colour from my-content.md:
   edit FINISH_INFO in src/components/studio/FinishSwatches.tsx and the matching
   [data-finish] blocks (and :root --accent) in src/app/globals.css. Keep text readable
   (WCAG AA contrast) in light and dark. You may rename the finishes.
4. Checks. Run, and fix anything that fails:
   npm run content:check && npm run lint && npm run typecheck && npm run build
   Then update the visual baselines once and run the tests:
   npx playwright test --update-snapshots && npm test
   If port 3100 is busy, add PORT=3200 in front of both commands.
5. Look at it. Start the site (npm run start -- -p 3200) and take Playwright screenshots
   at 1440x900 and 390x844 in light and dark: home, home page 2, Journey, Courses,
   Contact, and the back of the phone (button "Flip the phone"). Look at every
   screenshot and fix anything that looks wrong (cut-off text, wrong photo crop,
   leftover sample text). Save them in screenshots/.
6. Leftovers. Search the whole project (not node_modules) for "Alex", "Rivera",
   "Sample", "example.com" and "octocat". Replace or remove every match in content/
   and public/. Report any match you kept and why.
7. Report: what you changed, the screenshot paths, test results, and the "Needs me" list.
