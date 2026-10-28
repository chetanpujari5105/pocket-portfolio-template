import { expect, test, type Page } from "./fixtures";
import { SIZES, slug } from "./devices";

/*
 * Problem 1 (v5): nothing on the home screen, in an app or on the lock screen is ever clipped or
 * hidden behind a browser toolbar, on any screen in the matrix. Runs once, in the phone project.
 */

const APPS = ["courses", "journey", "expertise", "platforms", "projects", "blog", "reviews", "services", "contact", "settings"];
/** Clearance kept above the Search pill and inside the screen edges */
const MARGIN = 8;

async function unlockedHome(page: Page) {
  await page.addInitScript(() => sessionStorage.setItem("pp-unlocked", "1"));
  await page.goto("/");
  await expect(page.locator("[data-home-page] [data-nav]").first()).toBeVisible();
  await page.waitForFunction(() => document.documentElement.hasAttribute("data-awake"));
}

/** Every item on every home page sits inside the screen and above the Search pill. */
async function checkHomePages(page: Page) {
  const vp = page.viewportSize()!;
  const pages = await page.locator("[data-home-page]").count();
  const problems: string[] = [];
  for (let i = 0; i < pages; i++) {
    if (i > 0) {
      await page.getByRole("button", { name: `Page ${i + 1} of ${pages}` }).click();
    }
    await expect(page.getByRole("button", { name: `Page ${i + 1} of ${pages}` })).toHaveAttribute("aria-current", "page");
    await page.waitForTimeout(650);
    const result = await page.evaluate(
      ({ index, margin }) => {
        const out: string[] = [];
        const screen = document.querySelector<HTMLElement>("[data-screen]")!.getBoundingClientRect();
        const pill = (document.querySelector("[data-search-pill]") ?? document.querySelector("[aria-label='Search']")!.parentElement!)
          .getBoundingClientRect();
        const items = document.querySelectorAll<HTMLElement>(`[data-home-page="${index}"] [data-nav]`);
        if (!items.length) out.push(`page ${index + 1} is empty`);
        for (const el of items) {
          const r = el.getBoundingClientRect();
          const name = el.getAttribute("aria-label") ?? el.textContent ?? "?";
          if (r.bottom > pill.top - margin) out.push(`${name}: bottom ${Math.round(r.bottom)} > pill top ${Math.round(pill.top)} − ${margin}`);
          if (r.left < screen.left || r.right > screen.right + 0.5) out.push(`${name}: outside the screen sideways`);
          if (r.top < screen.top + 12) out.push(`${name}: under the status bar`);
          // A widget's content never spills out of its box
          for (const box of el.querySelectorAll<HTMLElement>("[data-widget-tile], [data-widget-body]")) {
            if (box.scrollHeight > box.clientHeight + 1 || box.scrollWidth > box.clientWidth + 1)
              out.push(`${name}: content overflows its widget (${box.scrollWidth}×${box.scrollHeight} in ${box.clientWidth}×${box.clientHeight})`);
          }
        }
        return out;
      },
      { index: i, margin: MARGIN },
    );
    problems.push(...result.map((p) => `page ${i + 1}: ${p}`));
  }
  const dock = await page.locator("[data-dock]").boundingBox();
  if (dock && dock.y + dock.height > vp.height) problems.push(`dock bottom ${dock.y + dock.height} > ${vp.height}`);
  return problems;
}

/** Scrolls the open app to the end; its last element must sit above the home indicator. */
async function checkAppEnd(page: Page) {
  return page.evaluate(async () => {
    const win = document.querySelector<HTMLElement>("[data-app-window]")!;
    const scrollers = [...win.querySelectorAll<HTMLElement>(".overflow-y-auto")].filter((el) => el.offsetParent && el.scrollHeight > 0);
    const scroller = scrollers.at(-1);
    if (!scroller) return "no scroll container";
    scroller.scrollTop = scroller.scrollHeight;
    scroller.dispatchEvent(new Event("scroll"));
    await new Promise((r) => setTimeout(r, 450));
    // The last visible leaf of the content
    let node: Element | null = scroller.firstElementChild;
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden";
    };
    while (node) {
      const kids = [...node.children].filter(visible);
      if (!kids.length) break;
      node = kids.at(-1)!;
    }
    if (!node) return "empty app";
    const r = node.getBoundingClientRect();
    const indicator = win.querySelector("[data-home-indicator] > span")!.getBoundingClientRect();
    const screen = document.querySelector("[data-screen]")!.getBoundingClientRect();
    if (r.bottom > indicator.top - 4) return `last element bottom ${Math.round(r.bottom)} under the home indicator (${Math.round(indicator.top)})`;
    if (r.bottom > screen.bottom) return "last element below the screen";
    return null;
  });
}

