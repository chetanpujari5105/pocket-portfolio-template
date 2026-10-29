import { profile } from "../content/profile";
import { EMOJI, app, fitSuite, open, textOf, unlocked } from "./apple";
import { expect, test } from "./fixtures";

/* Contact, laid out like Settings (v12): a large title that collapses with Send in the bar, the
 * fields as one group, the direct ways to reach the owner as grouped rows with the right links, and
 * no emoji. Sending itself is covered in contact.spec.ts (never for real). */

unlocked();

const DIRECT = ["linkedin", "x", "instagram", "substack", "github"];

test("the form, the response time and every direct link, with no emoji", async ({ page }) => {
  await open(page, "contact");
  const screen = app(page, "Contact");
  await expect(screen.getByRole("heading", { name: "Contact", level: 1 })).toBeVisible();
  for (const label of ["To:", "From:", "Name:", "Subject:"]) await expect(screen.getByText(label, { exact: true })).toBeVisible();
  await expect(page.locator("#contact-to")).toHaveValue(profile.email);
  await expect(screen).toContainText(profile.responseTime);
  expect(await textOf(page, "app")).not.toMatch(EMOJI);

  for (const s of profile.socials.filter((s) => DIRECT.includes(s.id))) {
    const row = screen.locator(`[data-contact-social="${s.id}"]`);
    await expect(row).toHaveAttribute("href", s.url);
    await expect(row).toHaveAttribute("target", "_blank");
    await expect(row).toHaveAttribute("rel", /noopener/);
    await expect(row).toHaveAccessibleName(`Open ${s.label} profile (opens in a new tab)`);
    await expect(row).toContainText(s.handle);
  }
  await expect(screen.locator("[data-contact-social]")).toHaveCount(DIRECT.length);
});

test("the email row copies the address", async ({ page, context, browserName }) => {
  test.skip(browserName !== "chromium", "clipboard permissions are Chromium-only");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page, "contact");
  const row = page.locator("[data-copy-email]");
  await row.scrollIntoViewIfNeeded();
  await row.click();
  await expect(row).toContainText("Copied");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(profile.email);
});

test("the large title collapses into the bar while Send stays put", async ({ page }) => {
  await open(page, "contact");
  const box = (await page.locator("[data-screen]").boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  const send = page.locator("[data-contact-send]");
  const before = (await send.boundingBox())!;
  const bar = page.locator("[data-screen] .nav-material").first();
  await expect(bar).toHaveCSS("opacity", "0");
  await page.mouse.wheel(0, 300);
  await expect.poll(async () => Number(await bar.evaluate((el) => getComputedStyle(el).opacity))).toBeGreaterThan(0.9);
  const after = (await send.boundingBox())!;
  expect(Math.abs(after.y - before.y)).toBeLessThan(2);
});

fitSuite(["contact"]);
