import { profile } from "../content/profile";
import { story } from "../content/story";
import { timeline } from "../content/timeline";
import { expect, test, type Page } from "./fixtures";

/* Journey: Apple-style grouped layout over content/ — every fact on screen, no emoji, rows that
 * push a detail view and swipe back from the left edge, and type that follows Larger text. */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("pp-unlocked", "1"));
});

const app = (page: Page) => page.getByRole("dialog", { name: "Journey" });

async function open(page: Page, hash = "journey") {
  await page.goto(`/#${hash}`);
  await expect(app(page)).toBeVisible();
  await page.waitForFunction(() => innerWidth < 900 || document.documentElement.hasAttribute("data-3d"), null, { timeout: 25_000 });
  await page.waitForTimeout(600);
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

const squash = (s: string) => s.replace(/\s+/g, " ").toLowerCase();
const EMOJI = /\p{Extended_Pictographic}/u;

test("every fact from content/ is there, word for word, with no emoji", async ({ page }) => {
  await open(page);
  const text = squash((await app(page).textContent()) ?? "");
  for (const fact of [profile.name, profile.role, profile.location, profile.education, profile.highlight.title, profile.highlight.text, ...profile.badges])
    expect(text).toContain(squash(fact));
  // Each milestone: its year, and its sentence split only at the semicolon
  for (const t of timeline) {
    expect(text).toContain(String(t.year));
    for (const part of t.text.split(";")) expect(text).toContain(squash(part.trim()));
  }
  expect(text).not.toMatch(EMOJI);

  // The full story, in its own view
  await page.locator('[data-journey-row="story"]').click();
  const view = page.locator("[data-push-view]");
  await expect(view).toBeVisible();
  const told = squash((await view.textContent()) ?? "");
  for (const p of story) expect(told).toContain(squash(p.replace(/\s*\p{Extended_Pictographic}️?/gu, "")));
  expect(told).not.toMatch(EMOJI);
});

test("a milestone pushes its detail and swipes back from the left edge", async ({ page }) => {
  await open(page);
  // The milestone that names the highlight's place ("Place (what)")
  const nit = timeline.find((t) => t.text.includes(profile.highlight.title.split(" (")[0]))!;
  await page.locator(`[data-journey-row="${nit.year}"]`).click();
  const view = page.locator("[data-push-view]");
  await expect(view).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`#journey/${nit.year}$`));
  // The highlight belongs to this year
  await expect(view.getByText(profile.highlight.text)).toBeVisible();
  await page.waitForTimeout(600);
  const box = (await view.boundingBox())!;
  const y = box.y + box.height / 2;
  await drag(page, { x: box.x + 18, y }, { x: box.x + box.width * 0.75, y });
  await expect(view).toHaveCount(0);
  await expect(page).toHaveURL(/#journey$/);
  // A deep link opens the detail in place, and Back lands on the list
  await open(page, `journey/${timeline[0].year}`);
  await expect(page.locator("[data-push-view]")).toBeVisible();
  await page.getByRole("button", { name: "Back to Journey" }).click();
  await expect(page.locator("[data-push-view]")).toHaveCount(0);
});

test("the system type ramp (Headline 17 / Subheadline 15, years as Nested headers), and Larger text makes all of it bigger", async ({ page }) => {
  await open(page);
  const row = page.locator(`[data-journey-row="${timeline[0].year}"]`);
  const sizes = () =>
    row.evaluate((el) => [...el.querySelectorAll("span.block")].map((s) => parseFloat(getComputedStyle(s).fontSize)));
  expect(await sizes()).toEqual([17, 15]);
  const year = app(page).getByRole("heading", { name: String(timeline[0].year), exact: true });
  await expect(year).toHaveCSS("font-size", "17px");
  await page.evaluate(() => document.documentElement.setAttribute("data-text", "large"));
  const [title, secondary] = await sizes();
  expect(title).toBeGreaterThan(18.5);
  expect(secondary).toBeGreaterThan(16.5);
});
