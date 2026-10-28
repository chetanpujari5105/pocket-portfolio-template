import { expect, test, type Page } from "./fixtures";

/*
 * Problem 3 (v5): the home screen is the visitor's to arrange. Edit mode (long-press or the
 * context menu), dragging with a mouse and with real touch events (CDP), folders, the dock, the
 * App Library, removing and resetting, the keyboard equivalents, what a screen reader hears,
 * reduced motion, saving (`pp-home-v2`) and migrating, and the edit UI fitting small phones.
 */

type Layout = { v: 2; grid: string[]; dock: string[]; folders: Record<string, { name: string; items: string[] }> };

test.beforeEach(({}, info) => {
  test.skip(info.project.name !== "phone", "editing is driven on the phone-sized screen");
});

async function home(page: Page, layout?: Layout) {
  await page.addInitScript((saved) => {
    sessionStorage.setItem("pp-unlocked", "1");
    // A starting layout, written once (a reload later must read what the test saved)
    if (saved && !sessionStorage.getItem("pp-test-layout")) {
      localStorage.setItem("pp-home-v2", JSON.stringify(saved));
      sessionStorage.setItem("pp-test-layout", "1");
    }
  }, layout ?? null);
  await page.goto("/");
  await page.waitForFunction(() => document.documentElement.hasAttribute("data-awake") && document.querySelector("[data-measured]"));
  await page.waitForTimeout(500);
}

const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("pp-home-v2") ?? "null") as Layout | null);

async function center(page: Page, selector: string) {
  const box = (await page.locator(selector).first().boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}
/** Just inside an icon's left edge: a drop here goes beside it (its centre would make a folder). */
async function beside(page: Page, key: string) {
  const box = (await page.locator(tile(key)).first().boundingBox())!;
  return { x: box.x + 3, y: box.y + box.height / 2 };
}
const tile = (key: string) => `[data-home-key="${key}"] [data-icon-tile], [data-dock-key="${key}"] [data-icon-tile]`;

async function longPress(page: Page, key: string) {
  const at = await center(page, tile(key));
  await page.mouse.move(at.x, at.y);
  await page.mouse.down();
  await page.waitForTimeout(650);
  await page.mouse.up();
  await expect(page.getByRole("button", { name: "Done", exact: true })).toBeVisible();
}

/** A mouse drag in edit mode: press, travel in steps, hold at the end, release. */
async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }, hold = 250) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + 8, from.y + 4, { steps: 2 });
  await page.mouse.move(to.x, to.y, { steps: 14 });
  await page.waitForTimeout(hold);
  await page.mouse.up();
  await page.waitForTimeout(350);
}

/** Real touch events through the DevTools protocol (pointerType "touch"). */
async function touchscreen(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  const send = (type: "touchStart" | "touchMove" | "touchEnd", x = 0, y = 0) =>
    cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
  return {
    async press(at: { x: number; y: number }, ms: number) {
      await send("touchStart", at.x, at.y);
      await page.waitForTimeout(ms);
    },
    async move(from: { x: number; y: number }, to: { x: number; y: number }, steps = 14) {
      for (let i = 1; i <= steps; i++) await send("touchMove", from.x + ((to.x - from.x) * i) / steps, from.y + ((to.y - from.y) * i) / steps);
    },
    async release(hold = 250) {
      await page.waitForTimeout(hold);
      await send("touchEnd");
      await page.waitForTimeout(350);
    },
  };
}

const announcer = (page: Page) => page.locator("[data-home-announcer]");

