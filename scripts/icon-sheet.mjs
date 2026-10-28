// Renders every home-screen tile (app icons, brand tiles, folder) at 60 px and 180 px on the
// light and dark wallpaper, for checking optical sizing, lighting and squircle corners.
// Usage: node scripts/icon-sheet.mjs <out.png> [baseUrl=http://localhost:3100]
import { chromium } from "@playwright/test";

const [out = "icon-sheet.png", base = "http://localhost:3100"] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 900 }, deviceScaleFactor: 2 });
await page.addInitScript(() => sessionStorage.setItem("pp-unlocked", "1"));
await page.goto(base + "/", { waitUntil: "networkidle" });
await page.evaluate(() => {
  const tiles = [...document.querySelectorAll("[data-home-page='0'] .icon-tile, [data-dock] .icon-tile")];
  const sheet = document.createElement("div");
  sheet.style.cssText = "position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;gap:28px;padding:28px;background:linear-gradient(135deg,#3a2a00,#c99a00 45%,#1a1200)";
  for (const size of [60, 180]) {
    const row = document.createElement("div");
    row.style.cssText = `display:flex;flex-wrap:wrap;gap:${size / 3}px;--icon:${size}px`;
    tiles.forEach((t) => row.append(t.cloneNode(true)));
    sheet.append(row);
  }
  document.body.append(sheet);
});
await page.waitForTimeout(300);
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log(out);
