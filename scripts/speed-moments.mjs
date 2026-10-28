// The launch moments the speed spec doesn't cover, on a 4× CPU-throttled phone (392×690):
// close (Escape → window gone), app switch (tap a switcher card → the app settled full screen)
// and frames per second during a home page swipe. Records a video of the whole run.
// Usage: node scripts/speed-moments.mjs [baseUrl] [video.webm]
import { renameSync } from "node:fs";
import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3100";
const videoOut = process.argv[3];
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 392, height: 690 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  ...(videoOut ? { recordVideo: { dir: "/tmp/pp-speed-video", size: { width: 392, height: 690 } } } : {}),
});
await ctx.addInitScript(() => sessionStorage.setItem("pp-unlocked", "1"));
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
await page.goto(base + "/", { waitUntil: "load" });
await page.waitForFunction(() => document.documentElement.hasAttribute("data-awake"));
await page.waitForTimeout(2500);

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const open = async (id) => {
  await page.locator(`[data-icon-tile="${id}"]`).first().click();
  await page.waitForTimeout(900);
};
// Close: from the key press to the window leaving the DOM
const closeOnce = async () => {
  await page.evaluate(() => {
    const w = window;
    w.__close = null;
    const t0 = performance.now();
    const tick = () => (document.querySelector("[data-app-window]") ? requestAnimationFrame(tick) : (w.__close = performance.now() - t0));
    requestAnimationFrame(tick);
  });
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => window.__close !== null);
  const ms = await page.evaluate(() => window.__close);
  await page.waitForTimeout(500);
  return ms;
};
const closes = [];
for (const id of ["journey", "courses", "projects"]) {
  await open(id);
  closes.push(await closeOnce());
}

// App switch: Journey is up, the switcher opens over it, tap the Courses card
const switches = [];
for (let i = 0; i < 2; i++) {
  await open("journey");
  await page.keyboard.press("Control+ArrowUp");
  await page.waitForTimeout(900);
  const card = page.getByRole("dialog", { name: "App switcher" }).getByRole("button", { name: /Courses/ }).first();
  await page.evaluate(() => {
    const w = window;
    w.__switch = null;
    addEventListener(
      "click",
      () => {
        const t0 = performance.now();
        let still = 0;
        const tick = () => {
          const win = document.querySelector('[data-app-window="courses"] [role=dialog]');
          const tf = win ? getComputedStyle(win).transform : "";
          still = win && /^(none|matrix\(1, 0, 0, 1, 0, 0\))$/.test(tf) ? still + 1 : 0;
          if (still >= 2) w.__switch = performance.now() - t0;
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { capture: true, once: true },
    );
  });
  await card.click();
  const settled = await page.waitForFunction(() => window.__switch !== null, null, { timeout: 5000 }).then(() => true, () => false);
  if (settled) switches.push(await page.evaluate(() => window.__switch));
  else console.error("app switch: the window never settled full screen");
  await page.waitForTimeout(400);
  await closeOnce();
}

// Page swipe: frames drawn while a finger drags page 1 → 2 over ~400 ms
const box = (await page.locator("[data-screen]").boundingBox()) ?? { x: 0, y: 0, width: 392, height: 690 };
await page.evaluate(() => {
  const w = window;
  w.__frames = [];
  const tick = (t) => {
    w.__frames.push(t);
    if (w.__frames.length < 400) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
const y = box.y + box.height * 0.45;
const t0 = await page.evaluate(() => performance.now());
await page.mouse.move(box.x + box.width * 0.85, y);
await page.mouse.down();
for (let i = 1; i <= 24; i++) {
  await page.mouse.move(box.x + box.width * (0.85 - 0.7 * (i / 24)), y);
  await page.waitForTimeout(16);
}
await page.mouse.up();
await page.waitForTimeout(500);
const t1 = await page.evaluate(() => performance.now());
const frames = await page.evaluate(([a, b]) => window.__frames.filter((t) => t >= a && t <= b), [t0, t1]);
const gaps = frames.slice(1).map((t, i) => t - frames[i]);
const fps = Math.round((frames.length - 1) / ((frames.at(-1) - frames[0]) / 1000));
const worst = Math.round(Math.max(...gaps));

const video = page.video();
await ctx.close();
if (videoOut && video) renameSync(await video.path(), videoOut);
await browser.close();
console.log(
  JSON.stringify({
    closeMs: Math.round(median(closes)),
    closes: closes.map(Math.round),
    switchMs: switches.length ? Math.round(median(switches)) : null,
    switches: switches.map(Math.round),
    swipeFps: fps,
    worstFrameMs: worst,
  }),
);
