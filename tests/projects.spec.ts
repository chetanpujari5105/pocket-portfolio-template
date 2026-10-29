import { projects } from "../content/projects";
import { EMOJI, app, fitSuite, open, squash, swipeBack, textOf, unlocked, view } from "./apple";
import { expect, test, type Page } from "./fixtures";

/* Projects, laid out like Settings: a segmented filter, every project with its facts and link,
 * details that push and swipe back, no emoji; a project with `url: null` links nowhere. */

unlocked();

const featured = projects.find((p) => p.featured)!;
const others = projects.filter((p) => !p.featured);
const unlinked = projects.find((p) => !p.url);
const app1 = projects.find((p) => p.category === "Apps");
const notApp = projects.find((p) => p.category !== "Apps");
const filter = (page: Page) => page.getByRole("radiogroup", { name: "Filter projects" });
const row = (page: Page, id: string) => app(page, "Projects").locator(`[data-project-row="${id}"]`);

test("every project is listed and filters with the segmented control", async ({ page }) => {
  await open(page, "projects");
  const text = await textOf(page, "app");
  for (const p of projects) {
    expect(text).toContain(squash(p.name));
    expect(text).toContain(squash(p.tagline));
  }
  expect(text).not.toMatch(EMOJI);
  await expect(app(page, "Projects").locator("[data-project-row]")).toHaveCount(projects.length);
  for (const p of others) await expect(app(page, "Projects").getByRole("button", { name: new RegExp(`^${p.name}`) })).toBeVisible();

  await filter(page).getByRole("radio", { name: "Games" }).click();
  await expect(filter(page).getByRole("radio", { name: "Games" })).toHaveAttribute("aria-checked", "true");
  await expect(app(page, "Projects").locator("[data-project-row]")).toHaveCount(projects.filter((p) => p.category === "Games").length);
  await filter(page).getByRole("radio", { name: "Apps" }).click();
  if (app1) await expect(row(page, app1.id)).toBeVisible();
  if (notApp) await expect(row(page, notApp.id)).toHaveCount(0);
  await filter(page).getByRole("radio", { name: "All" }).click();
  if (notApp) await expect(row(page, notApp.id)).toBeVisible();
});

test("each detail has the project's facts and its own link (or none)", async ({ page }) => {
  for (const p of projects) {
    await open(page, `projects/${p.id}`);
    await expect(view(page)).toBeVisible();
    const told = await textOf(page, "view");
    for (const fact of [p.name, p.tagline, p.description, ...p.stack, ...(p.status ? [p.status] : [])]) expect(told, p.id).toContain(squash(fact));
    expect(told).not.toMatch(EMOJI);
    const link = view(page).locator("[data-project-link]");
    if (!p.url) {
      await expect(link).toHaveCount(0);
      await expect(view(page).getByRole("link")).toHaveCount(0);
      continue;
    }
    await expect(link).toHaveAttribute("href", p.url);
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", /noopener/);
    await expect(link).toHaveAccessibleName(`Open ${p.name} (opens in a new tab)`);
    await expect(link).toContainText(new URL(p.url).host);
  }
});

test("a project without a url shows its status and links nowhere", async ({ page }) => {
  test.skip(!unlinked, "every project has a url");
  await open(page, `projects/${unlinked!.id}`);
  if (unlinked!.status) await expect(view(page).locator("[data-project-status]")).toContainText(unlinked!.status);
  await expect(view(page).getByRole("link")).toHaveCount(0);
});

test("a project pushes its detail and swipes back from the left edge", async ({ page }) => {
  await open(page, "projects");
  const p = others[0];
  await row(page, p.id).click();
  await expect(view(page)).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`#projects/${p.id}$`));
  await expect(view(page)).toContainText(p.tagline);
  await swipeBack(page);
  await expect(view(page)).toHaveCount(0);
  await expect(page).toHaveURL(/#projects$/);
  await app(page, "Projects").locator("[data-project-featured]").click();
  await page.getByRole("button", { name: "Back to Projects" }).click();
  await expect(view(page)).toHaveCount(0);
});

fitSuite(["projects", `projects/${featured.id}`, ...others.map((p) => `projects/${p.id}`)]);
