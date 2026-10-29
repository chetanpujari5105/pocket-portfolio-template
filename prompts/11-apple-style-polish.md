Give my Pocket Portfolio a final Apple-style polish. Work autonomously on a branch
polish/apple-style; anything that needs me goes on a "Needs me" list at the end. Don't change my
content's meaning: wording fixes only where something is cut off or reads badly on a phone.

Rules (they are how the template is built; keep to them):
- Sizes, spacing, radii and system colours come only from src/lib/ios-tokens.ts and the `--ios-*`
  variables in src/app/globals.css (Tailwind: bg-ios-*, text-ios-*, rounded-ios-*). No new
  one-off hex colours or pixel sizes in components.
- Lists use src/components/ui/grouped.tsx (Section, Row, Tile, ProminentButton). Rows are at
  least 44 px tall, chevrons only on rows that push, an up-right arrow on rows that leave the site.
- Type is in rem so Settings -> Larger text scales it. Secondary text stays opaque grey with at
  least 4.5:1 contrast in light and dark.
- No emoji in the interface (tests/apple.ts has the EMOJI check). Our own glyphs only: never copy
  Apple's SF Symbols, icons, images, fonts or text, or anything from a design kit.
- Motion: springs from src/lib/motion.ts, interruptible, and nothing moves under
  prefers-reduced-motion.

1. Look first. Start the site (npm run build && npm run start -- -p 3200) and run
   node scripts/shell-shots.mjs screenshots/polish-before http://localhost:3200
   Look at every screenshot (every app, 390x844 and 1440x900, light and dark) and the lock screen
   and Control Center. Write down what looks off: cut-off text, uneven spacing, a row that doesn't
   line up, a colour that clashes with my finish, a tap target under 44 px, an awkward empty state.
2. Fix them one at a time, smallest change first. After each, re-check that app at both sizes.
3. Run node scripts/label-contrast.mjs http://localhost:3200 and fix any home label under 4.5:1.
4. Run node scripts/a11y.mjs http://localhost:3200 (axe + keyboard) and fix what it finds.
5. Checks: npm run lint && npm run typecheck && npm run content:check && npm run build && npm test.
   If a visual test fails only because of a polish you meant, update it with
   npx playwright test tests/visual.spec.ts --update-snapshots=changed and list which ones.
6. Take the same screenshots into screenshots/polish-after and report: each fix (before/after
   file names), the test results and the "Needs me" list.
