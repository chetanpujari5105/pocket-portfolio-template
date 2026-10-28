import { expect, test, type Page } from "./fixtures";
import { fallbackPosts, substackFeed } from "../content/blog";

// Blog widgets and the new-post banner only exist when there are posts (a feed or fallbackPosts)
const hasPosts = fallbackPosts.length > 0 || substackFeed !== "";

/* In-app physics: collapsing titles, rubber-band overscroll, pull-to-refresh, push views with
 * edge-swipe back, sheets with detents, swipe actions and sliding chip indicators. */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("pp-unlocked", "1"));
});

const screen = (page: Page) => page.locator("[data-screen]");

/** Deep-link into an app and wait until the phone is still (3D swap done, parallax at rest). */
async function open(page: Page, hash: string) {
  await page.goto(`/#${hash}`);
  await expect(page.locator("[data-app-window] > [role=dialog]")).toBeVisible();
  await page.waitForFunction(() => innerWidth < 900 || document.documentElement.hasAttribute("data-3d"), null, {
    timeout: 25_000,
  });
  const box = (await screen(page).boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(700);
}

async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }, steps = 12) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(from.x + ((to.x - from.x) * i) / steps, from.y + ((to.y - from.y) * i) / steps);
    await page.waitForTimeout(16);
  }
  await page.mouse.up();
}

/** Current translateY of the screen's scrolling content (overscroll offset). */
const contentY = (page: Page) =>
  page
    .locator("[data-screen] [role=dialog] .overflow-y-auto > div")
    .first()
    .evaluate((el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).m42);

test("the large title collapses into the frosted bar as you scroll", async ({ page }) => {
  await open(page, "journey");
  const bar = page.locator("[data-screen] .nav-material").first();
  await expect(bar).toHaveCSS("opacity", "0");
  await page.mouse.wheel(0, 300);
  await expect.poll(async () => Number(await bar.evaluate((el) => getComputedStyle(el).opacity))).toBeGreaterThan(0.9);
  await page.mouse.wheel(0, -300);
  await expect.poll(async () => Number(await bar.evaluate((el) => getComputedStyle(el).opacity))).toBeLessThan(0.1);
});

test("overscroll at the top rubber-bands, then springs back", async ({ page }) => {
  await open(page, "journey");
  for (let i = 0; i < 4; i++) await page.mouse.wheel(0, -40);
  await expect.poll(() => contentY(page)).toBeGreaterThan(10);
  // Resistance: far less than the 160 px scrolled
  expect(await contentY(page)).toBeLessThan(120);
  await expect.poll(() => contentY(page)).toBe(0);
});

test("pulling Blog down far enough refreshes the feed", async ({ page }) => {
  await open(page, "blog");
  const request = page.waitForRequest((r) => r.url().endsWith("/api/feed"));
  for (let i = 0; i < 14; i++) {
    await page.mouse.wheel(0, -60);
    await page.waitForTimeout(16);
  }
  await request;
  await expect(page.getByRole("status").filter({ hasText: /up to date|new post/ })).toHaveCount(0);
  await expect.poll(() => contentY(page), { timeout: 8000 }).toBe(0);
});

test("a detail view pushes over its app and swipes back from the left edge", async ({ page }) => {
  await open(page, "courses");
  await page.getByRole("button", { name: /details$/ }).first().click();
  const view = page.locator("[data-push-view]");
  await expect(view).toBeVisible();
  await page.waitForTimeout(600);
  const box = (await view.boundingBox())!;
  const y = box.y + box.height / 2;
  // A short edge drag springs back
  await drag(page, { x: box.x + 18, y }, { x: box.x + 80, y }, 6);
  await page.waitForTimeout(700);
  await expect(view).toBeVisible();
  await expect(page).toHaveURL(/#courses\/.+/);
  // Past halfway it goes back
  await drag(page, { x: box.x + 18, y }, { x: box.x + box.width * 0.75, y });
  await expect(view).toHaveCount(0);
  await expect(page).toHaveURL(/#courses$/);
});

test("a sheet opens at medium, expands from its grabber and drags closed", async ({ page }) => {
  await open(page, "expertise");
  await screen(page).locator("ul button").first().click();
  const grabber = page.getByRole("button", { name: "Expand sheet" });
  await expect(grabber).toBeVisible();
  await page.waitForTimeout(600);
  await grabber.click();
  await expect(page.getByRole("button", { name: "Shrink sheet" })).toBeVisible();
  await page.waitForTimeout(600);
  const g = (await page.locator("[data-grabber]").boundingBox())!;
  const sheet = (await screen(page).boundingBox())!;
  await drag(page, { x: g.x + g.width / 2, y: g.y + g.height / 2 }, { x: g.x + g.width / 2, y: sheet.y + sheet.height * 0.95 });
  await expect(page.locator("[data-sheet]")).toHaveCount(0);
  await expect(page).toHaveURL(/#expertise$/);
});

test("swiping a Blog row left reveals Share; a full swipe on a course opens Enroll", async ({ page, context }) => {
  if (hasPosts) {
    await open(page, "blog");
    const row = page.locator("[data-swipe-row]").first();
    await row.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await page.waitForTimeout(300);
    const b = (await row.boundingBox())!;
    await drag(page, { x: b.x + b.width * 0.8, y: b.y + b.height / 2 }, { x: b.x + b.width * 0.55, y: b.y + b.height / 2 }, 8);
    await expect(page.getByRole("button", { name: "Share", exact: true })).toBeVisible();
  }

  await open(page, "courses");
  await expect(page.getByRole("dialog", { name: "Courses" })).toBeVisible();
  const course = page.locator("[data-swipe-row]").first();
  await course.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(300);
  const r = (await course.boundingBox())!;
  const popup = context.waitForEvent("page");
  await drag(page, { x: r.x + r.width * 0.9, y: r.y + r.height / 2 }, { x: r.x + r.width * 0.1, y: r.y + r.height / 2 });
  // The enroll link (any course URL from content/courses.ts), or a blank tab still loading it
  expect((await popup).url()).toMatch(/^https?:\/\/|^about:blank/);
});

test("the active chip's background slides to the chosen filter", async ({ page }) => {
  await open(page, "projects");
  const group = page.getByRole("group", { name: "Filter projects" });
  const chips = group.getByRole("button");
  await chips.nth(1).click();
  await expect(chips.nth(1)).toHaveAttribute("aria-pressed", "true");
  await expect(chips.nth(1).locator("span.absolute")).toHaveCount(1);
  await expect(chips.nth(0).locator("span.absolute")).toHaveCount(0);
});
