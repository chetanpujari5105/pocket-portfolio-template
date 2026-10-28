// Usage: node scripts/screenshots.mjs <outDir> [path=/] [baseUrl=http://localhost:3000]
// Captures 1440×900, 834×1112 and 390×844 in light and dark.
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const [outDir = "screenshots", path = "/", base = "http://localhost:3000"] =
  process.argv.slice(2);

const sizes = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 834, height: 1112 },
  { name: "phone", width: 390, height: 844 },
];

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch();
const errors = [];

for (const theme of ["light", "dark"]) {
  for (const size of sizes) {
    const context = await browser.newContext({
      viewport: { width: size.width, height: size.height },
      deviceScaleFactor: 1,
      colorScheme: theme,
    });
    await context.addInitScript((t) => {
      try {
        localStorage.setItem("pp-theme", t);
      } catch {}
    }, theme);
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(`${size.name}/${theme}: ${e.message}`));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(`${size.name}/${theme}: ${m.text()}`);
    });
    await page.goto(base + path, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    const slug = path.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "home";
    await page.screenshot({ path: join(outDir, `${slug}-${size.name}-${theme}.png`) });
    await context.close();
  }
}

await browser.close();
console.log(errors.length ? `Console errors:\n${errors.join("\n")}` : "No console errors");
