// White-label contrast over the live wallpaper. For each home label: its box, then the wallpaper
// alone (the home layer hidden) sampled a few times as it moves; the background is the 95th-
// percentile luminance in the box (grain and single bright pixels aside), contrast = 1.05 / (L + .05).
// Usage: node scripts/label-contrast.mjs [base=http://localhost:3100] [--views=390,834,1440]
import { chromium } from "@playwright/test";
import sharp from "sharp";

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const base = args[0] ?? "http://localhost:3100";
const views = (process.argv.find((a) => a.startsWith("--views="))?.slice(8) ?? "390,834,1440").split(",");
const SIZES = { 390: [390, 844], 834: [834, 1112], 1440: [1440, 900] };
const lin = (v) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const browser = await chromium.launch({ args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const worst = [];
for (const v of views) {
  const [w, h] = SIZES[v];
  for (const finish of ["burgundy", "electric", "graphite", "chai"]) for (const theme of ["light", "dark"]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, colorScheme: theme, isMobile: w < 600, hasTouch: w < 900 });
    await ctx.addInitScript((f) => { sessionStorage.setItem("pp-unlocked", "1"); sessionStorage.setItem("pp-banner", "1"); localStorage.setItem("pp-finish", f); localStorage.removeItem("pp-home-v2"); }, finish);
    const page = await ctx.newPage();
    await page.goto(base + "/", { waitUntil: "networkidle" });
    if (w >= 900) { await page.mouse.move(40, 40); await page.waitForFunction(() => document.documentElement.hasAttribute("data-3d"), null, { timeout: 25_000 }).catch(() => {}); }
    await page.waitForFunction(() => document.documentElement.hasAttribute("data-awake"));
    await page.waitForTimeout(1500);
    const labels = await page.evaluate(() => [...document.querySelectorAll("[data-home-page='0'] .icon-label")].map((l) => { const r = l.getBoundingClientRect(); return { name: l.textContent, r: [r.x, r.y, r.width, r.height] }; }));
    await page.addStyleTag({ content: "[data-home-layer] [data-home-grid], [data-home-layer] [data-dock], [data-search-pill], [data-screen] > *:not([data-wallpaper]):not(canvas) [data-status] { visibility: hidden !important }" });
    const per = Object.fromEntries(labels.map((l) => [l.name, 99]));
    for (let k = 0; k < 4; k++) {
      await page.waitForTimeout(k ? 1500 : 300);
      const png = await page.screenshot();
      for (const { name, r } of labels) {
        const [x, y, bw, bh] = r.map((n) => Math.round(n * 2));
        const { data, info } = await sharp(png).extract({ left: x, top: y, width: Math.max(1, bw), height: Math.max(1, bh) }).raw().toBuffer({ resolveWithObject: true });
        const L = [];
        for (let i = 0; i < data.length; i += info.channels) L.push(0.2126 * lin(data[i]) + 0.7152 * lin(data[i + 1]) + 0.0722 * lin(data[i + 2]));
        L.sort((p, q) => p - q);
        const c = 1.05 / (L[Math.floor(L.length * 0.95)] + 0.05);
        per[name] = Math.min(per[name], c);
      }
    }
    const row = Object.entries(per).map(([n, c]) => `${n} ${c.toFixed(1)}`).join("  ");
    const min = Math.min(...Object.values(per));
    worst.push(min);
    console.log(`${v} ${finish.padEnd(8)} ${theme.padEnd(5)} min ${min.toFixed(2)} | ${row}`);
    await ctx.close();
  }
}
await browser.close();
console.log(`overall min ${Math.min(...worst).toFixed(2)}`);