test("a long-press enters edit mode: badges on removable icons, Done and +, and it says so", async ({ page }) => {
  await home(page);
  await longPress(page, "journey");
  await expect(page.locator('[data-badge-for="journey"]')).toBeAttached();
  await expect(page.locator('[data-badge-for="courses"]')).toBeAttached(); // dock icons too
  await expect(page.locator('[data-badge-for="settings"]')).toHaveCount(0); // pinned
  await expect(page.locator('[data-badge-for^="w:"]')).toHaveCount(0); // widgets stay
  await expect(page.getByRole("button", { name: "Add apps from the App Library" })).toBeVisible();
  await expect(announcer(page)).toContainText("Editing the Home Screen");
  // Tapping an icon in edit mode doesn't open it
  await page.locator(tile("journey")).first().click({ force: true });
  await expect(page.locator("[data-app-window]")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Done", exact: true })).toHaveCount(0);
  await expect(announcer(page)).toContainText("Finished editing");
});

test("mouse: dragging an icon moves it, and the order survives a reload", async ({ page }) => {
  await home(page);
  await longPress(page, "journey");
  await drag(page, await center(page, tile("x")), await beside(page, "youtube"));
  const after = (await saved(page))!;
  expect(after.grid.indexOf("x")).toBe(after.grid.indexOf("youtube") - 1);
  await expect(announcer(page)).toContainText("X moved");
  await page.reload();
  await page.waitForFunction(() => document.querySelector("[data-measured]"));
  expect((await saved(page))!.grid).toEqual(after.grid);
  const x = (await page.locator(tile("x")).first().boundingBox())!;
  const youtube = (await page.locator(tile("youtube")).first().boundingBox())!;
  expect(x.y * 1000 + x.x).toBeLessThan(youtube.y * 1000 + youtube.x);
});

test("touch: a long-press carries straight on into a drag", async ({ page }) => {
  await home(page);
  const touch = await touchscreen(page);
  const from = await center(page, tile("linkedin"));
  const to = await beside(page, "youtube");
  await touch.press(from, 650);
  await expect(page.getByRole("button", { name: "Done", exact: true })).toBeVisible();
  await touch.move(from, to);
  await touch.release();
  const after = (await saved(page))!;
  expect(after.grid.indexOf("linkedin")).toBe(after.grid.indexOf("youtube") - 1);
  await expect(page.locator("[data-app-window]")).toHaveCount(0);
});

test("touch: drop and hold on another app makes a named folder that opens ready to rename", async ({ page }) => {
  await home(page);
  const touch = await touchscreen(page);
  await touch.press(await center(page, tile("journey")), 650);
  await touch.release(0);
  // Expertise onto Platforms: both are "Learn"
  const from = await center(page, tile("expertise"));
  const to = await center(page, tile("platforms"));
  await touch.press(from, 80);
  await touch.move(from, to);
  await touch.release(650);
  const layout = (await saved(page))!;
  const [id, folder] = Object.entries(layout.folders).find(([, f]) => f.items.includes("expertise"))!;
  expect(folder).toEqual({ name: "Learn", items: ["platforms", "expertise"] });
  expect(layout.grid).toContain(`f:${id}`);
  const name = page.getByRole("textbox", { name: "Folder name" });
  await expect(name).toBeFocused();
  await page.keyboard.type("Study");
  await page.keyboard.press("Enter");
  await expect.poll(async () => (await saved(page))!.folders[id].name).toBe("Study");
  await expect(announcer(page)).toContainText("Made a folder, Learn");
  // Back on the home screen the folder carries its new name
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-folder]")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Open Study folder" })).toBeVisible();
});

test("dragging an app out of a two-app folder dissolves the folder", async ({ page }) => {
  await home(page, {
    v: 2,
    grid: ["w:impact", "w:work", "f:pair", "expertise", "platforms", "reviews", "youtube", "f:socials", "projects", "settings", "linkedin", "x"],
    dock: ["courses", "blog", "services", "contact"],
    folders: {
      pair: { name: "About Me", items: ["journey", "instagram"] },
      socials: { name: "Socials", items: ["ai-instagram", "substack", "udemy", "github"] },
    },
  });
  await longPress(page, "expertise");
  await page.getByRole("button", { name: "Open About Me folder" }).click();
  const item = page.locator('[data-folder-item="instagram"] [data-icon-tile]');
  await expect(item).toBeVisible();
  await page.waitForTimeout(400);
  await drag(page, await center(page, '[data-folder-item="instagram"] [data-icon-tile]'), await center(page, tile("linkedin")), 300);
  await expect(page.locator("[data-folder]")).toHaveCount(0);
  const layout = (await saved(page))!;
  expect(layout.folders.pair).toBeUndefined();
  expect(layout.grid).toContain("journey");
  expect(layout.grid).toContain("instagram");
});

