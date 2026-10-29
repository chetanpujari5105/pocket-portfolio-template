import { iosColor, iosType } from "../src/lib/ios-tokens";
import { expect, test } from "./fixtures";

/* The system tokens live in two forms, the map in lib/ios-tokens.ts and the --ios-* variables in
 * globals.css: they must agree, in both modes, and the app roles must resolve to them. */

/** The production CSS is minified (#fff, #0003): expand short hex before comparing */
const full = (hex: string) => (hex.length === 4 || hex.length === 5 ? "#" + [...hex.slice(1)].map((c) => c + c).join("") : hex);

test.beforeEach(({}, info) => test.skip(info.project.name !== "phone", "one page is enough; runs once"));

test("every --ios-* colour matches the token map, light and dark, with one switch", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("pp-unlocked", "1"));
  await page.goto("/");
  for (const mode of ["light", "dark"] as const) {
    const read = await page.evaluate(
      ([names, dark]) => {
        document.documentElement.classList.toggle("dark", dark);
        const s = getComputedStyle(document.documentElement);
        return Object.fromEntries(names.map((n) => [n, s.getPropertyValue(`--ios-${n}`).trim().toLowerCase()]));
      },
      [Object.keys(iosColor), mode === "dark"] as const,
    ).then((r) => Object.fromEntries(Object.entries(r).map(([n, v]) => [n, full(v)])));
    const want = Object.fromEntries(Object.entries(iosColor).map(([n, v]) => [n, v[mode]]));
    expect(read).toEqual(want);
  }
});

test("the app roles resolve to the system tokens, and the type ramp is in rem", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("pp-unlocked", "1"));
  await page.goto("/#settings");
  await page.waitForSelector("[data-app-window]");
  const probe = await page.evaluate(() => {
    const el = document.createElement("div");
    el.className = "bg-app-group text-app-ink text-ios-body border-app-divider border";
    document.querySelector("[data-app-window]")!.append(el);
    const s = getComputedStyle(el);
    return { bg: s.backgroundColor, ink: s.color, line: s.borderTopColor, size: s.fontSize, lh: s.lineHeight };
  });
  expect(probe).toEqual({ bg: "rgb(255, 255, 255)", ink: "rgb(0, 0, 0)", line: "rgb(231, 231, 232)", size: `${iosType.body.size}px`, lh: `${iosType.body.line}px` });
});
