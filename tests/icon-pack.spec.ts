import { expect, settled, test } from "./fixtures";

// The lock screen shows once per session; these tests start on the home screen.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("pp-unlocked", "1"));
});

import { appsLayout } from "../content/apps";
import { ICON_PACK, packIcon } from "../src/lib/icon-pack";

// Runs against whichever pack the server was built with: set the same NEXT_PUBLIC_ICON_PACK
// for the build and for `playwright test` (unset = original).
const TILES = [...appsLayout.block, ...appsLayout.row, ...appsLayout.dock].filter((i) => i.app && i.app !== "socials");

test(`home tiles wear the ${ICON_PACK} faces`, async ({ page }) => {
  await page.goto("/");
  await settled(page);
  for (const item of TILES) {
    const tile = page.locator(`[data-icon-tile="${item.app}"]`).first();
    const art = packIcon(item.id);
    if (art) {
      await expect(tile).toHaveAttribute("data-pack", "");
      await expect(tile.locator("svg[data-glyph]")).toHaveCount(0);
      const face = await tile.evaluate((el) => getComputedStyle(el, "::before").backgroundImage);
      expect(face, item.id).toContain(art);
    } else {
      await expect(tile).not.toHaveAttribute("data-pack");
      await expect(tile.locator("svg[data-glyph]")).toHaveCount(1);
    }
  }
  // Brand tiles keep their official marks either way
  for (const id of ["youtube", "linkedin", "x", "github", "udemy"]) {
    const tile = page.locator(`[data-icon-tile="${id}"]`).first();
    if (await tile.count()) await expect(tile).not.toHaveAttribute("data-pack");
  }
  if (ICON_PACK === "original") await expect(page.locator("[data-pack]")).toHaveCount(0);
});

test("every pack image loads and is a 180 px square", async ({ page }) => {
  const arts = [...new Set(TILES.map((i) => packIcon(i.id)).filter(Boolean))] as string[];
  test.skip(arts.length === 0, "original pack: no images");
  await page.goto("/");
  for (const src of arts) {
    const size = await page.evaluate(async (s) => {
      const img = new Image();
      img.src = s;
      await img.decode();
      return [img.naturalWidth, img.naturalHeight];
    }, src);
    expect(size, src).toEqual([180, 180]);
  }
});

test("Settings credits name the pack only when it is on", async ({ page }) => {
  await page.goto("/#settings");
  const credits = page.getByText(/^Designed and built for/);
  await expect(credits).toBeAttached();
  if (ICON_PACK === "ios18") await expect(credits).toContainText("App icons: an icon pack added by the site owner");
  else await expect(credits).toContainText("App icons, wallpaper and 3D phone are original");
});

test("the share card renders", async ({ request }) => {
  const res = await request.get("/opengraph-image");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("image/png");
});
