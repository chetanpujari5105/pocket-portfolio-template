Set up my toolbox for building a website with Next.js, React Three Fiber and Playwright.

1. Take stock first. List every skill, plugin and MCP server I already have:
   ~/.claude/skills, ./.claude/skills, /plugin (installed), claude mcp list, and any CLAUDE.md.
   Show me a short table: Name | What it does | Useful here? (yes/no + why).

2. Install whatever is missing from this list, from these official sources only:
   - Context7 MCP (https://github.com/upstash/context7): run "npx ctx7 setup --claude" and
     choose MCP mode. If it waits for a login, use instead:
     claude mcp add --transport http --scope project context7 https://mcp.context7.com/mcp
     Then add this line to ./CLAUDE.md: "Always use Context7 when you need library/API docs,
     code generation, setup or configuration steps."
   - Emil Kowalski's skills: npx skills@latest add emilkowalski/skills
   - Vercel's agent skills: npx skills add vercel-labs/agent-skills
   - Playwright's browser: npx playwright install chromium
   Ask me before any global install or any change to my agent settings.

3. Do NOT install REA or Agent Reach unless I ask for them later.

4. Tell me which tools need a Claude Code restart to load, and what to type after restarting.