test("remove sends an app to the App Library; + adds it back; Settings can't be removed", async ({ page }) => {
  await home(page);
  await longPress(page, "journey");
  await page.locator('[data-badge-for="reviews"]').click({ force: true });
  const sheet = page.getByRole("alertdialog");
  await expect(sheet).toContainText("Remove “Reviews”?");
  await page.getByRole("button", { name: "Remove from Home Screen" }).click();
  await expect(sheet).toHaveCount(0);
  expect((await saved(page))!.grid).not.toContain("reviews");
  await expect(announcer(page)).toContainText("Removed Reviews");

  await page.getByRole("button", { name: "Add apps from the App Library" }).click();
  const library = page.getByRole("dialog", { name: "App Library" });
  await expect(library).toBeVisible();
  await library.getByRole("button", { name: "Add Reviews to the Home Screen" }).click();
  expect((await saved(page))!.grid).toContain("reviews");
  await expect(library.getByText("Everything is on your Home Screen.")).toBeVisible();
  await library.getByRole("button", { name: "Done" }).click();
  await expect(library).toHaveCount(0);

  // The keyboard path to removing Settings is refused, with a reason
  await page.locator('[data-home-key="settings"] [data-nav]').focus();
  await page.keyboard.press("Delete");
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect(announcer(page)).toContainText("Settings stays on the Home Screen");
});

