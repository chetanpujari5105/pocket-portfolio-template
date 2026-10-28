import { expect, test, type Page } from "./fixtures";

/*
 * The 3D phone must feel like an object resting on a table: clicks, double-clicks, taps and
 * jitter never move it. Only a deliberate horizontal drag that starts on the stage (off the live
 * screen) turns it, and it then settles on the nearest face and stays there.
 */

test.beforeEach(async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "3D stage is desktop-only");
  test.setTimeout(90_000);
  await page.addInitScript(() => sessionStorage.setItem("pp-unlocked", "1"));
});

const stage = (page: Page) => page.locator("[data-stage]");
const rotY = async (page: Page) =>
  Number(await stage(page).getAttribute("data-roty"));

async function ready(page: Page) {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-3d", {
    timeout: 25_000,
  });
  await expect(stage(page).locator(".stage-canvas canvas")).toBeVisible();
  await expect(stage(page)).toHaveAttribute("data-face", "front");
  // Let the entrance finish
  await expect(page.locator("html")).toHaveAttribute("data-awake", "", {
    timeout: 10_000,
  });
  await page.waitForTimeout(400);
}

/** Screen box straight from the DOM (includes the 3D transform), no actionability waits. */
const screenBox = (page: Page) =>
  page.locator("[data-screen]").evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });

type Box = Awaited<ReturnType<typeof screenBox>>;

function expectSameBox(a: Box, b: Box) {
  for (const k of ["x", "y", "width", "height"] as const)
    expect(Math.abs(a[k] - b[k]), k).toBeLessThanOrEqual(0.5);
}

/** Points to poke: on the live screen (empty wallpaper area), on the frame, and on the stage beside the phone. */
async function spots(page: Page) {
  const s = await screenBox(page);
  return {
    screen: [s.x + s.width / 2, s.y + s.height * 0.62] as [number, number],
    frame: [s.x - 5, s.y + s.height / 2] as [number, number],
    stage: [s.x - 160, s.y + s.height / 2] as [number, number],
  };
}

/** Moves the pointer to a spot and lets any pointer-driven easing come to rest first. */
async function hover(page: Page, at: [number, number]) {
  await page.mouse.move(...at, { steps: 4 });
  await page.waitForTimeout(1800);
}

async function expectStill(page: Page, before: Box) {
  // Long enough for any spin, inertia, settle or parallax to show
  await page.waitForTimeout(1400);
  expect(await rotY(page)).toBe(0);
  await expect(stage(page)).toHaveAttribute("data-face", "front");
  expectSameBox(await screenBox(page), before);
}

for (const where of ["screen", "frame", "stage"] as const) {
  test(`a click on the ${where} never moves the phone`, async ({ page }) => {
    await ready(page);
    const at = (await spots(page))[where];
    await hover(page, at);
    const before = await screenBox(page);
    await page.mouse.click(...at);
    await expectStill(page, before);
  });

  test(`a double-click on the ${where} never moves the phone`, async ({
    page,
  }) => {
    await ready(page);
    const at = (await spots(page))[where];
    await hover(page, at);
    const before = await screenBox(page);
    await page.mouse.dblclick(...at);
    await expectStill(page, before);
  });

  test(`jittery presses (1–5 px) on the ${where} never move the phone`, async ({
    page,
  }) => {
    await ready(page);
    const at = (await spots(page))[where];
    await hover(page, at);
    const before = await screenBox(page);
    for (const j of [1, 2, 3, 4, 5]) {
      await page.mouse.move(...at);
      await page.mouse.down();
      await page.mouse.move(at[0] + j, at[1] - j / 2);
      await page.mouse.move(at[0] - j, at[1] + j / 2);
      await page.mouse.up();
    }
    await page.mouse.move(...at);
    await expectStill(page, before);
  });

  test(`a sloppy click (a quick 10 px wobble) on the ${where} never moves the phone`, async ({
    page,
  }) => {
    await ready(page);
    const at = (await spots(page))[where];
    await hover(page, at);
    const before = await screenBox(page);
    await page.mouse.down();
    await page.mouse.move(at[0] + 6, at[1] + 2);
    await page.mouse.move(at[0] + 10, at[1] + 3);
    await page.mouse.up();
    await page.mouse.move(...at);
    await expectStill(page, before);
  });

  test(`fast repeated clicks on the ${where} never move the phone`, async ({
    page,
  }) => {
    await ready(page);
    const at = (await spots(page))[where];
    await hover(page, at);
    const before = await screenBox(page);
    for (let i = 0; i < 8; i++) await page.mouse.click(...at, { delay: 10 });
    await expectStill(page, before);
  });
}

