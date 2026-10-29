import { expertise } from "../content/expertise";
import { expect, settled, test, type Page } from "./fixtures";

/*
 * The Expertise widget (home page 2) as a Smart Stack: vertical swipes, wheel and arrow keys step
 * through every area in content/expertise.ts (4 or more); a tap opens Expertise at the card on top. A vertical drag on it must
 * not page the home screen, pull down Search or turn the 3D phone; a sideways one still pages.
 * Every project, in light and dark.
 */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("pp-unlocked", "1"));
});

const N = expertise.length;
const title = (n: number) => expertise[n - 1].title;
const esc = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const stack = (page: Page) => page.locator("[data-expertise-stack]");
const counter = (page: Page) => stack(page).locator("[data-stack-count]");
const tile = async (page: Page) => (await stack(page).locator("[data-widget-tile]").boundingBox())!;

/** Home page 2, settled, with the pointer resting on the stack (hover also pauses autoplay). */
async function onStack(page: Page, scheme: "light" | "dark" = "light") {
  await page.emulateMedia({ colorScheme: scheme });
  await page.goto("/");
  await expect(page.locator("[data-app-icon]").first()).toBeVisible();
  await settled(page);
  await page.getByRole("button", { name: "Page 2 of 2" }).click();
  await expect(stack(page)).toBeVisible();
  // The pager spring and the 3D phone's tilt have come to rest (the tilt levels out while the
  // pointer is over the screen, so it's moved onto the stack each round)
  await expect(async () => {
    const a = await tile(page);
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.waitForTimeout(150);
    const b = await tile(page);
    expect(Math.abs(a.x - b.x) + Math.abs(a.y - b.y)).toBeLessThan(1);
  }).toPass({ timeout: 10_000 });
  await expect(counter(page)).toHaveText("1");
}

/** A vertical drag across the stack; negative `dy` = up. Moderate speed unless `fast`. */
async function swipe(page: Page, dy: number, { fast = false, hold = 0 } = {}) {
  const box = await tile(page);
  const x = box.x + box.width / 2;
  const y = box.y + box.height * (dy < 0 ? 0.75 : 0.35);
  const steps = fast ? 3 : 10;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(x, y + (dy * i) / steps);
    await page.waitForTimeout(fast ? 8 : 24);
  }
  if (hold) await page.waitForTimeout(hold);
  await page.mouse.up();
}

/** Waits for the stack to land on `n` (1-based) and checks what it says about itself. */
async function landsOn(page: Page, n: number, title?: RegExp) {
  await expect(counter(page)).toHaveText(String(n));
  await expect(stack(page)).toHaveAttribute("aria-label", new RegExp(`^Expertise, ${n} of ${N}: ${title?.source ?? ".+"}$`));
  // Settled: the front card sits squarely in place
  await expect
    .poll(() => page.evaluate((i) => document.querySelector<HTMLElement>(`[data-stack-card="${i}"]`)!.style.transform, n - 1))
    .toMatch(/^translate3d\(0px?, 0(\.000)?%?, 0px?\) scale\(1(\.0000)?\)$|^none$/);
}

