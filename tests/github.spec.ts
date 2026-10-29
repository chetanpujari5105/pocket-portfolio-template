import { lastWeeks, parseContributionsHtml, type ContributionDay } from "../src/lib/github";
import { expect, settled, test, type Page } from "./fixtures";
import snapshot from "../public/content/github-contributions.json";
import { profile } from "../content/profile";

/* Page 2's GitHub heatmap: the calendar parser, and the widget itself. */

const SAMPLE = `
<h2 class="f4 text-normal mb-2">
      1,234
      contributions
        in the last year
    </h2>
<td tabindex="0" data-ix="0" style="width: 11px" data-date="2026-10-25" id="contribution-day-component-0-0" data-level="0" role="gridcell" class="ContributionCalendar-day"></td>
<td tabindex="0" data-ix="0" style="width: 11px" data-date="2026-10-26" id="contribution-day-component-1-0" data-level="3" role="gridcell" class="ContributionCalendar-day"></td>
<td tabindex="0" data-ix="0" style="width: 11px" data-date="2026-10-27" id="contribution-day-component-2-0" data-level="1" role="gridcell" class="ContributionCalendar-day"></td>
<tool-tip id="tooltip-1" for="contribution-day-component-0-0" popover="manual" class="sr-only">No contributions on October 25th.</tool-tip>
<tool-tip id="tooltip-2" for="contribution-day-component-1-0" popover="manual" class="sr-only">1,024 contributions on October 26th.</tool-tip>
<tool-tip id="tooltip-3" for="contribution-day-component-2-0" popover="manual" class="sr-only">1 contribution on October 27th.</tool-tip>`;

test.describe("calendar parser", () => {
  test.beforeEach(({}, info) => test.skip(info.project.name !== "desktop", "pure function, one project is enough"));

  test("reads day cells, levels, counts and the yearly total", () => {
    const { total, days } = parseContributionsHtml(SAMPLE);
    expect(total).toBe(1234);
    expect(days).toEqual([
      { date: "2026-10-25", level: 0, count: 0 },
      { date: "2026-10-26", level: 3, count: 1024 },
      { date: "2026-10-27", level: 1, count: 1 },
    ]);
  });

  test("keeps the last 34 whole weeks, starting on a Sunday", () => {
    const days: ContributionDay[] = [];
    for (let d = new Date("2025-10-26T00:00:00Z"); d <= new Date("2026-10-27T00:00:00Z"); d.setUTCDate(d.getUTCDate() + 1))
      days.push({ date: d.toISOString().slice(0, 10), level: 0, count: 0 });
    const kept = lastWeeks(days);
    expect(new Date(`${kept[0].date}T00:00:00Z`).getUTCDay()).toBe(0);
    expect(kept.at(-1)!.date).toBe("2026-10-27");
    // 33 full weeks + Sun–Tue of the current one
    expect(kept.length).toBe(33 * 7 + 3);
  });
});

test.describe("widget", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem("pp-unlocked", "1"));
  });

  test("sits at the top of page 2, links the profile and fits without scrolling", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Page 2 of 2" }).click();
    const widget = page.locator("[data-github-widget]");
    await expect(widget).toBeVisible();
    await expect(widget).toHaveAttribute("href", `https://github.com/${profile.github}`);
    await expect(widget).toHaveAttribute(
      "aria-label",
      new RegExp(`^GitHub: (\\d[\\d,]* contributions in the last year|${profile.github}\\. View on GitHub)`),
    );
    // At least 17 columns of days showing, today last; squares fade in once the page is in view
    const cells = widget.locator(".gh-cell:visible");
    expect(await cells.count()).toBeGreaterThan(16 * 7);
    await expect(widget.locator(".gh-today")).toHaveCount(1);
    await expect(widget.locator("[data-shown]")).toHaveCount(1);
    await expect(cells.last()).toHaveCSS("opacity", "1");
    // First widget on the page; every page-2 widget ends above the page dots
    const page2 = page.locator('[data-home-page="1"]');
    const first = page2.locator("[data-nav]").first();
    await expect(first).toHaveAttribute("data-github-widget");
    const dots = (await page.getByRole("button", { name: "Search" }).boundingBox())!;
    for (const item of await page2.locator("[data-nav]").all()) {
      const box = (await item.boundingBox())!;
      expect(box.y + box.height).toBeLessThanOrEqual(dots.y + 1);
    }
  });
});

/** Every square the tile shows: fully opaque, and the square itself is what a tap at its centre hits. */
function squares(page: Page) {
  return page.locator("[data-github-widget]").evaluate((widget) => {
    const cells = [...widget.querySelectorAll<HTMLElement>(".gh-cell")].filter((c) => c.offsetParent !== null);
    const bad = cells.filter((c) => {
      const r = c.getBoundingClientRect();
      return parseFloat(getComputedStyle(c).opacity) < 0.999 || document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) !== c;
    });
    return { count: cells.length, bad: bad.length };
  });
}

const gridBox = (page: Page) => page.locator("[data-github-widget] .gh-grid").boundingBox();