test("the context menu: Open, Share, Edit Home Screen, Remove App (not for Settings)", async ({ page }) => {
  await home(page);
  await page.locator(tile("journey")).first().click({ button: "right" });
  const menu = page.getByRole("menu");
  await expect(menu.getByRole("menuitem")).toHaveText(["Open", "Share…", "Edit Home Screen", "Remove App"]);
  await expect(menu.getByRole("menuitem").first()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);

  await page.locator(tile("settings")).first().click({ button: "right" });
  await expect(page.getByRole("menuitem", { name: /Remove App/ })).toHaveAttribute("aria-disabled", "true");
  await page.getByRole("menuitem", { name: "Edit Home Screen" }).click();
  await expect(page.getByRole("button", { name: "Done", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.getByRole("menu")).toHaveCount(0);

  // Shift+F10 on a focused icon, then Open
  await page.locator('[data-home-key="projects"] [data-nav]').focus();
  await page.keyboard.press("Shift+F10");
  await page.getByRole("menuitem", { name: "Open" }).click();
  await expect(page.locator("[data-app-window] [role=dialog]")).toBeVisible();
  await expect(page).toHaveURL(/#projects$/);
});

test("the dock holds four: a full dock refuses an app; one out makes room", async ({ page }) => {
  await home(page);
  await longPress(page, "journey");
  await drag(page, await center(page, tile("x")), await beside(page, "blog"));
  // Dropped beside, not on, a dock icon: the dock is full, so nothing changes
  let layout = await saved(page);
  expect(layout?.dock ?? ["courses", "blog", "services", "contact"]).toEqual(["courses", "blog", "services", "contact"]);

  const contact = await center(page, tile("contact"));
  await drag(page, contact, await beside(page, "x"));
  layout = (await saved(page))!;
  expect(layout.dock).toEqual(["courses", "blog", "services"]);
  expect(layout.grid).toContain("contact");

  const dock = (await page.locator("[data-dock]").boundingBox())!;
  await drag(page, await center(page, tile("journey")), { x: dock.x + dock.width - 20, y: dock.y + dock.height / 2 });
  layout = (await saved(page))!;
  expect(layout.dock).toEqual(["courses", "blog", "services", "journey"]);
});

test("holding a dragged icon at the screen edge turns the page", async ({ page }) => {
  await home(page);
  await longPress(page, "journey");
  const from = await center(page, tile("x"));
  const screen = (await page.locator("[data-home-grid]").boundingBox())!;
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + 8, from.y, { steps: 2 });
  await page.mouse.move(screen.x + screen.width - 6, from.y, { steps: 10 });
  await expect(page.getByRole("button", { name: /^Page 2 of / })).toHaveAttribute("aria-current", "page", { timeout: 2000 });
  await page.mouse.move(screen.x + screen.width / 2, screen.y + screen.height - 40, { steps: 6 });
  await page.waitForTimeout(250);
  await page.mouse.up();
  await page.waitForTimeout(300);
  const layout = (await saved(page))!;
  expect(layout.grid.indexOf("x")).toBeGreaterThan(layout.grid.indexOf("w:github"));
});

test("keyboard: arrows move the focused icon, F makes a folder, Delete removes", async ({ page }) => {
  await home(page);
  await longPress(page, "journey");
  await page.locator('[data-home-key="journey"] [data-nav]').focus();
  await page.keyboard.press("ArrowRight");
  let layout = (await saved(page))!;
  expect(layout.grid.indexOf("journey")).toBe(layout.grid.indexOf("expertise") + 1);
  await expect(announcer(page)).toContainText("Journey: page 1");
  await expect(page.locator('[data-home-key="journey"] [data-nav]')).toBeFocused();

  await page.locator('[data-home-key="youtube"] [data-nav]').focus();
  await page.keyboard.press("Delete");
  await expect(page.getByRole("alertdialog")).toContainText("Remove “YouTube”?");
  await page.keyboard.press("Enter");
  expect((await saved(page))!.grid).not.toContain("youtube");

  await page.locator('[data-home-key="linkedin"] [data-nav]').focus();
  await page.keyboard.press("f");
  await expect(page.getByRole("textbox", { name: "Folder name" })).toBeFocused();
  layout = (await saved(page))!;
  expect(Object.values(layout.folders).some((f) => f.name === "Social" && f.items.join() === "x,linkedin")).toBe(true);
});

test("Settings → Home Screen opens the App Library and resets the layout after a confirm", async ({ page }) => {
  await home(page, {
    v: 2,
    grid: ["w:impact", "w:work", "settings", "journey"],
    dock: ["courses"],
    folders: {},
  });
  await page.getByRole("button", { name: "Open Settings", exact: true }).click();
  await page.getByRole("button", { name: /App Library/ }).click();
  await expect(page.getByRole("dialog", { name: "App Library" }).getByRole("button", { name: "Add Blog to the Home Screen" })).toBeVisible();
  await page.getByRole("button", { name: "Reset Home Screen…" }).click();
  const confirm = page.getByRole("alertdialog");
  await expect(confirm).toContainText("Reset Home Screen?");
  await expect(confirm.getByRole("button", { name: "Cancel" })).toBeFocused();
  await confirm.getByRole("button", { name: "Reset Home Screen" }).click();
  const layout = (await saved(page))!;
  expect(layout.dock).toEqual(["courses", "blog", "services", "contact"]);
  expect(layout.folders.socials?.name).toBe("Socials");
});

test("reduced motion: edit mode breathes instead of wiggling", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await home(page);
  await longPress(page, "journey");
  const animation = await page.locator(tile("journey")).first().evaluate((el) => getComputedStyle(el).animationName);
  expect(animation).toBe("edit-breathe");
});

test("an old icon order is migrated; an unreadable saved layout falls back to the default", async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem("pp-step")) return;
    sessionStorage.setItem("pp-step", "1");
    localStorage.setItem("pp-icon-order", JSON.stringify(["projects", "journey"]));
  });
  await home(page);
  const first = await page.locator("[data-home-page='0'] [data-home-key]").evaluateAll((els) => els.map((el) => el.getAttribute("data-home-key")));
  expect(first.slice(0, 4)).toEqual(["w:impact", "w:work", "projects", "journey"]);

  await page.evaluate(() => localStorage.setItem("pp-home-v2", "{not json"));
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.reload();
  await page.waitForFunction(() => document.querySelector("[data-measured]"));
  await expect(page.locator(tile("journey")).first()).toBeVisible();
  expect(errors).toEqual([]);
});

