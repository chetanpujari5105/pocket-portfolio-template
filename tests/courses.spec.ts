import { courseCategories, courses } from "../content/courses";
import { profile } from "../content/profile";
import { EMOJI, app, fitSuite, open, squash, swipeBack, textOf, unlocked, view } from "./apple";
import { expect, test } from "./fixtures";

/* Courses, laid out like Settings (v12): the featured course, one section per category, every
 * course's facts and enroll link, no emoji, and details that push and swipe back. */

unlocked();

test("every course, grouped by category, with the stats and no emoji", async ({ page }) => {
  await open(page, "courses");
  const screen = app(page, "Courses");
  const text = await textOf(page, "app");
  expect(text).toContain(`${profile.stats.courses}+ courses`);
  for (const c of courses) {
    expect(text).toContain(squash(c.title));
    expect(text).toContain(squash(c.badge));
  }
  expect(text).not.toMatch(EMOJI);
  for (const cat of courseCategories) await expect(screen.getByRole("heading", { name: cat, level: 2 })).toBeVisible();
  await expect(screen.locator("[data-course-row]")).toHaveCount(courses.length);
  await expect(screen.locator("[data-course-featured]")).toContainText(courses.find((c) => c.featured)!.blurb);

  const all = screen.locator("[data-udemy-profile]");
  await expect(all).toHaveAttribute("href", profile.udemyProfile);
  await expect(all).toHaveAttribute("target", "_blank");
  await expect(all).toHaveAttribute("rel", /noopener/);
});

test("each detail has the course's facts and enrolls on its own link", async ({ page }) => {
  for (const c of courses) {
    await open(page, `courses/${c.id}`);
    await expect(view(page)).toBeVisible();
    const told = await textOf(page, "view");
    for (const fact of [c.title, c.blurb, c.audience, c.badge, c.category, c.platform]) expect(told).toContain(squash(fact));
    expect(told).not.toMatch(EMOJI);
    const enroll = view(page).locator("[data-enroll]");
    await expect(enroll).toHaveAttribute("href", c.url);
    await expect(enroll).toHaveAttribute("target", "_blank");
    await expect(enroll).toHaveAccessibleName(`Enroll in ${c.title} on ${c.platform} (opens in a new tab)`);
  }
});

test("a course pushes its detail and swipes back from the left edge", async ({ page }) => {
  await open(page, "courses");
  const other = courses.find((c) => !c.featured)!;
  await page.locator(`[data-course-row="${other.id}"]`).click();
  await expect(view(page)).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`#courses/${other.id}$`));
  await swipeBack(page);
  await expect(view(page)).toHaveCount(0);
  await expect(page).toHaveURL(/#courses$/);
  await page.locator("[data-course-featured]").click();
  await expect(view(page)).toBeVisible();
  await page.getByRole("button", { name: "Back to Courses" }).click();
  await expect(view(page)).toHaveCount(0);
});

test("Platforms opens its app; Search opens Spotlight", async ({ page }) => {
  await open(page, "courses");
  await app(page, "Courses").getByRole("button", { name: "Search" }).click();
  await expect(page.getByRole("combobox")).toBeVisible();
  await page.keyboard.press("Escape");
  await open(page, "courses");
  await app(page, "Courses").getByRole("button", { name: "Platforms" }).click();
  await expect(page).toHaveURL(/#platforms$/);
});

fitSuite(["courses", "courses/your-first-course", "courses/prompting-basics"]);
