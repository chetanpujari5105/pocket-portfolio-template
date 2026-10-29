import { reviewSource, reviews } from "../content/reviews";
import { expect, test, type Page } from "./fixtures";

/* Reviews: reviews copied word for word from one platform (content/reviews.ts); a summary computed
 * from them; a paged carousel that follows the finger; "See All Reviews" with course filters and
 * rows that open the course. Sample reviews wear a "Sample" tag until they are replaced. */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("pp-unlocked", "1"));
});

const app = (page: Page) => page.getByRole("dialog", { name: "Reviews" });
const squash = (s: string) => s.replace(/\s+/g, " ").trim();

async function open(page: Page, hash = "reviews") {
  await page.goto(`/#${hash}`);
  await expect(app(page)).toBeVisible();
  await page.waitForFunction(() => innerWidth < 900 || document.documentElement.hasAttribute("data-3d"), null, { timeout: 25_000 });
  await page.waitForTimeout(600);
}

test("content: one review per person, 1–5 stars; samples are never verified and real ones always are", () => {
  expect(reviews.length).toBeGreaterThanOrEqual(4);
  expect(new Set(reviews.map((r) => r.author)).size).toBe(reviews.length);
  expect(new Set(reviews.map((r) => r.id)).size).toBe(reviews.length);
  for (const r of reviews) {
    expect(r.rating).toBeGreaterThanOrEqual(1);
    expect(r.rating).toBeLessThanOrEqual(5);
    expect(r.courseUrl).toMatch(/^https:\/\//);
    expect(r.text.trim().length, r.id).toBeGreaterThan(0);
    expect(r.sample ? !r.verified : r.verified, r.id).toBe(true);
  }
});

test("summary, carousel and the full list show the reviews word for word", async ({ page }) => {
  await open(page);
  const summary = app(page).getByRole("region", { name: "Ratings summary" });
  const average = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  await expect(summary).toContainText(average.toFixed(1));
  await expect(summary).toContainText(`${reviews.length} reviews shown here`);
  if (reviews.some((r) => r.sample)) await expect(summary).toContainText(`Sample reviews: replace them with real ones copied from ${reviewSource.name}`);
  else if (reviewSource.totals) await expect(summary).toContainText(reviewSource.totals.reviews.toLocaleString("en-US"));
  await expect(app(page)).not.toContainText("coming soon");

  await app(page).getByRole("button", { name: "See All Reviews" }).click();
  const view = page.locator("[data-push-view]");
  await expect(view).toBeVisible();
  const rows = view.locator("[data-review-row]");
  await expect(rows).toHaveCount(reviews.length);
  const text = squash(await view.innerText());
  for (const r of reviews) {
    expect(text).toContain(squash(r.text));
    expect(text).toContain(r.author);
  }
  // Samples wear the tag, real reviews don't
  await expect(view.locator("[data-sample-tag]")).toHaveCount(reviews.filter((r) => r.sample).length);
  // Each row opens its course in a new tab
  const first = rows.first();
  await expect(first).toHaveAttribute("href", reviews[0].courseUrl);
  await expect(first).toHaveAttribute("target", "_blank");

  // A course chip narrows the list
  const chip = reviews[0].courseShort;
  await view.getByRole("button", { name: chip, exact: true }).click();
  await expect(rows).toHaveCount(reviews.filter((r) => r.courseShort === chip).length);
  await view.getByRole("button", { name: "All", exact: true }).click();
  await expect(rows).toHaveCount(reviews.length);
});

test("the carousel pages with a drag, the arrow keys and the dots", async ({ page }) => {
  await open(page);
  const carousel = app(page).locator("[data-review-carousel]");
  const dots = app(page).getByRole("tablist", { name: "Pages" }).getByRole("tab");
  await expect(dots.first()).toHaveAttribute("aria-selected", "true");

  const box = (await carousel.boundingBox())!;
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width * 0.8, y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) {
    await page.mouse.move(box.x + box.width * (0.8 - 0.06 * i), y);
    await page.waitForTimeout(16);
  }
  await page.mouse.up();
  await expect(dots.nth(1)).toHaveAttribute("aria-selected", "true");

  await carousel.focus();
  await page.keyboard.press("ArrowRight");
  await expect(dots.nth(2)).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowLeft");
  await expect(dots.nth(1)).toHaveAttribute("aria-selected", "true");

  await dots.nth(2).click();
  await expect(dots.nth(2)).toHaveAttribute("aria-selected", "true");
  // The selected slide is in view, inside the carousel
  await page.waitForTimeout(500);
  const slide = (await app(page).locator('[data-review-slide="2"]').boundingBox())!;
  const frame = (await carousel.boundingBox())!;
  expect(slide.x).toBeGreaterThanOrEqual(frame.x - 1);
  expect(slide.x + slide.width).toBeLessThanOrEqual(frame.x + frame.width + 1);
});

test("no emoji anywhere in the app", async ({ page }) => {
  await open(page, "reviews/all");
  const text = (await page.locator("[data-app-window]").textContent()) ?? "";
  expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
});
