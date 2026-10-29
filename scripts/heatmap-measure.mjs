// Page 2's GitHub heatmap, frame by frame. For each load: when the widget mounts (from navigation
// start), what the card shows while it can't be read yet, and how long after the swipe to page 2
// the first square is fully opaque and hit-testable (elementFromPoint at its centre is the square).
// Also times the server's GitHub fetch, cold and warm.
// Usage: GITHUB_USER=<you> node scripts/heatmap-measure.mjs [base=http://localhost:3100] [--loads=20] [--views=1440-light,1440-dark,390]
import { chromium } from "@playwright/test";

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const base = args[0] ?? "http://localhost:3100";
const loads = Number(process.argv.find((a) => a.startsWith("--loads="))?.slice(8) ?? 20);
const views = (process.argv.find((a) => a.startsWith("--views="))?.slice(8) ?? "1440-light,1440-dark,390").split(",");

/** Runs in the page from the first script: one sample per frame. */
function sampler() {
  const w = window;
  w.__hm = { frames: [] };
  const state = () => {
    const widget = document.querySelector("[data-github-widget]");
    if (!widget) {
      // The lazy widget's loading placeholder sits in the slot the widget will take
      const slot = document.querySelector('[data-home-key="w:github"]');
      return { s: slot?.firstElementChild ? "placeholder" : "none" };
    }
    const cells = [...widget.querySelectorAll(".gh-cell")].filter((c) => c.offsetParent !== null);
    const first = cells[0];
    if (!first) return { s: "tile, no grid" };
    const op = parseFloat(getComputedStyle(first).opacity);
    const r = first.getBoundingClientRect();
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) === first;
    const s = op >= 0.999 ? (hit ? "squares" : "squares, not hit-testable") : op > 0 ? "squares fading" : "white tile, squares at 0";
    return { s, op, hit, shown: !!widget.querySelector("[data-shown]") };
  };
  const tick = () => {
    w.__hm.frames.push({ t: performance.now(), ...state() });
    if (performance.now() < 20_000) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

const browser = await chromium.launch({ args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const results = {};
for (const view of views) {
  const [size, theme = "light"] = view.split("-");
  const [w, h] = size === "390" ? [390, 844] : [1440, 900];
  const rows = [];
  for (let i = 0; i < loads; i++) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: theme, isMobile: w < 600, hasTouch: w < 900 });
    await ctx.addInitScript(() => {
      sessionStorage.setItem("pp-unlocked", "1");
      sessionStorage.setItem("pp-banner", "1");
      localStorage.removeItem("pp-home-v2");
    });
    await ctx.addInitScript(sampler);
    const page = await ctx.newPage();
    await page.goto(base + "/", { waitUntil: "load" });
    if (w >= 900) {
      await page.mouse.move(40, 40);
      await page.waitForFunction(() => document.documentElement.hasAttribute("data-3d"), null, { timeout: 25_000 });
    }
    await page.waitForFunction(() => document.documentElement.hasAttribute("data-awake"));
    await page.waitForTimeout(800);
    const swipe = await page.evaluate(() => performance.now());
    await page.getByRole("button", { name: /^Page 2 of \d+$/ }).click();
    await page.waitForTimeout(3500);
    const frames = await page.evaluate(() => window.__hm.frames);
    await ctx.close();
    const mounted = frames.find((f) => f.s !== "none" && f.s !== "placeholder")?.t ?? null;
    const ready = frames.find((f) => f.t >= swipe && f.s === "squares")?.t ?? null;
    // What the card showed between the swipe and the first readable square, with durations
    const before = [];
    for (const f of frames.filter((f) => f.t >= swipe && (ready === null || f.t < ready))) {
      const last = before.at(-1);
      if (last?.s === f.s) last.ms = Math.round(f.t - swipe - last.from);
      else before.push({ s: f.s, from: Math.round(f.t - swipe), ms: 0 });
    }
    rows.push({ mounted: mounted && Math.round(mounted), ready: ready === null ? null : Math.round(ready - swipe), before });
    process.stdout.write(".");
  }
  results[view] = rows;
  const ok = rows.filter((r) => r.ready !== null).map((r) => r.ready).sort((a, b) => a - b);
  const pct = (p) => ok[Math.min(ok.length - 1, Math.floor(p * ok.length))];
  const states = {};
  for (const r of rows) for (const b of r.before) states[b.s] = (states[b.s] ?? 0) + 1;
  console.log(
    `\n${view}: never readable ${rows.length - ok.length}/${rows.length}; swipe → first square p50 ${pct(0.5)} ms, p90 ${pct(0.9)} ms, max ${ok.at(-1)} ms;` +
      ` widget mounted p50 ${rows.map((r) => r.mounted).sort((a, b) => a - b)[Math.floor(rows.length / 2)]} ms after navigation start; before readable: ${JSON.stringify(states)}`,
  );
}
await browser.close();

// The server's source, timed directly (the page itself is statically cached for 6 hours)
const user = process.env.GITHUB_USER ?? "octocat"; // your `github` from content/profile.ts
for (const label of ["cold", "warm", "warm"]) {
  const t0 = performance.now();
  try {
    const res = await fetch(`https://github.com/users/${user}/contributions`, {
      headers: { "user-agent": "pocket-portfolio heatmap-measure", "x-requested-with": "XMLHttpRequest" },
      signal: AbortSignal.timeout(6000),
    });
    const text = await res.text();
    console.log(`GitHub fetch (${label}): ${res.status} in ${Math.round(performance.now() - t0)} ms, ${(text.length / 1024).toFixed(0)} KB`);
  } catch (e) {
    console.log(`GitHub fetch (${label}): failed after ${Math.round(performance.now() - t0)} ms: ${e.message}`);
  }
}
if (process.env.JSON) console.log(JSON.stringify(results));
