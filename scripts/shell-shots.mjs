// Shell consistency frames: every app at 390×844 (the site is the phone) and 1440×900 (the 3D
// phone), light and dark, one PNG each into <outDir>. With --sheets <beforeDir>, also writes one
// before/after sheet per app (JPEG, small enough to commit) into <outDir>/../shell-sheets.
// Usage: node scripts/shell-shots.mjs <outDir> [base=http://localhost:3100] [--sheets <beforeDir>]
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import sharp from "sharp";

const args = process.argv.slice(2);
const sheetsAt = args.indexOf("--sheets");
const beforeDir = sheetsAt >= 0 ? args.splice(sheetsAt, 2)[1] : null;
const [outDir = "screenshots/shell", base = "http://localhost:3100"] = args;
await mkdir(outDir, { recursive: true });

const APPS = ["courses", "expertise", "platforms", "reviews", "projects", "blog", "services", "contact", "settings", "journey"];
const VIEWS = { 390: [390, 844], 1440: [1440, 900] };
const browser = await chromium.launch({ args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const errors = [];

for (const [view, [w, h]] of Object.entries(VIEWS))
  for (const theme of ["light", "dark"]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, colorScheme: theme, isMobile: w < 600, hasTouch: w < 900 });
    await ctx.addInitScript((t) => {
      sessionStorage.setItem("pp-unlocked", "1");
      sessionStorage.setItem("pp-banner", "1");
      localStorage.setItem("pp-theme", t);
    }, theme);
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base + "/", { waitUntil: "networkidle" });
    if (w >= 900) {
      await page.mouse.move(40, 40);
      await page.waitForFunction(() => document.documentElement.hasAttribute("data-3d"), null, { timeout: 25_000 });
    }
    await page.waitForFunction(() => document.documentElement.hasAttribute("data-awake"));
    await page.waitForTimeout(w >= 900 ? 2000 : 1000);
    for (const id of APPS) {
      await page.evaluate((id) => (location.hash = id), id);
      await page.waitForSelector("[data-app-window]");
      await page.waitForTimeout(1300);
      await writeFile(join(outDir, `${id}-${view}-${theme}.png`), await page.screenshot());
      await page.evaluate(() => (location.hash = ""));
      await page.waitForTimeout(900);
    }
    await ctx.close();
  }
await browser.close();
console.log(errors.length ? `errors:\n${[...new Set(errors)].join("\n")}` : `${APPS.length * 4} frames in ${outDir}, no page errors`);

// One sheet per app: before over after; each row is 390 light, 390 dark, 1440 light, 1440 dark
if (beforeDir) {
  const sheetsDir = join(dirname(outDir), "shell-sheets");
  await mkdir(sheetsDir, { recursive: true });
  const H = 560;
  const gap = 16;
  for (const id of APPS) {
    const rows = [];
    for (const dir of [beforeDir, outDir]) {
      const files = ["390-light", "390-dark", "1440-light", "1440-dark"].map((k) => join(dir, `${id}-${k}.png`));
      rows.push(await Promise.all(files.map((f) => sharp(f).resize({ height: H }).toBuffer({ resolveWithObject: true }))));
    }
    const width = rows[0].reduce((s, { info }) => s + info.width + gap, -gap);
    const composite = rows.flatMap((row, r) => {
      let left = 0;
      return row.map(({ data, info }) => {
        const c = { input: data, left, top: r * (H + gap) };
        left += info.width + gap;
        return c;
      });
    });
    const file = join(sheetsDir, `${id}.jpg`);
    await sharp({ create: { width, height: H * 2 + gap, channels: 3, background: "#ffffff" } }).composite(composite).jpeg({ quality: 78 }).toFile(file);
    console.log(file);
  }
}
