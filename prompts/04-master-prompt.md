You're building my new personal website. The complete build spec is in
./pocket-portfolio-spec.md. Read it fully before doing anything else. It's the source of truth
for the design, the features, my content, the build phases and the definition of done.

Step 0: take stock of your tools.
List every skill, plugin and MCP server installed (~/.claude/skills, ./.claude/skills, /plugin,
claude mcp list, CLAUDE.md files). Give me a short table: Name | What it does | Will you use it
here? (yes/no + why). Use every relevant one at the right moment without waiting for me.

Step 1: make sure these are installed (check first; install only from these official sources;
ask me before any global install):
A) Context7 (https://github.com/upstash/context7): "npx ctx7 setup --claude" in MCP mode, or
   claude mcp add --transport http --scope project context7 https://mcp.context7.com/mcp
   Add to ./CLAUDE.md: "Always use Context7 when you need library/API docs, code generation,
   setup or configuration steps." Look up current docs before using Next.js, Tailwind, Motion,
   Zustand, React Three Fiber, drei, next/font, Resend, Zod and Playwright. Don't guess APIs.
B) A browser: Claude in Chrome if it's connected (/chrome), otherwise the Playwright MCP:
   claude mcp add playwright npx @playwright/mcp@latest

Step 2: browser work.
1. Open my reference site {{REFERENCE_SITE_URL}} at 1440x900 and 390x844. Study how it behaves
   and feels: timing, springs, depth, blur, spacing. Write plain-language behaviour notes in
   docs/reference-notes.md. Keep any screenshots in docs/reference/ (add it to .gitignore);
   they're for your eyes only.
   Strict rule: never copy its source code, text, images, icons, 3D model or fonts. It belongs
   to someone else. It's a reference for how things feel, not material to reuse.
2. Read my content exactly as the spec's "Source of my content" section says.
3. After every phase, open my site locally and click through every app, the open/close
   animation, the back button, Esc, the theme switch and the contact form. Fix anything that's
   off before you report back.
4. Browser safety: never type passwords, API keys or payment details into any site; never submit
   a form on someone else's site; if a login or captcha appears, stop and tell me.

Step 3: build.
Follow the build phases in the spec, in order. After each phase: run npm run lint && npm run
build and fix errors; take Playwright screenshots at 1440x900, 834x1112 and 390x844 in both
themes and review them yourself; commit with a clear message; give me a 3-line summary.

Ground rules:
- Plan first: before Phase 1, show me a short plan (tools, skills, open questions). All my
  content is in my-content.md, so ask only what's truly missing.
- Originality: the icons, wallpaper, phone and all copy (apart from my content) are original.
- All content lives in /content/*.ts. Every review stays verified: false until I confirm it.
- Secrets live in .env.local only. Keep .env.example up to date.
- When something fails (a tool won't install, a site blocks you), tell me plainly, use the next
  best option, and keep going.

Start now with Step 0.
