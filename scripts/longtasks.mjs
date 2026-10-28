// Long tasks (>50 ms) during interactions, after the page and its lazy 3D stage have settled:
// desktop, an iPhone 13, and the same phone with its CPU slowed 4×.
// Exits non-zero if any long task lands while interacting.
// Usage: node scripts/longtasks.mjs [baseUrl]   (run against a production server)
import { chromium, devices } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3100";
const browser = await chromium.launch({ args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });

async function run(label, contextOptions, interact, cpu = 1) {
  const ctx = await browser.newContext(contextOptions);
  await ctx.addInitScript(() => {
    sessionStorage.setItem("pp-unlocked", "1");
    window.__long = [];
    new PerformanceObserver((list) =>
      list.getEntries().forEach((e) => window.__long.push({ at: Math.round(e.startTime), ms: Math.round(e.duration), step: window.__step })),
    ).observe({ type: "longtask", buffered: true });
  });
  const page = await ctx.newPage();
  // A mid-range phone: the CPU slowed 4× (DevTools' "4× slowdown")
  if (cpu > 1) await (await ctx.newCDPSession(page)).send("Emulation.setCPUThrottlingRate", { rate: cpu });
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
    `${label}: ${steps} interactions, long tasks during them: ${during.length ? during.map((t) => `${t.ms}ms (${t.step})`).join(", ") : "none"}` +
      ` (before interacting, while loading: ${load.map((t) => `${t.ms}ms`).join(", ") || "none"})`,
  );
  await ctx.close();
  return during;
}

const open = (page, name) => page.getByRole("button", { name: `Open ${name}`, exact: true }).first().click({ force: true });
const pause = (page, ms = 700) => page.waitForTimeout(ms);
/** Names what comes next, so a long task can say which interaction it belonged to */
const step = (page, name) => page.evaluate((n) => (window.__step = n), name);

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
    await step(page, `open ${app}`);
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
  await step(page, "page swipe");
  await swipe(screen.x + screen.width * 0.85, screen.y + screen.height * 0.45, screen.x + screen.width * 0.15, screen.y + screen.height * 0.45);
  await pause(page);
  await swipe(screen.x + screen.width * 0.15, screen.y + screen.height * 0.45, screen.x + screen.width * 0.85, screen.y + screen.height * 0.45);
  await pause(page);
  // Pull-down search, type, close
  await step(page, "search");
  await swipe(cx, screen.y + screen.height * 0.6, cx, screen.y + screen.height * 0.6 + 170);
  await pause(page, 400);
  await page.keyboard.type("course");
  await pause(page, 400);
  await page.keyboard.press("Escape");
  await pause(page);
  // Control Center open, toggle dark mode, close
  await step(page, "Control Center");
  await page.locator("[data-panel-handle]").click({ force: true });
  await pause(page);
  await step(page, "dark mode");
  await page.getByRole("button", { name: /Dark mode/ }).last().click({ force: true });
  await pause(page, 900);
  await step(page, "Control Center");
  await page.keyboard.press("Escape");
  await pause(page);
  n += 6;
  // Edit the home screen: long-press, drag one icon beside another, drop-and-hold for a folder,
  // the App Library, Done (pointer or touch alike: the mouse stands in for a finger)
  const tile = async (key) => {
    const b = await page.locator(`[data-home-key="${key}"] [data-icon-tile]`).first().boundingBox();
    return { x: b.x + b.width / 2, y: b.y + b.height / 2, left: b.x + 3 };
  };
  const drag = async (from, to, hold) => {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    for (let i = 1; i <= 12; i++) await page.mouse.move(from.x + ((to.x - from.x) * i) / 12, from.y + ((to.y - from.y) * i) / 12);
    await page.waitForTimeout(hold);
    await page.mouse.up();
    await pause(page);
  };
  await step(page, "edit: long-press");
  const journey = await tile("journey");
  await page.mouse.move(journey.x, journey.y);
  await page.mouse.down();
  await page.waitForTimeout(650);
  await page.mouse.up();
  await pause(page);
  await step(page, "edit: drag");
  const x = await tile("x");
  const youtube = await tile("youtube");
  await drag(x, { x: youtube.left, y: youtube.y }, 300);
  await step(page, "edit: folder");
  await drag(await tile("expertise"), await tile("platforms"), 600);
  const folder = (await page.locator("[data-folder]").count()) > 0;
  if (!folder) console.log("  (the drop-and-hold made no folder)");
  else {
    await page.keyboard.press("Escape");
    await pause(page);
  }
  await step(page, "edit: App Library");
  await page.getByRole("button", { name: "Add apps from the App Library" }).click();
  await pause(page);
  await page.keyboard.press("Escape");
  await pause(page);
  await step(page, "edit: Done");
  await page.getByRole("button", { name: "Done", exact: true }).click();
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
const slow = await run("phone, 4× CPU", { ...devices["iPhone 13"], defaultBrowserType: undefined }, (p) => tour(p, { touch: true }), 4);
await browser.close();
process.exit(desktop.length + phone.length + slow.length ? 1 : 0);
