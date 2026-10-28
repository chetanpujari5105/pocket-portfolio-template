// Usage: node scripts/a11y.mjs [baseUrl] — axe scan of home + every app, light and dark, plus a keyboard-only pass.
import { chromium } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";
const [base = "http://localhost:3100"] = process.argv.slice(2);
const apps = ["", "courses", "journey", "expertise", "platforms", "projects", "blog", "reviews", "services", "contact", "settings", "socials"];
const b = await chromium.launch();
let total = 0;
for (const scheme of ["light", "dark"]) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: scheme });
  const p = await ctx.newPage();
  for (const a of apps) {
    await p.goto(`${base}/#${a}`, { waitUntil: "networkidle" });
    await p.waitForTimeout(700);
    const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    for (const v of r.violations) {
      total++;
      console.log(`[${scheme}] #${a || "home"} ${v.id} (${v.impact}) ×${v.nodes.length}: ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
    }
  }
  await ctx.close();
}
console.log(total ? `${total} violation groups` : "axe: no violations");

// keyboard-only
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
await p.goto(base + "/", { waitUntil: "networkidle" }); await p.waitForTimeout(800);
const focused = () => p.evaluate(() => { const e = document.activeElement; return e?.getAttribute("aria-label") || e?.textContent?.trim().slice(0, 30) || e?.tagName; });
const stops = [];
for (let i = 0; i < 8; i++) { await p.keyboard.press("Tab"); stops.push(await focused()); }
console.log("tab stops:", stops.join(" → "));
await p.locator("[data-app-icon]").first().focus();
const start = await focused();
await p.keyboard.press("ArrowRight"); const right = await focused();
await p.keyboard.press("ArrowDown"); const down = await focused();
console.log("arrows:", start, "→", right, "→", down);
await p.keyboard.press("Enter"); await p.waitForTimeout(900);
console.log("enter opened:", await p.evaluate(() => location.hash), "focus in dialog:", await p.evaluate(() => !!document.activeElement?.closest("[role=dialog]")));
for (let i = 0; i < 40; i++) await p.keyboard.press("Tab");
console.log("focus trapped after 40 tabs:", await p.evaluate(() => !!document.activeElement?.closest("[role=dialog]")));
await p.keyboard.press("Escape"); await p.waitForTimeout(800);
console.log("esc → focus back on:", await focused(), await p.evaluate(() => location.hash));
await p.keyboard.press("Control+k"); await p.waitForTimeout(150);
console.log("ctrl+k focus:", await p.evaluate(() => document.activeElement?.getAttribute("role")));
await p.keyboard.press("Escape"); await p.waitForTimeout(300);
console.log("spotlight esc → focus:", await focused());
await p.keyboard.press("Control+k"); await p.waitForTimeout(150);
await p.keyboard.type("projects"); await p.keyboard.press("Enter"); await p.waitForTimeout(1200);
console.log("spotlight enter → focus in dialog:", await p.evaluate(() => !!document.activeElement?.closest("[role=dialog]")), await p.evaluate(() => location.hash));
await p.keyboard.press("Escape"); await p.waitForTimeout(800);
await p.locator("[data-app-icon]").first().focus();
await p.keyboard.press("ArrowDown"); const d1 = await focused();
await p.keyboard.press("ArrowRight"); const d2 = await focused();
await p.keyboard.press("ArrowDown"); const d3 = await focused();
await p.keyboard.press("ArrowLeft"); const d4 = await focused();
console.log("arrow walk: Impact ↓", d1, "→", d2, "↓", d3, "←", d4);
await ctx.close();

// reduced motion: app opens with a fade, no zoom transform
const rm = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
const q = await rm.newPage();
await q.goto(base + "/", { waitUntil: "networkidle" }); await q.waitForTimeout(600);
await q.getByRole("button", { name: "Open Courses" }).click(); await q.waitForTimeout(80);
console.log("reduced-motion mid-open:", await q.evaluate(() => { const d = document.querySelector("[role=dialog]"); const s = d && getComputedStyle(d); return s && { transform: s.transform, clip: s.clipPath, opacity: s.opacity }; }));
await rm.close();
await b.close();