for (const size of SIZES) {
  test.describe(`${size.name} ${slug(size)}`, () => {
    test.use({ viewport: { width: size.width, height: size.height }, hasTouch: true, isMobile: size.width < 600 || !!size.landscape });

    test.beforeEach(({}, info) => {
      test.skip(info.project.name !== "phone", "the matrix runs once, in the phone project");
    });

    test("home pages fit above the Search pill and dock", async ({ page }) => {
      await unlockedHome(page);
      expect(await checkHomePages(page)).toEqual([]);
    });

    test("the lock screen fits", async ({ page }) => {
      await page.goto("/");
      const lock = page.locator("[data-lock]");
      await expect(lock).toBeVisible();
      const clipped = await lock.evaluate((el) => {
        const screen = el.getBoundingClientRect();
        return [...el.querySelectorAll<HTMLElement>("time, button, p, h1, h2, [data-lock-item]")]
          .filter((n) => n.offsetParent)
          .map((n) => ({ n: n.textContent?.slice(0, 30), r: n.getBoundingClientRect() }))
          .filter(({ r }) => r.bottom > screen.bottom + 0.5 || r.top < screen.top - 0.5)
          .map(({ n }) => n);
      });
      expect(clipped).toEqual([]);
    });

    test("Search, Control Center and the app switcher fit", async ({ page }) => {
      await unlockedHome(page);
      const outside = (selector: string) =>
        page.evaluate((sel) => {
          const screen = document.querySelector("[data-screen]")!.getBoundingClientRect();
          return [...document.querySelectorAll<HTMLElement>(sel)]
            .filter((el) => el.offsetParent)
            .map((el) => ({ name: el.getAttribute("aria-label") || el.textContent?.trim().slice(0, 24) || `${el.tagName} ${el.className.toString().slice(0, 60)}`, r: el.getBoundingClientRect() }))
            .filter(({ r }) => r.width && (r.bottom > screen.bottom + 0.5 || r.top < screen.top - 0.5 || r.right > screen.right + 0.5 || r.left < screen.left - 0.5))
            .map(({ name }) => name);
        }, selector);

      await page.getByRole("button", { name: "Search", exact: true }).click();
      await expect(page.getByRole("combobox")).toBeFocused();
      await page.waitForTimeout(600); // it slides down from the top
      expect(await outside("[role=combobox]")).toEqual([]);
      await page.keyboard.press("Escape");

      await page.locator("[data-panel-handle]").click();
      await expect(page.locator("[data-control-panel][data-visible]")).toBeVisible();
      await page.waitForTimeout(700);
      expect(await outside("[data-control-panel] .cc-tile, [data-control-panel] button, [data-control-panel] input")).toEqual([]);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(400);

      await page.getByRole("button", { name: "Open Journey", exact: true }).click();
      await page.waitForTimeout(800);
      await page.keyboard.press("Control+ArrowUp");
      await page.waitForTimeout(900);
      expect(await outside("[role=dialog][aria-label='App switcher'] button")).toEqual([]);
    });

    test("every app scrolls to an end that clears the home indicator", async ({ page }) => {
      test.setTimeout(90_000);
      await page.addInitScript(() => sessionStorage.setItem("pp-unlocked", "1"));
      const problems: string[] = [];
      for (const app of APPS) {
        // A fresh load per app (a hash change alone would switch apps with an animation)
        await page.goto("about:blank");
        await page.goto(`/#${app}`);
        await expect(page.locator("[data-app-window] [role=dialog]")).toBeVisible();
        await expect(page.locator("[data-app-window] .overflow-y-auto").first()).toBeAttached();
        await page.waitForTimeout(400);
        const issue = await checkAppEnd(page);
        if (issue) problems.push(`${app}: ${issue}`);
      }
      expect(problems).toEqual([]);
    });

    test("Contact: with the keyboard up, the focused field and Send stay visible", async ({ page }) => {
      await page.addInitScript(() => sessionStorage.setItem("pp-unlocked", "1"));
      await page.goto("/#contact");
      const message = page.locator("#contact-message");
      await expect(message).toBeVisible();
      await page.waitForTimeout(300);
      await message.focus();
      // The on-screen keyboard: the visible viewport shrinks by 300 px
      await page.setViewportSize({ width: size.width, height: Math.max(220, size.height - 300) });
      await page.waitForTimeout(500);
      const vh = page.viewportSize()!.height;
      const inView = async (selector: string) => {
        const box = await page.locator(selector).first().boundingBox();
        return !!box && box.y >= 0 && box.y + Math.min(box.height, 40) <= vh;
      };
      expect(await inView("#contact-message")).toBe(true);
      expect(await inView("[data-contact-send]")).toBe(true);
    });
  });
}
