Here is my fix list. Work through it in order, without asking me questions.
For each item: make the change, then check it in the browser with Playwright
(desktop 1440x900 and phone 390x844) and look at the screenshot.

1. {{FIRST_THING_TO_CHANGE}}
2. {{SECOND_THING_TO_CHANGE}}
3. {{THIRD_THING_TO_CHANGE}}

Rules:
- All visible text lives in content/*.ts. Don't hard-code text in components.
- Keep the originality rules: no copied code, text, images, icons or fonts from other sites.
- When you're done, run npm run lint && npm run typecheck && npm run build && npm test.
  If a visual test fails only because of my intended change, update that baseline with
  npx playwright test --update-snapshots and say which ones you updated.
- Commit with a clear message, then report item by item: done / not done and why.
