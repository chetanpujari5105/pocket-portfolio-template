// Usage: node scripts/check-3d.mjs <outDir> [baseUrl]
import { chromium } from "@playwright/test";
const [out = "screens", base = "http://localhost:3200"] = process.argv.slice(2);
const b = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
await p.goto(base + "/", { waitUntil: "networkidle", timeout: 120000 });
await p.waitForTimeout(4000);
console.log(
  "canvas:", await p.locator("canvas").count(),
  "3d wrap:", await p.locator(".phone-wrap-3d").count(),
  "css phone:", await p.locator(".phone-wrap").count(),
);
if (errs.length) console.log("load errors:\n" + errs.join("\n"));
await p.mouse.move(200, 150);
await p.waitForTimeout(1200);
await p.screenshot({ path: `${out}/3d-tilt.png` });
await p.getByRole("button", { name: "Open Courses" }).click();
await p.waitForTimeout(1200);
console.log("opened:", await p.evaluate(() => location.hash));
await p.screenshot({ path: `${out}/3d-app.png` });
await p.keyboard.press("Escape");
await p.waitForTimeout(900);
console.log("closed:", await p.evaluate(() => location.hash));
console.log(errs.length ? errs.join("\n") : "no errors");
await b.close();
