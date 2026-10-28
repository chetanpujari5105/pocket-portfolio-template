// Renders the PWA icons (any + maskable) from the site's own bolt mark. Run: node scripts/make-icons.mjs
import { chromium } from "playwright";

const bolt = (scale) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="100%" height="100%">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="#ffd23f"/><stop offset="1" stop-color="#f08a00"/></linearGradient></defs>
    <rect width="64" height="64" fill="url(#g)"/>
    <g transform="translate(32 32) scale(${scale}) translate(-32 -32)"><path d="M36.5 8 17 36h12.5L26 56l21-29.5H34.2L36.5 8Z" fill="#1a1205"/></g>
  </svg>`;

const icons = [
  { file: "icon-192.png", size: 192, scale: 0.86 },
  { file: "icon-512.png", size: 512, scale: 0.86 },
  // Maskable: the mark stays inside the 80% safe zone whatever shape the launcher cuts
  { file: "icon-maskable-512.png", size: 512, scale: 0.62 },
];

const browser = await chromium.launch();
for (const { file, size, scale } of icons) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<html><body style="margin:0">${bolt(scale)}</body></html>`);
  await page.screenshot({ path: `public/icons/${file}`, omitBackground: false });
  await page.close();
}
await browser.close();
console.log("icons written");
