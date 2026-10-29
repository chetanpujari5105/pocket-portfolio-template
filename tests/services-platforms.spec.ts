import { philosophy } from "../content/philosophy";
import { platforms } from "../content/platforms";
import { profile } from "../content/profile";
import { services, servicesFooter, servicesIntro } from "../content/services";
import { expect, test, type Page } from "./fixtures";

/* Services and Platforms, laid out like Settings (v11): every fact from content/ on screen, no
 * emoji, rows at least 44 px with nothing cut off at any phone width or text size, links that say
 * where they go, and detail views that push and swipe back. */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("pp-unlocked", "1"));
});

const EMOJI = /\p{Extended_Pictographic}/u;
const squash = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
const app = (page: Page, name: string) => page.getByRole("dialog", { name });
const view = (page: Page) => page.locator("[data-push-view]");

async function open(page: Page, hash: string) {
  await page.goto(`/#${hash}`);
  await expect(page.locator("[data-app-window] > [role=dialog]")).toBeVisible();
  await page.waitForFunction(() => innerWidth < 900 || document.documentElement.hasAttribute("data-3d"), null, { timeout: 25_000 });
  await page.waitForTimeout(600);
}

async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }, steps = 12) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(from.x + ((to.x - from.x) * i) / steps, from.y + ((to.y - from.y) * i) / steps);
    await page.waitForTimeout(16);
  }
  await page.mouse.up();
}

/** Text cut off inside `root` (ellipsis, a clamp or overflow), and grouped rows shorter than 44 px. */
const layoutFaults = (page: Page, root: string) =>
  page.locator(root).evaluate((el) => {
    const clipped = [...el.querySelectorAll<HTMLElement>("h1, h2, li span, li a, li button, dd, dt, p")]
      .filter((n) => n.childElementCount === 0 && n.textContent?.trim() && n.offsetParent)
      .filter((n) => n.scrollWidth > n.clientWidth + 1 || n.scrollHeight > n.clientHeight + 1)
      .map((n) => n.textContent!.trim());
    const scale = el.getBoundingClientRect().width / (el as HTMLElement).offsetWidth || 1;
    const short = [...el.querySelectorAll<HTMLElement>("ul[role=list] > li > :first-child")]
      .filter((r) => r.offsetParent && r.getBoundingClientRect().height / scale < 43.5)
      .map((r) => r.textContent!.trim());
    return { clipped, short };
  });

test("Services: every service and its facts, one Contact row, no emoji", async ({ page }) => {
  await open(page, "services");
  const screen = app(page, "Services");
  const text = squash((await screen.textContent()) ?? "");
  for (const fact of [servicesIntro, servicesFooter, ...services.flatMap((s) => [s.title, s.summary])]) expect(text).toContain(squash(fact));
  expect(text).not.toMatch(EMOJI);
  expect(text).not.toContain("let's talk");
  await expect(screen.locator("[data-service-row]")).toHaveCount(services.length);
  await expect(screen.getByRole("button", { name: "Contact me" })).toHaveCount(1);

  // Each detail: its points, who it's for and its tools, still with no emoji
  for (const s of services) {
    await open(page, `services/${s.id}`);
    const detail = view(page);
    await expect(detail).toBeVisible();
    const told = squash((await detail.textContent()) ?? "");
    for (const fact of [s.title, s.summary, s.goodFor, ...s.points, ...(s.tools?.items ?? [])]) expect(told).toContain(squash(fact));
    if (s.id === "courses") for (const p of philosophy) expect(told).toContain(squash(p.quote));
    expect(told).not.toMatch(EMOJI);
    await expect(detail.getByRole("button", { name: `Start a conversation about ${s.title}` })).toBeVisible();
  }
});

