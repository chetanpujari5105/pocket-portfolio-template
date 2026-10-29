import { courses } from "../content/courses";
import { expertise } from "../content/expertise";
import { services } from "../content/services";
import { EMOJI, app, fitSuite, open, squash, swipeBack, textOf, unlocked, view } from "./apple";
import { expect, test } from "./fixtures";

/* Expertise, laid out like Settings (v12): every area with every tool, a composed tile instead of
 * an emoji, and details that push (and swipe back) with the related courses and services. */

unlocked();

test("every area and every tool, with tiles and no emoji", async ({ page }) => {
  await open(page, "expertise");
  const screen = app(page, "Expertise");
  const text = await textOf(page, "app");
  for (const e of expertise) {
    expect(text).toContain(squash(e.title));
    for (const t of e.tools) expect(text).toContain(squash(t));
  }
  expect(text).not.toMatch(EMOJI);
  await expect(screen.locator("[data-area-row]")).toHaveCount(expertise.length);
  await expect(screen.locator("[data-area-row] .squircle svg")).toHaveCount(expertise.length);
});

test("each detail lists its tools and opens its related courses and services", async ({ page }) => {
  for (const e of expertise) {
    await open(page, `expertise/${e.id}`);
    await expect(view(page)).toBeVisible();
    const told = await textOf(page, "view");
    for (const fact of [e.title, ...e.tools]) expect(told).toContain(squash(fact));
    for (const c of courses.filter((c) => e.relatedCourses.includes(c.id))) expect(told).toContain(squash(c.title));
    for (const s of services.filter((s) => e.relatedServices.includes(s.id))) expect(told).toContain(squash(s.title));
    expect(told).not.toMatch(EMOJI);
    await expect(view(page).locator("[data-related-course]")).toHaveCount(e.relatedCourses.length);
    await expect(view(page).locator("[data-related-service]")).toHaveCount(e.relatedServices.length);
  }
  await open(page, "expertise/design");
  await expect(view(page).locator('[data-related-course="your-first-course"]')).toBeInViewport();
  await view(page).locator('[data-related-course="your-first-course"]').click();
  await expect(page).toHaveURL(/#courses\/your-first-course$/);
  await open(page, "expertise/web");
  // Coming from another app: let the detail finish arriving before pressing in it
  await expect(view(page).locator('[data-related-service="websites"]')).toBeInViewport();
  await page.waitForTimeout(400);
  await view(page).locator('[data-related-service="websites"]').click();
  await expect(page).toHaveURL(/#services\/websites$/);
});

test("an area pushes its detail and swipes back from the left edge", async ({ page }) => {
  await open(page, "expertise");
  await page.locator('[data-area-row="teaching"]').click();
  await expect(view(page)).toBeVisible();
  await expect(page).toHaveURL(/#expertise\/teaching$/);
  await swipeBack(page);
  await expect(view(page)).toHaveCount(0);
  await expect(page).toHaveURL(/#expertise$/);
  await page.locator('[data-area-row="ai"]').click();
  await page.getByRole("button", { name: "Back to Expertise" }).click();
  await expect(view(page)).toHaveCount(0);
});

fitSuite(["expertise", "expertise/ai", "expertise/design"]);
