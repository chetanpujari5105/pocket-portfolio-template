// Long tasks (>50 ms) during interactions, after the page and its lazy 3D stage have settled.
// Exits non-zero if any long task lands while interacting.
// Usage: node scripts/longtasks.mjs [baseUrl]   (run against a production server)
import { chromium, devices } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3100";
const browser = await chromium.launch({ args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });

async function run(label, contextOptions, interact) {
  const ctx = await browser.newContext(contextOptions);
  await ctx.addInitScript(() => {
    sessionStorage.setItem("pp-unlocked", "1");
    window.__long = [];
    new PerformanceObserver((list) =>
      list.getEntries().forEach((e) => window.__long.push({ at: Math.round(e.startTime), ms: Math.round(e.duration) })),
    ).observe({ type: "longtask", buffered: true });
  });
  const page = await ctx.newPage();
  await page.goto(base + "/", { waitUntil: "networkidle" });
  await page.mouse.move(200, 200); // the 3D stage loads on the first sign of a visitor
  await page.waitForFunction(() => innerWidth < 900 || document.documentElement.hasAttribute("data-3d"), null, { timeout: 25_000 });
  await page.waitForTimeout(2500);
  const start = await page.evaluate(() => performance.now());
  const steps = await interact(page);
  const all = await page.evaluate(() => window.__long);
  const during = all.filter((t) => t.at >= start);
  const load = all.filter((t) => t.at < start);
  console.log(
    `${label}: ${steps} interactions, long tasks during them: ${during.length ? during.map((t) => `${t.ms}ms`).join(", ") : "none"}` +
      ` (before interacting, while loading: ${load.map((t) => `${t.ms}ms`).join(", ") || "none"})`,
  );
  await ctx.close();
  return during;
}

const open = (page, name) => page.getByRole("button", { name: `Open ${name}`, exact: true }).first().click({ force: true });
const pause = (page, ms = 700) => page.waitForTimeout(ms);

async function tour(page, { touch }) {
  let n = 0;
  const screen = (await page.locator("[data-screen]").boundingBox()) ?? { x: 0, y: 0, width: 390, height: 844 };
  const cx = screen.x + screen.width / 2;
  const swipe = async (x1, y1, x2, y2) => {
    await page.mouse.move(x1, y1);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) await page.mouse.move(x1 + ((x2 - x1) * i) / 10, y1 + ((y2 - y1) * i) / 10);
    await page.mouse.up();
  };
  for (const app of ["Courses", "Journey", "Blog", "Settings", "Projects"]) {
    await open(page, app);
    await pause(page);
    await page.mouse.move(cx, screen.y + screen.height * 0.5);
    for (let i = 0; i < 6; i++) {
      await page.mouse.wheel(0, 260);
      await page.waitForTimeout(60);
    }
    await pause(page, 400);
    await page.keyboard.press("Escape");
    await pause(page);
    n += 3;
  }
  // Page to the widgets and back
  await swipe(screen.x + screen.width * 0.85, screen.y + screen.height * 0.45, screen.x + screen.width * 0.15, screen.y + screen.height * 0.45);
  await pause(page);
  await swipe(screen.x + screen.width * 0.15, screen.y + screen.height * 0.45, screen.x + screen.width * 0.85, screen.y + screen.height * 0.45);
  await pause(page);
  // Pull-down search, type, close
  await swipe(cx, screen.y + screen.height * 0.6, cx, screen.y + screen.height * 0.6 + 170);
  await pause(page, 400);
  await page.keyboard.type("course");
  await pause(page, 400);
  await page.keyboard.press("Escape");
  await pause(page);
  // Control Center open, toggle dark mode, close
  await page.locator("[data-panel-handle]").click({ force: true });
  await pause(page);
  await page.getByRole("button", { name: /Dark mode/ }).last().click({ force: true });
  await pause(page, 900);
  await page.keyboard.press("Escape");
  await pause(page);
  n += 6;
  if (!touch) {
    // App switcher
    await open(page, "Journey");
    await pause(page);
    await page.keyboard.press("Control+ArrowUp");
    await pause(page);
    await page.keyboard.press("Escape");
    await pause(page);
    n += 2;
  }
  return n;
}

const desktop = await run("desktop 1440×900", { viewport: { width: 1440, height: 900 } }, (p) => tour(p, { touch: false }));
const phone = await run("phone (iPhone 13)", { ...devices["iPhone 13"], defaultBrowserType: undefined }, (p) => tour(p, { touch: true }));
await browser.close();
process.exit(desktop.length + phone.length ? 1 : 0);
