import { expect, settled, test, unpainted } from "./fixtures";

/* Home pages skip paint only while wholly off to the side (HomeScreen `Pages`), on every screen. */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("pp-unlocked", "1"));
});

test("the current home page is painted and the one off to the side is skipped, both ways", async ({ page }) => {
  await page.goto("/");
  await settled(page);
  const pageOne = page.locator("[data-home-page='0']");
  const pageTwo = page.locator("[data-home-page='1']");
  expect(await unpainted(page, 0)).toEqual([]);
  await expect(pageOne).not.toHaveAttribute("data-offscreen");
  await expect(pageTwo).toHaveAttribute("data-offscreen", "");

  await page.getByRole("button", { name: /^Page 2 of/ }).click();
  await expect(pageOne).toHaveAttribute("data-offscreen", "");
  await expect(pageTwo).not.toHaveAttribute("data-offscreen");
  await expect.poll(() => unpainted(page, 1)).toEqual([]);

  await page.getByRole("button", { name: /^Page 1 of/ }).click();
  await expect(pageTwo).toHaveAttribute("data-offscreen", "");
  await expect.poll(() => unpainted(page, 0)).toEqual([]);
});