for (const size of [
  { width: 320, height: 568 },
  { width: 392, height: 690 },
]) {
  test.describe(`edit UI fits ${size.width}×${size.height}`, () => {
    test.use({ viewport: size, isMobile: true, hasTouch: true });

    test("badges, Done and +, the App Library and the remove sheet stay on screen", async ({ page }) => {
      await home(page);
      await longPress(page, "journey");
      const outside = (selector: string) =>
        page.evaluate((sel) => {
          const screen = document.querySelector("[data-screen]")!.getBoundingClientRect();
          return [...document.querySelectorAll<HTMLElement>(sel)]
            .filter((el) => el.getClientRects().length && !el.closest("[inert]"))
            .map((el) => ({ name: el.getAttribute("aria-label") ?? el.textContent?.trim(), r: el.getBoundingClientRect() }))
            // Badges of the next page wait one screen to the right
            .filter(({ r }) => r.left < screen.right - 1)
            .filter(({ r }) => r.left < screen.left - 0.5 || r.right > screen.right + 0.5 || r.top < screen.top - 0.5 || r.bottom > screen.bottom + 0.5)
            .map(({ name }) => name);
        }, selector);
      await page.waitForTimeout(300);
      expect(await outside("[data-edit-ui]")).toEqual([]);
      // Nothing (like Control Center's pull handle) sits over the pills
      for (const name of ["Done", "Add apps from the App Library"]) {
        const covered = await page.getByRole("button", { name, exact: true }).evaluate((el) => {
          const r = el.getBoundingClientRect();
          const points = [[0.5, 0.5], [0.2, 0.3], [0.8, 0.3], [0.5, 0.15]];
          return points.some(([fx, fy]) => !el.contains(document.elementFromPoint(r.left + r.width * fx, r.top + r.height * fy)));
        });
        expect(covered, `${name} is covered`).toBe(false);
      }
      // The pills sit above the first row, clear of it
      const done = (await page.getByRole("button", { name: "Done", exact: true }).boundingBox())!;
      const firstRow = (await page.locator("[data-home-page='0'] [data-home-key]").first().boundingBox())!;
      expect(done.y + done.height).toBeLessThanOrEqual(firstRow.y + 2);

      await page.getByRole("button", { name: "Add apps from the App Library" }).click();
      await expect(page.getByRole("dialog", { name: "App Library" })).toBeVisible();
      await page.waitForTimeout(500);
      // The sheet, its title and Done are on screen (its list scrolls inside it)
      expect(await outside("[role=dialog][aria-label='App Library'], [role=dialog][aria-label='App Library'] h2")).toEqual([]);
      await expect(page.getByRole("dialog", { name: "App Library" }).getByRole("button", { name: "Done" })).toBeInViewport();
      await page.keyboard.press("Escape");

      await page.locator('[data-home-key="reviews"] [data-nav]').focus();
      await page.keyboard.press("Delete");
      await expect(page.getByRole("alertdialog")).toBeVisible();
      await page.waitForTimeout(500);
      expect(await outside("[role=alertdialog] button, [role=alertdialog] p")).toEqual([]);
    });
  });
}
