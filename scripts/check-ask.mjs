// Usage: node scripts/check-ask.mjs <outDir> [baseUrl] — needs a build with NEXT_PUBLIC_ENABLE_ASK=true
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";

// The featured course id and the first course URL, read from content/courses.ts
const coursesSrc = readFileSync(new URL("../content/courses.ts", import.meta.url), "utf8");
const courseId = coursesSrc.match(/id: "([^"]+)"/)[1];
const courseUrl = coursesSrc.match(/url: "([^"]+)"/)[1];
const [out = "screens", base = "http://localhost:3100"] = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
await p.goto(base + "/", { waitUntil: "networkidle" });
await p.waitForTimeout(800);
await p.screenshot({ path: `${out}/ask-home.png` });
await p.getByRole("button", { name: /^Open Ask / }).click();
await p.waitForTimeout(900);
console.log("opened:", await p.evaluate(() => location.hash));

// Real route without a key → graceful notice
await p.getByRole("button", { name: "Which course should I start with?" }).click();
await p.waitForTimeout(1500);
await p.screenshot({ path: `${out}/ask-nokey.png` });
console.log("after suggestion:", await p.evaluate(() => location.hash), await p.locator("[role=dialog]").count());
console.log("no-key notice:", await p.getByRole("status").filter({ hasText: "email me directly" }).count());

// Stubbed reply: course token, an allowed link and a non-allowed link
await p.route("**/api/ask", (route) =>
  route.fulfill({
    json: {
      ok: true,
      reply:
        `Start with this one.\n{{course:${courseId}}}\nMore here: ${courseUrl} and not this https://evil.example.com/x`,
    },
  }),
);
await p.fill("#ask-input", "What should I learn first?");
await p.keyboard.press("Enter");
await p.waitForTimeout(1200);
console.log("course card:", await p.getByRole("button", { name: /View course/ }).count());
console.log("links:", await p.locator('[aria-label="Conversation"] a').evaluateAll((as) => as.map((a) => a.getAttribute("href"))));
await p.screenshot({ path: `${out}/ask-chat.png` });
await p.getByRole("button", { name: /View course/ }).first().click();
await p.waitForTimeout(900);
console.log("card opens:", await p.evaluate(() => location.hash));
console.log(errs.length ? errs.join("\n") : "no errors");
await b.close();
