import { expect, test, type Page } from "./fixtures";
import { fallbackPosts, substackFeed } from "../content/blog";

// Blog widgets and the new-post banner only exist when there are posts (a feed or fallbackPosts)
const hasPosts = fallbackPosts.length > 0 || substackFeed !== "";

/*
 * Gesture end-states, driven with the real mouse / touchscreen. These run on every viewport;
 * on desktop the screen sits inside the 3D phone, which is facing the camera at rest.
 */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("pp-unlocked", "1"));
});

const dialog = (page: Page) => page.locator("[data-app-window] > [role=dialog]");

async function home(page: Page) {
  await page.goto("/");
  await expect(page.locator("[data-app-icon]").first()).toBeVisible();
  // On wide screens the live screen moves into the 3D phone once it loads; start after that.
  await page.waitForFunction(
    () => innerWidth < 900 || document.documentElement.hasAttribute("data-3d"),
    null,
    { timeout: 25_000 },
  );
  // …and once the phone has finished arriving and levelled out (parallax rests while the pointer
  // is over the screen), so measured positions hold.
  const screen = (await page.locator("[data-screen]").boundingBox())!;
  await page.mouse.move(screen.x + screen.width / 2, screen.y + screen.height / 2);
  const icon = page.locator("[data-app-icon]").first();
  await expect(async () => {
    const a = (await icon.boundingBox())!;
    await page.waitForTimeout(150);
    const b = (await icon.boundingBox())!;
    expect(Math.abs(a.x - b.x) + Math.abs(a.y - b.y)).toBeLessThan(1);
  }).toPass({ timeout: 10_000 });
}

async function openApp(page: Page, label: string) {
  await page.getByRole("button", { name: `Open ${label}`, exact: true }).first().click();
  await expect(dialog(page)).toBeVisible();
  await page.waitForTimeout(700); // launch spring settles
}

/** Drag with the mouse in small steps; `hold` pauses before releasing. */
async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }, opts: { steps?: number; hold?: number; delay?: number } = {}) {
  const { steps = 12, hold = 0, delay = 0 } = opts;
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(from.x + ((to.x - from.x) * i) / steps, from.y + ((to.y - from.y) * i) / steps);
    if (delay) await page.waitForTimeout(delay);
  }
  if (hold) await page.waitForTimeout(hold);
  await page.mouse.up();
}

async function indicator(page: Page) {
  const box = (await page.locator("[data-home-indicator]").boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

test("a short swipe on the home indicator springs the app back open", async ({ page }) => {
  await home(page);
  await openApp(page, "Journey");
  const start = await indicator(page);
  await drag(page, start, { x: start.x, y: start.y - 40 }, { steps: 8, delay: 30 });
  await page.waitForTimeout(800);
  await expect(dialog(page)).toBeVisible();
  await expect(page).toHaveURL(/#journey$/);
});

test("a long swipe flies the app back into its icon", async ({ page }) => {
  await home(page);
  await openApp(page, "Journey");
  const start = await indicator(page);
  const screen = (await page.locator("[data-screen]").boundingBox())!;
  await drag(page, start, { x: start.x + 20, y: start.y - screen.height * 0.45 }, { steps: 10 });
  await expect(dialog(page)).toHaveCount(0);
  await expect(page).not.toHaveURL(/#journey$/);
});

test("swipe up and hold opens the app switcher; a card reopens its app", async ({ page }) => {
  await home(page);
  await openApp(page, "Courses");
  const start = await indicator(page);
  await drag(page, start, { x: start.x, y: start.y - 160 }, { steps: 10, delay: 20, hold: 650 });
  const switcher = page.getByRole("dialog", { name: "App switcher" });
  await expect(switcher).toBeVisible();
  await expect(switcher.getByRole("button", { name: "Open Courses" })).toBeVisible();
  await switcher.getByRole("button", { name: "Open Courses" }).click();
  await expect(switcher).toHaveCount(0);
  await expect(page).toHaveURL(/#courses$/);
});

test("Ctrl+↑ toggles the switcher; Esc closes it; a card can be closed", async ({ page }) => {
  await home(page);
  await openApp(page, "Journey");
  await page.keyboard.press("Escape");
  await openApp(page, "Settings");
  await page.keyboard.press("Control+ArrowUp");
  const switcher = page.getByRole("dialog", { name: "App switcher" });
  await expect(switcher).toBeVisible();
  await expect(switcher.locator("[data-card]")).toHaveCount(2);
  await switcher.getByRole("button", { name: "Close Journey" }).click();
  await expect(switcher.locator("[data-card]")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(switcher).toHaveCount(0);
});

test("switching apps from Search goes out to home, then into the new app", async ({ page }) => {
  await home(page);
  await openApp(page, "Journey");
  await page.keyboard.press("ControlOrMeta+k");
  await page.keyboard.type("settings");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#settings$/);
  await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Journey" })).toHaveCount(0);
});

test("swiping the home screen pages to the widgets and back", async ({ page }) => {
  await home(page);
  const layer = (await page.locator("[data-home-layer]").boundingBox())!;
  const y = layer.y + layer.height * 0.45;
  await drag(page, { x: layer.x + layer.width * 0.85, y }, { x: layer.x + layer.width * 0.15, y }, { steps: 10 });
  await expect(page.getByRole("button", { name: "Page 2 of 2" })).toHaveAttribute("aria-current", "page");
  if (hasPosts) await expect(page.getByRole("button", { name: /Latest post:/ })).toBeVisible();
  // Start the swipe back on a link widget: a native link drag must not swallow it.
  const video = (await page.getByRole("link", { name: /^(YouTube channel|Latest video)/ }).boundingBox())!;
  const vy = video.y + video.height / 2;
  await drag(page, { x: video.x + video.width / 2, y: vy }, { x: video.x + video.width / 2 + layer.width * 0.6, y: vy }, { steps: 10 });
  await expect(page.getByRole("button", { name: "Page 1 of 2" })).toHaveAttribute("aria-current", "page");
});

test("pulling down on the home screen opens Search", async ({ page }) => {
  await home(page);
  const layer = (await page.locator("[data-home-layer]").boundingBox())!;
  const x = layer.x + layer.width * 0.5;
  await drag(page, { x, y: layer.y + layer.height * 0.62 }, { x, y: layer.y + layer.height * 0.62 + 170 }, { steps: 10 });
  await expect(page.getByRole("combobox")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("combobox")).toHaveCount(0);
});

test("long-press enters jiggle mode; dragging an icon rearranges and persists", async ({ page }) => {
  await home(page);
  const first = page.locator("[data-reorder]").first();
  const id = await first.getAttribute("data-reorder");
  const box = (await first.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 3);
  await page.mouse.down();
  await page.waitForTimeout(650);
  await page.mouse.up();
  await expect(page.getByRole("button", { name: "Done" })).toBeVisible();
  await page.waitForTimeout(500); // jiggle mode's entrance settles before measuring the drop slot
  const target = (await page.locator("[data-reorder]").nth(3).boundingBox())!;
  await drag(page, { x: box.x + box.width / 2, y: box.y + box.height / 3 }, { x: target.x + target.width / 2, y: target.y + target.height / 3 }, { steps: 14, delay: 16 });
  await page.waitForTimeout(600);
  await expect(page.locator("[data-reorder]").nth(3)).toHaveAttribute("data-reorder", id!);
  await page.getByRole("button", { name: "Done" }).click();
  await page.reload();
  await expect(page.locator("[data-reorder]").nth(3)).toHaveAttribute("data-reorder", id!);
});
