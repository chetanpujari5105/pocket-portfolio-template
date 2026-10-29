import { profile } from "../content/profile";
import { EMOJI, app, fitSuite, open, squash, swipeBack, textOf, unlocked, view } from "./apple";
import { expect, test } from "./fixtures";

/* Settings, laid out like iOS Settings: grouped sections with flat tiles, working switches, the
 * profile as a pushed detail with every fact and link, and no emoji. */

unlocked();

test("every section is there, the switches work and there is no emoji", async ({ page }) => {
  await open(page, "settings");
  const screen = app(page, "Settings");
  for (const h of ["Display & Brightness", "Wallpaper", "Phone finish", "Home Screen", "Accessibility", "General"])
    await expect(screen.getByRole("heading", { name: h, level: 2 })).toBeAttached();
  expect(await textOf(page, "app")).not.toMatch(EMOJI);
  await expect(screen.locator("[data-credits]")).toContainText("iPhone, iOS and iPadOS are trademarks of Apple Inc.");

  const larger = screen.getByRole("switch", { name: "Larger text" });
  const before = await larger.getAttribute("aria-checked");
  await larger.click();
  await expect(larger).not.toHaveAttribute("aria-checked", before!);
  await expect.poll(() => page.evaluate(() => localStorage.getItem("pp-text"))).toBe(before === "true" ? "default" : "large");
  await larger.click();
  await expect(larger).toHaveAttribute("aria-checked", before!);
});

test("the profile pushes with every fact and link, and swipes back", async ({ page }) => {
  await open(page, "settings");
  await page.locator("[data-profile-row]").click();
  await expect(view(page)).toBeVisible();
  await expect(page).toHaveURL(/#settings\/profile$/);
  const told = await textOf(page, "view");
  for (const fact of [profile.name, profile.role, profile.shortBio, profile.location, profile.education, profile.email]) expect(told).toContain(squash(fact));
  expect(told).not.toMatch(EMOJI);
  await expect(view(page).locator("[data-profile-email]")).toHaveAttribute("href", `mailto:${profile.email}`);
  for (const s of profile.socials) {
    const row = view(page).locator(`[data-profile-social="${s.id}"]`);
    await expect(row).toHaveAttribute("href", s.url);
    await expect(row).toHaveAttribute("target", "_blank");
    await expect(row).toHaveAccessibleName(`Open ${s.label} profile (opens in a new tab)`);
  }
  await swipeBack(page);
  await expect(view(page)).toHaveCount(0);
  await expect(page).toHaveURL(/#settings$/);
});

fitSuite(["settings", "settings/profile"]);
