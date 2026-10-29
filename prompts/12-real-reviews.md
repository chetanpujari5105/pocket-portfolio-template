Replace the sample reviews in my Pocket Portfolio with real reviews of my work, copied from my own
account on {{PLATFORM}} ({{PLATFORM_REVIEWS_URL}}). Work autonomously; anything that needs me goes
on a "Needs me" list at the end.

Hard rules. These are not negotiable:
- Read-only. Only open and read pages. Never click Reply, Report, Like, Helpful, Delete, Edit,
  Accept or any button that changes something; never post, send a message or accept an agreement.
- Human speed. One page at a time, a few seconds between pages, no scraping scripts, no APIs I
  haven't given you, no bulk downloads. Stay within the platform's terms.
- I'm already signed in, in Chrome (Claude in Chrome). Never type a password. If a login, passkey,
  captcha or "confirm it's you" screen appears, stop and tell me.
- Copy verbatim. Each review's text exactly as written, including its spelling, punctuation and
  line breaks; the name exactly as the platform shows it; the rating; the platform's own date
  label ("2 years ago"). Never write, edit, shorten, fix, translate, merge or "improve" a review,
  and never invent one, a name, a rating or a date. If a review can't be read in full, skip it.
- Leave out: reviews without text, anyone who asked not to be named, my family, my team and
  myself, and anything with someone's private details (phone, email, address) in it.

1. Open {{PLATFORM_REVIEWS_URL}} and read the reviews, newest first, until you have up to
   {{HOW_MANY, e.g. 16}} that pass the rules (one per person). Prefer ones that say something
   specific. Note the platform's own totals (reviews and learners/clients) if it shows them.
2. Write them into content/reviews.ts:
   - READ_ON: today's date (YYYY-MM-DD).
   - reviewSource: name "{{PLATFORM}}", url (my profile there), linkLabel, and totals only if the
     platform shows them.
   - One entry per review: id (short slug), course, courseShort (a short chip label), courseUrl
     (the course or service page on the platform), rating, text, author, date, source
     "{{PLATFORM}}", verified: true. No `sample` field. Mark the 6–8 strongest featured: true.
   - Delete the four sample reviews.
3. Check: npm run content:check && npm run lint && npm run typecheck && npm run build, then
   npx playwright test tests/reviews.spec.ts. Update the Reviews visual baselines if they exist
   (npx playwright test tests/visual.spec.ts --update-snapshots=changed) and say which changed.
4. Open the Reviews app (/#reviews and /#reviews/all) at 390x844 and check every review reads
   exactly as on the platform and no "Sample" tag is left.
5. Report: how many reviews you read, how many you kept, each skipped one with the reason (no
   names of skipped people), the test results and the "Needs me" list.