test("a click on an app icon never moves the phone", async ({ page }) => {
  await ready(page);
  const icon = (await page
    .locator('[data-app-icon="courses"]')
    .first()
    .boundingBox())!;
  const at: [number, number] = [
    icon.x + icon.width / 2,
    icon.y + icon.height / 2,
  ];
  await hover(page, at);
  const before = await screenBox(page);
  await page.mouse.click(...at);
  await expect(page).toHaveURL(/#courses$/);
  // Scrolling inside the open app must not move it either
  await page.mouse.wheel(0, 400);
  await expectStill(page, before);
});

/** A steady drag that comes to rest before release (no flick). */
async function drag(
  page: Page,
  from: [number, number],
  dx: number,
  steps = 20,
) {
  await page.mouse.move(...from);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(from[0] + (dx * i) / steps, from[1]);
    await page.waitForTimeout(16);
  }
  await page.waitForTimeout(150);
  await page.mouse.up();
}

test("a 200 px stage drag turns to the back and stays; dragging again turns it back to the front", async ({
  page,
}) => {
  await ready(page);
  const { stage: at } = await spots(page);
  await drag(page, at, 200);
  await expect.poll(() => rotY(page), { timeout: 4000 }).toBe(180);
  await expect(stage(page)).toHaveAttribute("data-face", "back");
  // No idle return: still on the back well after release
  await page.waitForTimeout(2500);
  expect(await rotY(page)).toBe(180);
  await drag(page, at, 200);
  // Rest angles fold back to 0° / 180°
  await expect.poll(() => rotY(page), { timeout: 4000 }).toBe(0);
  await expect(stage(page)).toHaveAttribute("data-face", "front");
});

test("a short 30 px stage drag settles back to the front", async ({ page }) => {
  await ready(page);
  const { stage: at } = await spots(page);
  await drag(page, at, 30);
  await expect.poll(() => rotY(page), { timeout: 4000 }).toBe(0);
  await page.waitForTimeout(1000);
  expect(await rotY(page)).toBe(0);
});

test("a hard flick turns at most one extra half-turn", async ({ page }) => {
  await ready(page);
  const { stage: at } = await spots(page);
  await page.mouse.move(...at);
  await page.mouse.down();
  await page.mouse.move(at[0] + 200, at[1], { steps: 3 });
  await page.mouse.up();
  await page.waitForTimeout(1500);
  // 200 px = 180°, plus a velocity projection capped at ±90° → lands on 180° (never 360°+)
  expect(await rotY(page)).toBe(180);
});

test("a mostly vertical drag on the stage does not turn the phone", async ({
  page,
}) => {
  await ready(page);
  const { stage: at } = await spots(page);
  await page.mouse.move(...at);
  await page.mouse.down();
  for (let i = 1; i <= 16; i++) await page.mouse.move(at[0] + i, at[1] + i * 6);
  await page.mouse.up();
  await page.waitForTimeout(1000);
  expect(await rotY(page)).toBe(0);
});

test("the phone is perfectly still at rest", async ({ page }) => {
  await ready(page);
  await page.mouse.move(20, 20);
  await page.waitForTimeout(1500);
  const a = await screenBox(page);
  await page.waitForTimeout(2000);
  expectSameBox(await screenBox(page), a);
  await expect(stage(page)).toHaveCSS("animation-name", "none");
});

test("the Flip button turns the phone over and back", async ({ page }) => {
  await ready(page);
  const flip = page.getByRole("button", { name: "Flip the phone" });
  await flip.click();
  await expect.poll(() => rotY(page), { timeout: 4000 }).toBe(180);
  await expect(stage(page)).toHaveAttribute("data-face", "back");
  await flip.click();
  await expect.poll(() => rotY(page), { timeout: 4000 }).toBe(0);
});

test("pitch follows a drag within ±12° and returns flat", async ({ page }) => {
  await ready(page);
  const { stage: at } = await spots(page);
  await page.mouse.move(...at);
  await page.mouse.down();
  for (let i = 1; i <= 20; i++) await page.mouse.move(at[0] + i * 4, at[1] + i * 2.5);
  await page.waitForTimeout(100);
  const pitch = Number(await stage(page).getAttribute("data-rotx"));
  expect(Math.abs(pitch)).toBeGreaterThan(5);
  expect(Math.abs(pitch)).toBeLessThanOrEqual(12);
  await page.mouse.up();
  await expect.poll(async () => Number(await stage(page).getAttribute("data-rotx")), { timeout: 3000 }).toBe(0);
});