test.describe("heatmap is never blank", () => {
  // Requests must reach page.route (a service worker would answer them itself)
  test.use({ serviceWorkers: "block" });
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem("pp-unlocked", "1"));
  });

  test("slow data: the grid shows at once, every square visible and hit-testable, through a tilt and a flip", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "the 3D phone");
    test.setTimeout(60_000);
    // Fast 4G, and the contributions response held for at least 3 s (until the checks below)
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 60, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (1.5 * 1024 * 1024) / 8 });
    let release!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    await page.route("**/api/contributions", async (route) => {
      await Promise.all([held, new Promise((r) => setTimeout(r, 3000))]);
      await route.continue();
    });

    await page.goto("/");
    await settled(page);
    // Tilt the phone, then swipe to page 2
    await page.mouse.move(1380, 860, { steps: 6 });
    await page.waitForTimeout(400);
    // Timed in the page, frame by frame from the click itself: when the full grid first shows,
    // and when every square is first fully opaque and hit-testable
    await page.evaluate(() => {
      const w = window as unknown as { __gh: { grid?: number; ready?: number } };
      w.__gh = {};
      addEventListener(
        "click",
        () => {
          const t0 = performance.now();
          const tick = () => {
            const widget = document.querySelector("[data-github-widget]");
            const cells = widget ? [...widget.querySelectorAll<HTMLElement>(".gh-cell")].filter((c) => c.offsetParent !== null) : [];
            const t = performance.now() - t0;
            if (cells.length >= 17 * 7 && w.__gh.grid === undefined) w.__gh.grid = t;
            const good = cells.every((c) => {
              const r = c.getBoundingClientRect();
              return parseFloat(getComputedStyle(c).opacity) >= 0.999 && document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) === c;
            });
            if (cells.length && good && w.__gh.ready === undefined) w.__gh.ready = t;
            if (t < 3000 && w.__gh.ready === undefined) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        },
        { capture: true, once: true },
      );
    });
    await page.getByRole("button", { name: /^Page 2 of \d+$/ }).click();
    const widget = page.locator("[data-github-widget]");
    await page.waitForTimeout(1200);
    const timing = await page.evaluate(() => (window as unknown as { __gh: { grid?: number; ready?: number } }).__gh);

    // The skeleton: the grid's real shape within 500 ms of the swipe (the data is still held)
    await expect(widget.locator("[data-widget-tile]")).toHaveAttribute("data-source", "skeleton");
    expect(timing.grid, "full grid showing (ms after the swipe)").toBeLessThanOrEqual(500);
    // Every square fully visible and hit-testable within 1 s (the column fade takes 800 ms)
    expect(timing.ready, "every square visible and hit-testable (ms after the swipe)").toBeLessThanOrEqual(1000);
    expect((await squares(page)).bad).toBe(0);
    const before = (await gridBox(page))!;

    // The data lands: the same squares recolour, nothing moves
    release();
    await expect(widget.locator("[data-widget-tile]")).toHaveAttribute("data-source", "github", { timeout: 10_000 });
    await expect(widget.locator(".gh-cell[data-level]").first()).toBeAttached();
    const after = (await gridBox(page))!;
    for (const k of ["x", "y", "width", "height"] as const) expect(Math.abs(after[k] - before[k])).toBeLessThan(0.5);
    expect((await squares(page)).bad).toBe(0);

    // Mouse moves across the studio, then a flip and back: still all there
    for (let i = 0; i < 6; i++) await page.mouse.move(80 + i * 220, 60 + i * 140);
    await page.waitForTimeout(500);
    expect((await squares(page)).bad).toBe(0);
    await page.getByRole("button", { name: "Flip the phone" }).click();
    await page.waitForTimeout(1200);
    await page.getByRole("button", { name: /Flip the phone/ }).click();
    await page.waitForTimeout(1200);
    await expect.poll(async () => (await squares(page)).bad, { timeout: 1000 }).toBe(0);
  });

  test("GitHub data unavailable: the committed snapshot fills the heatmap", async ({ page }, info) => {
    test.skip(info.project.name !== "phone", "one project is enough");
    await page.route("**/api/contributions", (route) => route.abort());
    await page.goto("/");
    await page.getByRole("button", { name: /^Page 2 of \d+$/ }).click();
    const widget = page.locator("[data-github-widget]");
    await expect(widget.locator("[data-widget-tile]")).toHaveAttribute("data-source", "snapshot");
    const levels = snapshot.days.filter((d) => d.level > 0).length;
    expect(levels).toBeGreaterThan(0);
    expect(await widget.locator(".gh-cell[data-level]:not([data-level='0'])").count()).toBe(levels);
    await expect(widget).toHaveAttribute("aria-label", new RegExp(`^GitHub: ${snapshot.total!.toLocaleString("en-US")} contributions`));
    // The snapshot's newest day isn't today: no pulse
    await expect(widget.locator(".gh-today")).toHaveCount(0);
    await expect.poll(async () => (await squares(page)).bad).toBe(0);
  });
});
