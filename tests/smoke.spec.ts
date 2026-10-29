import { expect, settled, test, type Page } from "./fixtures";

// The lock screen shows once per session; these tests start on the home screen.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("pp-unlocked", "1"));
});

import { appsLayout } from "../content/apps";
import { courses } from "../content/courses";
import { profile } from "../content/profile";

const featured = courses.find((c) => c.featured)!;

const APPS = [...appsLayout.block, ...appsLayout.row, ...appsLayout.dock].filter((i) => i.app && i.app !== "socials");

function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    // Remote images can time out in the optimiser; that's not an app error
    if (m.type() === "error" && !m.text().includes("Failed to load resource")) errors.push(m.text());
  });
  return errors;
}

async function home(page: Page) {
  await page.goto("/");
  await expect(page.locator("[data-app-icon]").first()).toBeVisible();
  await settled(page);
}

// App windows only (Control Center and the switcher are dialogs too)
const dialog = (page: Page) => page.locator("[data-app-window] > [role=dialog]");

test("every app opens, sets the hash and title, and closes with Esc", async ({ page }) => {
  test.setTimeout(60_000); // 11 launches + closes, each a full spring
  const errors = trackErrors(page);
  await home(page);
  for (const item of APPS) {
    await page.getByRole("button", { name: `Open ${item.label}`, exact: true }).click();
    await expect(dialog(page)).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`#${item.app}$`));
    await expect(page).toHaveTitle(new RegExp(`^${appsLayout.titles[item.app!]} · `));
    await page.keyboard.press("Escape");
    await expect(dialog(page)).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

test("browser back, the chevron and the swipe handle all return home", async ({ page }) => {
  await home(page);
  await page.getByRole("button", { name: "Open Journey", exact: true }).click();
  await expect(dialog(page)).toBeVisible();
  await page.goBack();
  await expect(dialog(page)).toHaveCount(0);

  await page.getByRole("button", { name: "Open Settings", exact: true }).click();
  await page.getByRole("button", { name: "Back to Home" }).click();
  await expect(dialog(page)).toHaveCount(0);

  await page.getByRole("button", { name: "Open Contact", exact: true }).click();
  await expect(dialog(page)).toBeVisible();
  await page.waitForTimeout(700); // let the launch zoom settle before measuring the handle
  const handle = page.locator("[data-home-indicator]");
  const box = (await handle.boundingBox())!;
  // A quick flick (a pause mid-swipe would open the app switcher instead)
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y - 260, { steps: 6 });
  await page.mouse.up();
  await expect(dialog(page)).toHaveCount(0);
});

test("deep links open the app directly and Esc goes home", async ({ page }) => {
  for (const app of ["courses", "platforms", "contact"]) {
    await page.goto(`/#${app}`);
    await expect(dialog(page)).toBeVisible();
    await settled(page);
    await page.keyboard.press("Escape");
    await expect(dialog(page)).toHaveCount(0);
  }
  await page.goto(`/#courses/${featured.id}`);
  await expect(page.getByRole("region", { name: "Course details" })).toBeVisible();
});

test("theme switch persists across reloads", async ({ page }) => {
  await home(page);
  const dark = () => page.evaluate(() => document.documentElement.classList.contains("dark"));
  const before = await dark();
  await page.getByRole("button", { name: "Open Settings", exact: true }).click();
  await page.getByRole("switch", { name: "Dark mode" }).click();
  await expect.poll(dark).toBe(!before);
  await page.reload();
  await expect.poll(dark).toBe(!before);
});

test("contact form validates, then falls back to email when sending is unavailable", async ({ page }) => {
  // Never reach the real route from tests: it could send a real email
  await page.route("**/api/contact", (route) =>
    route.fulfill({ status: 503, json: { ok: false, reason: "unavailable", email: "x@example.com" } }),
  );
  await page.goto("/#contact");
  await settled(page);
  const send = page.getByRole("button", { name: "Send message" });
  await send.click();
  await expect(page.locator("#contact-email")).toBeFocused();
  await expect(page.locator("#contact-email")).toHaveAttribute("aria-invalid", "true");

  await page.fill("#contact-email", "test@example.com");
  await page.fill("#contact-name", "Test Person");
  await page.fill("#contact-subject", "Hello there");
  await page.fill("#contact-message", "This is a test message from Playwright.");
  await send.click();
  await expect(page.getByRole("alert").filter({ hasText: "email me directly" })).toBeVisible();
  // Their text is still there to send another way
  await expect(page.locator("#contact-message")).toHaveValue("This is a test message from Playwright.");
});

test("Spotlight finds a course and opens it", async ({ page }) => {
  await home(page);
  // The shortcut is live once the page hydrates
  await expect(async () => {
    if (!(await page.getByRole("combobox").count())) await page.keyboard.press("ControlOrMeta+k");
    await expect(page.getByRole("combobox")).toBeFocused({ timeout: 500 });
  }).toPass();
  await page.keyboard.type(featured.title.split(":").pop()!.trim().split(" ")[0]);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`#courses/${featured.id}$`));
});

// The folder holds the profiles that aren't on the home screen or in the dock themselves
// (with fewer than two, there's no folder: they sit on the home screen)
const onHome = new Set([...appsLayout.block, ...appsLayout.row, ...appsLayout.links, ...appsLayout.dock].map((i) => i.id));
const inFolder = profile.socials.filter((s) => !onHome.has(s.id));

test("Socials folder opens and lists profiles", async ({ page }) => {
  test.skip(inFolder.length < 2, "fewer than two profiles off the home screen, so no Socials folder");
  await home(page);
  await page.getByRole("button", { name: "Open Socials folder", exact: true }).click();
  await expect(page).toHaveURL(/#socials$/);
  await expect(page.getByRole("dialog", { name: "Socials" }).getByRole("link", { name: new RegExp(inFolder[0].label) }).first()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page).not.toHaveURL(/#socials$/);
});
