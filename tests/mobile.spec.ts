import { expect, test, type Page } from "./fixtures";

/* Phones (< 600 px): the site is the phone, full screen, installable, driven by real touch events. */

test.beforeEach(async ({ page }, info) => {
  test.skip(info.project.name !== "phone", "phone viewport only");
  await page.addInitScript(() => sessionStorage.setItem("pp-unlocked", "1"));
});

type Point = { x: number; y: number };

/** A real touch drag (touchstart → touchmove… → touchend) through the DevTools protocol. */
async function touchDrag(page: Page, from: Point, to: Point, { steps = 10, release = true } = {}) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [from] });
  for (let i = 1; i <= steps; i++) {
    const p = { x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps };
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [p] });
    await page.waitForTimeout(16);
  }
  if (release) await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  return cdp;
}

test("the phone fills the screen edge to edge and the page itself never scrolls", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-app-icon]").first()).toBeVisible();
  const vp = page.viewportSize()!;
  const box = (await page.locator(".phone-wrap").boundingBox())!;
  expect(box).toEqual({ x: 0, y: 0, width: vp.width, height: vp.height });
  const page_ = await page.evaluate(() => ({
    scrollW: document.scrollingElement!.scrollWidth,
    overscroll: getComputedStyle(document.documentElement).overscrollBehaviorY,
  }));
  expect(page_.scrollW).toBeLessThanOrEqual(vp.width);
  expect(page_.overscroll).toBe("none");
  // No drawn frame, buttons or cutout on a real phone
  await expect(page.locator(".phone-btn").first()).toBeHidden();
});

test("it installs: manifest, standalone display and icons", async ({ page, request }) => {
  await page.goto("/");
  const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  const manifest = await (await request.get(href!)).json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.start_url).toBe("/");
  const sizes = manifest.icons.map((i: { sizes: string; purpose?: string }) => `${i.sizes}:${i.purpose}`);
  expect(sizes).toEqual(expect.arrayContaining(["192x192:any", "512x512:any", "512x512:maskable"]));
  for (const icon of manifest.icons) {
    const res = await request.get(icon.src);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("image/png");
  }
  await expect(page.locator('meta[name="apple-mobile-web-app-capable"], meta[name="mobile-web-app-capable"]')).toHaveCount(1);
});

test("touch: a swipe pages the home screen", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-app-icon]").first()).toBeVisible();
  const vp = page.viewportSize()!;
  await touchDrag(page, { x: vp.width * 0.85, y: vp.height * 0.45 }, { x: vp.width * 0.15, y: vp.height * 0.45 });
  await expect(page.getByRole("button", { name: "Page 2 of 2" })).toHaveAttribute("aria-current", "page");
});

test("touch: pulling past the top of an app rubber-bands, then springs back", async ({ page }) => {
  await page.goto("/#journey");
  await expect(page.locator("[data-app-window] > [role=dialog]")).toBeVisible();
  await page.waitForTimeout(500);
  const vp = page.viewportSize()!;
  const content = page.locator("[data-app-window] .overflow-y-auto > div").first();
  const y = () => content.evaluate((el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).m42);
  const cdp = await touchDrag(page, { x: vp.width / 2, y: vp.height * 0.4 }, { x: vp.width / 2, y: vp.height * 0.4 + 200 }, { release: false });
  const pulled = await y();
  expect(pulled).toBeGreaterThan(30);
  expect(pulled).toBeLessThan(200);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect.poll(y).toBe(0);
});
