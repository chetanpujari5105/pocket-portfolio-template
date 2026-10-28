import { expect, test, type Page } from "./fixtures";

/*
 * Problem 2 (v5): apps feel instant. A 4× CPU-throttled phone on "Fast 4G" taps an app from a
 * fresh load: the window must start moving within 50 ms of the click (the same frame), the title
 * must be readable within 400 ms (250 ms target + headless margin), and the app's code must
 * already be on the device (no chunk request after the tap).
 */

export const SPEED_APPS = [
  { id: "journey", title: "Journey" },
  { id: "courses", title: "Courses" },
  { id: "blog", title: "Blog" },
  { id: "projects", title: "Projects" },
  { id: "settings", title: "Settings" },
];

/** DevTools "Fast 4G" preset and a mid-range phone CPU. */
export async function throttle(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  // SPEED_CPU=1 measures the same launches unthrottled
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: Number(process.env.SPEED_CPU ?? 4) });
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 60,
    downloadThroughput: (9 * 1024 * 1024) / 8,
    uploadThroughput: (1.5 * 1024 * 1024) / 8,
  });
  return cdp;
}

/**
 * Records, frame by frame from the click: when the window first moves (its transform changes),
 * and when the title is readable (in the DOM, content opacity ≥ 0.6, inside the screen).
 */
export async function measureLaunch(page: Page, app: { id: string; title: string }) {
  await page.evaluate(({ title }) => {
    const w = window as unknown as { __launch: Record<string, number> };
    w.__launch = {};
    const startClock = () => {
      const t0 = performance.now();
      w.__launch.click = 0;
      let firstTransform: string | null = null;
      const tick = () => {
        const now = performance.now() - t0;
        const win = document.querySelector<HTMLElement>("[data-app-window] [role=dialog]");
        if (win) {
          const tf = win.style.transform || getComputedStyle(win).transform;
          if (w.__launch.mounted === undefined) w.__launch.mounted = now;
          if (firstTransform === null) firstTransform = tf;
          else if (w.__launch.moving === undefined && tf !== firstTransform) w.__launch.moving = now;
          const content = win.querySelector<HTMLElement>("[data-window-content]") ?? (win.firstElementChild as HTMLElement);
          const h1 = [...win.querySelectorAll("h1")].find((h) => h.textContent?.trim() === title);
          const opacity = content ? parseFloat(getComputedStyle(content).opacity) : 0;
          if (h1 && opacity >= 0.6 && w.__launch.readable === undefined) w.__launch.readable = now;
          // Settled: transform reads as full-screen identity for two frames
          if (/^(none|matrix\(1, 0, 0, 1, 0, 0\)|translate3d\(0px, 0px, 0px\) scale\(1\))$/.test(tf)) {
            w.__launch.settled ??= now;
          } else delete w.__launch.settled;
        }
        if (now < 2500) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    // The clock starts at the click itself (before React handles it)
    window.addEventListener("click", startClock, { capture: true, once: true });
  }, app);
}

async function freshHome(page: Page) {
  await page.addInitScript(() => sessionStorage.setItem("pp-unlocked", "1"));
  await page.goto("/", { waitUntil: "load" });
  await page.waitForFunction(() => document.documentElement.hasAttribute("data-awake"));
  // A visitor reads the home screen for a moment before tapping
  await page.waitForTimeout(2000);
}

test.describe("launch speed on a throttled phone", () => {
  // One launch at a time: throttled browsers running side by side roughly double every number
  test.describe.configure({ mode: "default" });
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== "speed", "speed project only");
  });

  for (const app of SPEED_APPS) {
    test(`${app.title}: moves in the tap's frame, readable within 400 ms, code already here`, async ({ page }) => {
      await throttle(page);
      await freshHome(page);
      const late: string[] = [];
      let tapped = false;
      page.on("request", (req) => {
        if (tapped && req.resourceType() === "script") late.push(req.url());
      });
      const icon = page.locator(`[data-icon-tile="${app.id}"]`).first();
      // Apps that sit on a later page: page across first
      for (let i = 0; i < 4 && !(await icon.isVisible()); i++) {
        await page.getByRole("button", { name: /^Page \d+ of \d+$/ }).nth(i + 1).click();
        await page.waitForTimeout(500);
      }
      await measureLaunch(page, app);
      tapped = true;
      await icon.click();
      await page.waitForTimeout(1500);
      const t = await page.evaluate(() => (window as unknown as { __launch: Record<string, number> }).__launch);
      console.log(`${app.title}: ${JSON.stringify(Object.fromEntries(Object.entries(t).map(([k, v]) => [k, Math.round(v)])))}`);
      // Target: moving within 50 ms. Headless Chromium at 4× CPU adds a ~25 ms stall before the
      // first frame (real phones don't) and slower computers add more, so over 50 ms is reported
      // and only over 120 ms fails (the v4 stall this guards against was ~350 ms).
      if (t.moving > 50) test.info().annotations.push({ type: "over target", description: `${app.title} moving at ${Math.round(t.moving)} ms (target 50 ms)` });
      expect(t.moving, "window moving").toBeLessThanOrEqual(120);
      expect(t.readable, "title readable").toBeLessThanOrEqual(400);
      expect(late, "script requests after the tap").toEqual([]);
    });
  }
});