for (const scheme of ["light", "dark"] as const) {
  test.describe(scheme, () => {
    test("swiping up steps through every area, down comes back", async ({ page }) => {
      await onStack(page, scheme);
      const step = (await tile(page)).height * 0.6;
      for (let n = 2; n <= N; n++) {
        await swipe(page, -step);
        await landsOn(page, n);
      }
      await expect(stack(page)).toHaveAttribute("aria-label", `Expertise, ${N} of ${N}: ${title(N)}`);
      await swipe(page, step);
      await landsOn(page, N - 1, new RegExp(esc(title(N - 1))));
      await swipe(page, step);
      await landsOn(page, N - 2, new RegExp(esc(title(N - 2))));
      // The live region says where it landed
      await expect(stack(page).locator("[aria-live=polite]")).toHaveText(`${N - 2} of ${N}: ${title(N - 2)}`);
    });

    test("rubber-bands at the first and last card", async ({ page }) => {
      await onStack(page, scheme);
      const h = (await tile(page)).height;
      // Pull down past card 1 and hold: the stack gives a little, then springs back to 1
      const box = await tile(page);
      const x = box.x + box.width / 2;
      await page.mouse.move(x, box.y + box.height * 0.3);
      await page.mouse.down();
      for (let i = 1; i <= 10; i++) await page.mouse.move(x, box.y + box.height * 0.3 + i * h * 0.08);
      const pulled = await page.evaluate(() => document.querySelector<HTMLElement>("[data-expertise-stack] [data-widget-tile] > span")!.style.transform);
      const shift = Number(/translate3d\(0px?, ([\d.]+)%/.exec(pulled)?.[1] ?? 0);
      expect(shift).toBeGreaterThan(5); // moved with the finger…
      expect(shift).toBeLessThan(60); // …but less than the finger did (80% of the tile)
      await page.mouse.up();
      await landsOn(page, 1);
      await expect
        .poll(() => page.evaluate(() => document.querySelector<HTMLElement>("[data-expertise-stack] [data-widget-tile] > span")!.style.transform))
        .toBe("");

      // The last card: push up past the end, it stays there
      await stack(page).focus();
      for (let n = 1; n < N; n++) await page.keyboard.press("ArrowDown");
      await landsOn(page, N);
      await swipe(page, -h * 0.9, { hold: 120 });
      await landsOn(page, N);
    });

    test("wheel steps one card per gesture; arrow keys step when focused", async ({ page }) => {
      await onStack(page, scheme);
      await page.mouse.wheel(0, 60);
      await landsOn(page, 2);
      // A trackpad gesture is a burst of small events: still one card
      for (let i = 0; i < 12; i++) {
        await page.mouse.wheel(0, 12);
        await page.waitForTimeout(16);
      }
      await landsOn(page, 3);
      await page.waitForTimeout(250);
      await page.mouse.wheel(0, -60);
      await landsOn(page, 2);
      // The wheel was ours: Search didn't open and the page didn't change
      await expect(page.getByRole("combobox")).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Page 2 of 2" })).toHaveAttribute("aria-current", "page");

      await stack(page).focus();
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("ArrowDown");
      await landsOn(page, 4, new RegExp(esc(title(4))));
      await page.keyboard.press("ArrowUp");
      await landsOn(page, 3);
      await expect(stack(page)).toBeFocused();
    });

    test("a tap opens Expertise at the card on top; Enter does too", async ({ page }) => {
      await onStack(page, scheme);
      await swipe(page, -(await tile(page)).height * 0.6);
      await landsOn(page, 2);
      await swipe(page, -(await tile(page)).height * 0.6);
      await landsOn(page, 3, new RegExp(esc(title(3))));
      await stack(page).click();
      await expect(page).toHaveURL(new RegExp(`#expertise/${expertise[2].id}$`));
      await expect(page.locator("[data-push-view]").getByRole("heading", { name: title(3), level: 1 })).toBeVisible();

      await onStack(page, scheme);
      await stack(page).focus();
      await page.keyboard.press("ArrowDown");
      await landsOn(page, 2);
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(new RegExp(`#expertise/${expertise[1].id}$`));
    });

    test("a vertical drag on the stack stays in the stack", async ({ page }) => {
      await onStack(page, scheme);
      const screenBefore = (await page.locator("[data-screen]").boundingBox())!;
      const h = (await tile(page)).height;
      // Long pull down from card 2: Search's own gesture would open at this distance
      await swipe(page, -h * 0.6);
      await landsOn(page, 2);
      const box = await tile(page);
      const x = box.x + box.width / 2;
      await page.mouse.move(x, box.y + box.height * 0.2);
      await page.mouse.down();
      let turned = false;
      for (let i = 1; i <= 12; i++) {
        // Wander sideways a little too, as a real finger does
        await page.mouse.move(x + (i % 3) * 2, box.y + box.height * 0.2 + i * 15);
        turned ||= await page.evaluate(() => !!document.querySelector("[data-dragging]"));
      }
      await page.mouse.up();
      await landsOn(page, 1);
      expect(turned).toBe(false);
      await expect(page.getByRole("combobox")).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Page 2 of 2" })).toHaveAttribute("aria-current", "page");
      // Nothing opened, and the phone didn't turn or move
      await expect(page).not.toHaveURL(/#expertise/);
      const screenAfter = (await page.locator("[data-screen]").boundingBox())!;
      expect(Math.abs(screenAfter.x - screenBefore.x) + Math.abs(screenAfter.width - screenBefore.width)).toBeLessThan(2);
      expect(await page.evaluate(() => scrollY)).toBe(0);
    });
  });
}

test("a fast flick skips at most one card", async ({ page }) => {
  await onStack(page);
  await swipe(page, -(await tile(page)).height * 0.9, { fast: true });
  await expect(counter(page)).toHaveText(/^[23]$/);
  await page.waitForTimeout(600);
  await expect(counter(page)).toHaveText(/^[23]$/);
});

test("a sideways swipe on the stack still pages the home screen", async ({ page }) => {
  await onStack(page);
  const box = await tile(page);
  const layer = (await page.locator("[data-home-layer]").boundingBox())!;
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width / 2, y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(box.x + box.width / 2 + (layer.width * 0.6 * i) / 10, y);
  await page.mouse.up();
  await expect(page.getByRole("button", { name: "Page 1 of 2" })).toHaveAttribute("aria-current", "page");
  await expect(counter(page)).toHaveText("1");
  await expect(page).not.toHaveURL(/#expertise/);
});

test("long-press on the stack still enters edit mode", async ({ page }) => {
  await onStack(page);
  const box = await tile(page);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(650);
  await page.mouse.up();
  await expect(page.getByRole("button", { name: "Done" })).toBeVisible();
  // In edit mode a vertical drag no longer steps cards (it's the editor's)
  await expect(counter(page)).toHaveText("1");
  await page.getByRole("button", { name: "Done" }).click();
  await expect(page.getByRole("button", { name: "Done" })).toHaveCount(0);
});

test("reduced motion crossfades with no stack motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await onStack(page);
  await swipe(page, -(await tile(page)).height * 0.6);
  await expect(counter(page)).toHaveText("2");
  // Mid-crossfade and after, the front cards never move: no transform on cards 1 or 2
  const transforms = await page.evaluate(() =>
    [0, 1].map((i) => document.querySelector<HTMLElement>(`[data-stack-card="${i}"]`)!.style.transform),
  );
  expect(transforms).toEqual(["none", "none"]);
  await expect(stack(page)).toHaveAttribute("aria-label", `Expertise, 2 of ${N}: ${title(2)}`);
});

test("autoplay moves on after ~6 s while untouched, and stops at the first touch", async ({ page }) => {
  test.slow();
  await onStack(page);
  // Pointer away from the stack (hover pauses it)
  await page.mouse.move(2, 2);
  await expect(counter(page)).toHaveText("2", { timeout: 9_000 });
  // Autoplay doesn't announce itself
  await expect(stack(page).locator("[aria-live=polite]")).toHaveText("");
  // A wheel step is a touch: autoplay is over for this visit
  const box = await tile(page);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, 60);
  await landsOn(page, 3);
  await page.mouse.move(2, 2);
  await page.waitForTimeout(7_000);
  await expect(counter(page)).toHaveText("3");
});

test("touch: a real finger swipe steps the stack without scrolling or paging", async ({ page }, info) => {
  test.skip(info.project.name !== "phone", "touch screens only");
  await onStack(page);
  const box = await tile(page);
  const cdp = await page.context().newCDPSession(page);
  const x = box.x + box.width / 2;
  const y0 = box.y + box.height * 0.8;
  const touch = (type: "touchStart" | "touchMove" | "touchEnd", y: number) =>
    cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y, id: 1 }] });
  await touch("touchStart", y0);
  for (let i = 1; i <= 10; i++) {
    await touch("touchMove", y0 - i * box.height * 0.06);
    await page.waitForTimeout(20);
  }
  await touch("touchEnd", y0);
  await landsOn(page, 2);
  await expect(page.getByRole("button", { name: "Page 2 of 2" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("combobox")).toHaveCount(0);
  expect(await page.evaluate(() => scrollY)).toBe(0);
});

test("an arrow key on the home screen doesn't swallow the next Enter", async ({ page }) => {
  await page.goto("/");
  await settled(page);
  await page.locator("[data-home-page='0'] [data-nav]").first().focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-app-window] > [role=dialog]")).toBeVisible();
});
