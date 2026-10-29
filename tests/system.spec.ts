import { profile } from "../content/profile";
import { expect, test, type Page } from "./fixtures";
import { fallbackPosts, substackFeed } from "../content/blog";

// Blog widgets and the new-post banner only exist when there are posts (a feed or fallbackPosts)
const hasPosts = fallbackPosts.length > 0 || substackFeed !== "";

/* System UI: the status pill, Control Center and the once-per-session notification banner. */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("pp-unlocked", "1"));
});

async function home(page: Page) {
  await page.goto("/");
  await expect(page.locator("[data-app-icon]").first()).toBeVisible();
  await page.waitForFunction(() => innerWidth < 900 || document.documentElement.hasAttribute("data-3d"), null, {
    timeout: 25_000,
  });
  const box = (await page.locator("[data-screen]").boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(700);
}

const panel = (page: Page) => page.getByRole("dialog", { name: "Control Center" });

test("the status pill says what changed, and a tap collapses it", async ({ page }) => {
  await home(page);
  await page.evaluate(() => document.documentElement.classList.toggle("dark"));
  const pill = page.locator(".status-pill");
  await expect(pill).toHaveAttribute("data-pill", "info");
  await expect(page.getByRole("status").filter({ hasText: /^Theme: (Dark|Light)$/ })).toHaveCount(1);
  await pill.click();
  await expect(pill).not.toHaveAttribute("data-pill");
});

test("Control Center pulls down from the corner and closes with Esc", async ({ page }) => {
  await home(page);
  const h = (await page.locator("[data-panel-handle]").boundingBox())!;
  const x = h.x + h.width / 2;
  await page.mouse.move(x, h.y + h.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) {
    await page.mouse.move(x, h.y + h.height / 2 + i * 22);
    await page.waitForTimeout(16);
  }
  await page.mouse.up();
  await expect(panel(page)).toBeVisible();
  await expect(panel(page).getByRole("button", { name: "Dark mode" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-control-panel]")).toBeHidden();
  await expect(page.locator("[data-panel-handle]")).toBeFocused();
});

test("Control Center toggles larger text, dims brightness, and swipes up to close", async ({ page }) => {
  await home(page);
  await page.locator("[data-panel-handle]").click();
  await expect(panel(page)).toBeVisible();
  await page.waitForTimeout(500);
  await panel(page).getByRole("button", { name: "Larger text" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-text", "large");
  await panel(page).getByRole("button", { name: "Larger text" }).click();
  await expect(page.locator("html")).not.toHaveAttribute("data-text");
  const slider = panel(page).getByRole("slider", { name: "Brightness" });
  await slider.focus();
  for (let i = 0; i < 20; i++) await page.keyboard.press("ArrowLeft");
  await expect(page.locator("[data-screen] .bg-black.z-\\[79\\]")).toHaveCount(1);
  const box = (await panel(page).boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height + 30;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) {
    await page.mouse.move(x, y - i * 25);
    await page.waitForTimeout(16);
  }
  await page.mouse.up();
  await expect(page.locator("[data-control-panel]")).toBeHidden();
});

test("every Control Center control does something: finish and wallpaper menus, flashlight, text size, Contact", async ({ page }) => {
  await home(page);
  await page.locator("[data-panel-handle]").click();
  await expect(panel(page)).toBeVisible();
  await page.waitForTimeout(500);

  // Finish: a glass menu with the four finishes; Esc puts the menu away, not Control Center
  await panel(page).getByRole("button", { name: /^Finish/ }).click();
  const finish = panel(page).getByRole("dialog", { name: "Finish" });
  await expect(finish.getByRole("radio")).toHaveCount(4);
  await page.keyboard.press("Escape");
  await expect(finish).toHaveCount(0);
  await expect(panel(page)).toBeVisible();
  await panel(page).getByRole("button", { name: /^Finish/ }).click();
  await finish.getByRole("radio", { name: "Electric" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-finish", "electric");
  await expect(panel(page).getByRole("button", { name: "Finish: Electric" })).toBeVisible();

  // Wallpaper
  await panel(page).getByRole("button", { name: /^Wallpaper/ }).click();
  await panel(page).getByRole("dialog", { name: "Wallpaper" }).getByRole("radio", { name: "Aurora" }).click();
  await expect(panel(page).getByRole("button", { name: "Wallpaper: Aurora" })).toBeVisible();

  // Flashlight lifts the screen; Reduce motion sets the page attribute
  await panel(page).getByRole("button", { name: "Flashlight" }).click();
  await expect(page.locator("[data-torch]")).toHaveCount(1);
  await panel(page).getByRole("button", { name: "Flashlight" }).click();
  await expect(page.locator("[data-torch]")).toHaveCount(0);
  await panel(page).getByRole("button", { name: "Reduce motion" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-reduce-motion", "");
  await panel(page).getByRole("button", { name: "Reduce motion" }).click();

  // The text size slider snaps between its two stops
  const text = panel(page).getByRole("slider", { name: "Text size" });
  await text.focus();
  await page.keyboard.press("ArrowUp");
  await expect(text).toHaveAttribute("aria-valuetext", "Larger");
  await expect(page.locator("html")).toHaveAttribute("data-text", "large");
  await page.keyboard.press("ArrowDown");
  await expect(page.locator("html")).not.toHaveAttribute("data-text");

  // Now Playing opens the channel's video on YouTube
  // (the latest video, or the channel itself when there's no video yet)
  const nowPlaying = await panel(page).getByRole("link", { name: /^Now playing/ }).getAttribute("href");
  expect(nowPlaying === profile.youtube || /youtube\.com|youtu\.be/.test(nowPlaying ?? "")).toBe(true);

  // Contact closes Control Center and opens Contact
  await panel(page).getByRole("button", { name: /^Contact/ }).click();
  await expect(page.locator("[data-control-panel]")).toBeHidden();
  await expect(page.getByRole("dialog", { name: "Contact" })).toBeVisible();
});

test("Settings opens Control Center (the no-gesture path)", async ({ page }) => {
  await page.goto("/#settings");
  await page.getByRole("button", { name: /Control Center/ }).last().click();
  await expect(panel(page)).toBeVisible();
});

test.describe("notification banner", () => {
  test.use({ banner: true });
  test.skip(!hasPosts, "no blog posts to announce");

  test("drops in 8 s after unlock, once per session; tapping opens the post", async ({ page }) => {
    test.setTimeout(45_000);
    await home(page);
    const banner = page.locator("[data-banner]");
    await expect(banner).toBeVisible({ timeout: 12_000 });
    await page.waitForTimeout(600);
    await banner.click();
    await expect(page).toHaveURL(/#blog\/.+/);
    await expect(banner).toHaveCount(0);
    await page.goto("/");
    await page.waitForTimeout(9000);
    await expect(banner).toHaveCount(0);
  });

  test("swiping the banner up dismisses it", async ({ page }) => {
    test.setTimeout(45_000);
    await home(page);
    const banner = page.locator("[data-banner]");
    await expect(banner).toBeVisible({ timeout: 12_000 });
    await page.waitForTimeout(600);
    const b = (await banner.boundingBox())!;
    const x = b.x + b.width / 2;
    await page.mouse.move(x, b.y + b.height / 2);
    await page.mouse.down();
    for (let i = 1; i <= 6; i++) {
      await page.mouse.move(x, b.y + b.height / 2 - i * 15);
      await page.waitForTimeout(16);
    }
    await page.mouse.up();
    await expect(banner).toHaveCount(0);
    await expect(page).not.toHaveURL(/#blog/);
  });
});
