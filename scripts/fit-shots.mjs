// Screenshots of every size in the v5 device matrix (tests/devices.json), light and dark:
// lock screen, each home page, and an app scrolled to its end. Then one contact sheet per theme
// so the whole matrix can be checked at a glance.
// Usage: node scripts/fit-shots.mjs [baseUrl] [outDir]
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3100";
const outDir = resolve(process.argv[3] ?? "screenshots/fit");
mkdirSync(outDir, { recursive: true });
const sizes = JSON.parse(readFileSync(new URL("../tests/devices.json", import.meta.url), "utf8"));
const slug = (s) => `${s.width}x${s.height}`;

const browser = await chromium.launch();
const sheet = { light: [], dark: [] };

for (const theme of ["light", "dark"]) {
  for (const size of sizes) {
    const ctx = await browser.newContext({
      viewport: { width: size.width, height: size.height },
      deviceScaleFactor: 2,
      hasTouch: true,
      isMobile: size.width < 600 || !!size.landscape,
    });
    await ctx.addInitScript((t) => {
      localStorage.setItem("pp-theme", t);
      sessionStorage.setItem("pp-banner", "1");
    }, theme);
    const page = await ctx.newPage();
    const shots = [];
    const shot = async (view) => {
      const file = `${slug(size)}-${theme}-${view}.png`;
      await page.screenshot({ path: `${outDir}/${file}` });
      shots.push({ view, file });
    };

    await page.goto(base + "/");
    await page.locator("[data-lock]").waitFor();
    await page.waitForTimeout(900);
    await shot("lock");

    await page.evaluate(() => sessionStorage.setItem("pp-unlocked", "1"));
    await page.goto(base + "/");
    await page.waitForFunction(() => document.documentElement.hasAttribute("data-awake") && document.querySelector("[data-measured]"));
    await page.waitForTimeout(1200);
    const pages = await page.locator("[data-home-page]").count();
    for (let i = 0; i < pages; i++) {
      if (i > 0) await page.getByRole("button", { name: `Page ${i + 1} of ${pages}` }).click();
      await page.waitForTimeout(900);
      await shot(`home${i + 1}`);
    }

    // System panels over page 1
    if (pages > 1) await page.getByRole("button", { name: `Page 1 of ${pages}` }).click();
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await page.waitForTimeout(700);
    await shot("search");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    await page.locator("[data-panel-handle]").click();
    await page.waitForTimeout(800);
    await shot("control-center");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: "Open Journey", exact: true }).click();
    await page.waitForTimeout(900);
    await page.keyboard.press("Control+ArrowUp");
    await page.waitForTimeout(900);
    await shot("switcher");
    await page.keyboard.press("Escape");

    await page.goto(base + "/#courses");
    await page.locator("[data-app-window] [role=dialog]").waitFor();
    await page.waitForTimeout(700);
    await page.evaluate(() => {
      const s = [...document.querySelectorAll("[data-app-window] .overflow-y-auto")].at(-1);
      if (s) s.scrollTop = s.scrollHeight;
    });
    await page.waitForTimeout(500);
    await shot("app-end");
    sheet[theme].push({ size, shots });
    await ctx.close();
  }
}

/* ───── Contact sheets: every size in a row, each view at the same height ───── */
for (const theme of ["light", "dark"]) {
  const rows = sheet[theme]
    .map(
      ({ size, shots }) => `
      <section>
        <h2>${size.name} <span>${slug(size)}</span></h2>
        <div class="row">${shots
          .map((s) => `<figure><img src="file://${outDir}/${s.file}" style="height:${size.landscape ? 200 : 360}px"><figcaption>${s.view}</figcaption></figure>`)
          .join("")}</div>
      </section>`,
    )
    .join("");
  const html = `<!doctype html><meta charset="utf-8"><style>
    body{margin:0;padding:24px;background:${theme === "dark" ? "#111" : "#f4f4f6"};color:${theme === "dark" ? "#eee" : "#222"};font:13px system-ui}
    h1{font-size:20px;margin:0 0 16px} h2{font-size:14px;margin:18px 0 8px} h2 span{opacity:.6;font-weight:500}
    .row{display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap} figure{margin:0} figcaption{text-align:center;opacity:.6;margin-top:4px}
    img{display:block;border-radius:10px;box-shadow:0 2px 10px rgb(0 0 0/.25)}
  </style><h1>Pocket Portfolio v5: device matrix (${theme})</h1>${rows}`;
  const htmlPath = `${outDir}/contact-sheet-${theme}.html`;
  writeFileSync(htmlPath, html);
  const ctx = await browser.newContext({ viewport: { width: 1800, height: 1000 } });
  const page = await ctx.newPage();
  await page.goto(`file://${htmlPath}`);
  await page.waitForLoadState("load");
  // JPEG keeps the committed sheets to a few MB; the per-size PNGs stay local (gitignored)
  await page.screenshot({ path: `${outDir}/contact-sheet-${theme}.jpg`, type: "jpeg", quality: 82, fullPage: true });
  await ctx.close();
  console.log(`${outDir}/contact-sheet-${theme}.jpg`);
}
await browser.close();
