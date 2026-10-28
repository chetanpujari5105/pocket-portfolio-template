import { lastWeeks, parseContributionsHtml, type ContributionDay } from "../src/lib/github";
import { expect, test } from "./fixtures";
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

  test("keeps the last 17 whole weeks, starting on a Sunday", () => {
    const days: ContributionDay[] = [];
    for (let d = new Date("2025-10-26T00:00:00Z"); d <= new Date("2026-10-27T00:00:00Z"); d.setUTCDate(d.getUTCDate() + 1))
      days.push({ date: d.toISOString().slice(0, 10), level: 0, count: 0 });
    const kept = lastWeeks(days);
    expect(new Date(`${kept[0].date}T00:00:00Z`).getUTCDay()).toBe(0);
    expect(kept.at(-1)!.date).toBe("2026-10-27");
    // 16 full weeks + Sun–Tue of the current one
    expect(kept.length).toBe(16 * 7 + 3);
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
    // 17 columns of days, today last; squares fade in once the page is in view
    const cells = widget.locator(".gh-cell");
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