test("Platforms: the summary, every platform's link and the partner list, no emoji", async ({ page }) => {
  await open(page, "platforms");
  const screen = app(page, "Platforms");
  const summary = squash((await screen.locator("[data-platforms-summary]").textContent()) ?? "");
  expect(summary).toContain(`${profile.stats.platforms}+`);
  expect(summary).toContain(`${profile.stats.countries}+`);
  expect(await screen.textContent()).not.toMatch(EMOJI);
  expect(await screen.textContent()).not.toContain("Open profile");

  for (const p of platforms.primary) {
    const row = screen.locator(`[data-platform="${p.name}"]`);
    await expect(row).toBeVisible();
    if (!p.url) {
      // Packt: no link, no accessory, its note instead
      await expect(row).not.toHaveAttribute("href");
      await expect(row.locator("a, [data-external]")).toHaveCount(0);
      await expect(row).toContainText(p.note!);
      continue;
    }
    const kind = p.name === "YouTube" ? "channel" : "profile";
    await expect(row).toHaveAccessibleName(`Open ${p.name} ${kind} (opens in a new tab)`);
    await expect(row).toHaveAttribute("href", p.url);
    await expect(row).toHaveAttribute("target", "_blank");
    await expect(row).toHaveAttribute("rel", /noopener/);
    await expect(row.locator("[data-external]")).toHaveCount(1);
    // The secondary line is where the link goes, taken from the link itself
    expect(p.url).toContain(p.handle!.replace(/^@/, ""));
    await expect(row).toContainText(p.handle!);
  }

  const partners = screen.locator("[data-partners-row]");
  await expect(partners).toContainText(String(platforms.distribution.length));
  await partners.click();
  await expect(page).toHaveURL(/#platforms\/partners$/);
  const names = await view(page).locator("[data-partner]").allTextContents();
  expect(names.map((n) => n.trim())).toEqual([...platforms.distribution].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" })));
  await expect(view(page).getByRole("link")).toHaveCount(0);
  expect(await view(page).textContent()).not.toMatch(EMOJI);
});

test("a service pushes its detail and swipes back from the left edge", async ({ page }) => {
  await open(page, "services");
  await page.locator('[data-service-row="websites"]').click();
  const detail = view(page);
  await expect(detail).toBeVisible();
  await expect(page).toHaveURL(/#services\/websites$/);
  await page.waitForTimeout(600);
  const box = (await detail.boundingBox())!;
  const y = box.y + box.height / 2;
  await drag(page, { x: box.x + 18, y }, { x: box.x + box.width * 0.75, y });
  await expect(detail).toHaveCount(0);
  await expect(page).toHaveURL(/#services$/);
  // Back button too
  await page.locator('[data-service-row="design"]').click();
  await expect(view(page)).toBeVisible();
  await page.getByRole("button", { name: "Back to Services" }).click();
  await expect(view(page)).toHaveCount(0);
});

test("Start a conversation opens Contact with the service as the subject", async ({ page }) => {
  await open(page, "services/automation");
  const s = services.find((x) => x.id === "automation")!;
  await view(page).getByRole("button", { name: `Start a conversation about ${s.title}` }).click();
  await expect(app(page, "Contact")).toBeVisible();
  await expect(page.locator("#contact-subject")).toHaveValue(s.title);
});

for (const scheme of ["light", "dark"] as const)
  for (const text of ["default", "large"] as const)
    test(`nothing is cut off and every row is at least 44 px (${scheme}, ${text} text)`, async ({ page }, info) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.addInitScript((size) => localStorage.setItem("pp-text", size), text);
      // The phone project also tries the narrowest and widest common phones
      const widths = info.project.name === "phone" ? [360, 390, 430] : [0];
      for (const w of widths) {
        if (w) await page.setViewportSize({ width: w, height: 844 });
        for (const hash of ["services", ...services.map((s) => `services/${s.id}`), "platforms", "platforms/partners"]) {
          await open(page, hash);
          const root = hash.includes("/") ? "[data-push-view]" : "[data-app-window] > [role=dialog]";
          const faults = await layoutFaults(page, root);
          expect(faults.clipped, `${hash} at ${w || "default"}: cut off`).toEqual([]);
          expect(faults.short, `${hash} at ${w || "default"}: rows under 44 px`).toEqual([]);
        }
      }
    });
