import { expect, test } from "./fixtures";

// The lock screen shows once per session; these tests start on the home screen.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("pp-unlocked", "1"));
});

// Stable frames: reduced motion draws a still wallpaper; the clock is masked.
for (const scheme of ["light", "dark"] as const) {
  for (const path of ["/", "/#courses", "/#settings", "/#projects", "/#projects/sample-site", "/#projects/sample-game", "/#journey", "/#journey/2025", "/#services", "/#services/websites", "/#platforms", "/#platforms/partners", "/#courses/prompting-basics", "/#expertise", "/#expertise/ai", "/#contact", "/#settings/profile"]) {
    test(`${path} looks right in ${scheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(600);
      await expect(page).toHaveScreenshot(`${path.replace(/\W+/g, "") || "home"}-${scheme}.png`, {
        mask: [page.locator("time")],
      });
    });
  }
}

// Home page 2: the widgets, with the Expertise stack resting on card 1 (no autoplay under reduced motion)
for (const scheme of ["light", "dark"] as const) {
  test(`home page 2 looks right in ${scheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
    await page.goto("/");
    await page.getByRole("button", { name: "Page 2 of 2" }).click();
    await expect(page.locator("[data-expertise-stack]")).toBeVisible();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);
    await expect(page).toHaveScreenshot(`home2-${scheme}.png`, {
      // The clock, the heatmap, the latest video and the latest post change on their own
      mask: [page.locator("time"), page.locator("[data-github-widget]"), page.getByRole("link", { name: /^(YouTube @|Latest video)/ }), page.getByRole("button", { name: /^Latest post:/ })],
    });
  });
}

// The lock screen at a fixed time (its clock is the subject here, so it isn't masked)
for (const scheme of ["light", "dark"] as const) {
  test(`lock screen looks right in ${scheme}`, async ({ page }) => {
    await page.addInitScript(() => sessionStorage.removeItem("pp-unlocked"));
    await page.clock.setFixedTime(new Date("2026-10-29T09:41:00"));
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator("[data-lock]")).toBeVisible();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);
    await expect(page).toHaveScreenshot(`lock-${scheme}.png`, {
      // The battery and this week's contributions come from the machine and the network
      mask: [page.locator(".lock-widget").nth(0), page.locator(".lock-widget").nth(1), page.locator("[data-lock-stack] .min-w-0")],
    });
  });
}
