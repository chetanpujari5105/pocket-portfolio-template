// Usage: node scripts/check-os.mjs <outDir> [baseUrl]
import { chromium } from "@playwright/test";
const [out = "screens", base = "http://localhost:3100"] = process.argv.slice(2);
const b = await chromium.launch();
const log = (...a) => console.log(...a);
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light" });
const p = await ctx.newPage();
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await p.goto(base + "/", { waitUntil: "networkidle" });
await p.waitForTimeout(1000);
const state = async () => ({ hash: await p.evaluate(() => location.hash), title: await p.title(), dialog: await p.locator('[role=dialog][aria-modal=true]').count() });

await p.getByRole("button", { name: "Open Courses" }).click();
await p.waitForTimeout(90); await p.screenshot({ path: `${out}/open-90ms.png` });
await p.waitForTimeout(160); await p.screenshot({ path: `${out}/open-250ms.png` });
await p.waitForTimeout(600); await p.screenshot({ path: `${out}/open-done.png` });
log("after open:", await state(), "focused:", await p.evaluate(() => document.activeElement?.getAttribute("aria-label")));
await p.keyboard.press("Escape"); await p.waitForTimeout(120); await p.screenshot({ path: `${out}/close-120ms.png` });
await p.waitForTimeout(700);
log("after esc:", await state(), "focused:", await p.evaluate(() => document.activeElement?.getAttribute("aria-label")));

await p.getByRole("button", { name: "Open Journey" }).first().click(); await p.waitForTimeout(700);
await p.goBack(); await p.waitForTimeout(700);
log("after browser back:", await state());

await p.getByRole("button", { name: "Open Settings" }).click(); await p.waitForTimeout(700);
await p.getByRole("button", { name: "Back to Home" }).click(); await p.waitForTimeout(700);
log("after chevron:", await state());

// swipe up on the home indicator
await p.getByRole("button", { name: "Open Contact" }).click(); await p.waitForTimeout(800);
const box = await p.locator('[role=dialog] .cursor-grab').boundingBox();
await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await p.mouse.down();
for (let i = 1; i <= 8; i++) { await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2 - i * 25); await p.waitForTimeout(16); }
await p.screenshot({ path: `${out}/swipe-mid.png` });
await p.mouse.up(); await p.waitForTimeout(800);
log("after swipe:", await state());

await p.getByRole("button", { name: "Open Socials" }).click(); await p.waitForTimeout(500);
await p.screenshot({ path: `${out}/folder.png` });
log("folder:", await state());
await p.keyboard.press("Escape"); await p.waitForTimeout(400);

await p.keyboard.press("Meta+k"); await p.waitForTimeout(100);
await p.keyboard.type("veo"); await p.waitForTimeout(100);
await p.screenshot({ path: `${out}/spotlight.png` });
await p.keyboard.press("Enter"); await p.waitForTimeout(900);
log("spotlight enter:", await state());
await p.screenshot({ path: `${out}/course-detail.png` });
await p.keyboard.press("Escape"); await p.waitForTimeout(500);
log("esc from detail:", await state());
await p.keyboard.press("Escape"); await p.waitForTimeout(700);
log("esc again:", await state());

// deep link
const p2 = await ctx.newPage();
await p2.goto(base + "/#platforms", { waitUntil: "networkidle" }); await p2.waitForTimeout(600);
await p2.screenshot({ path: `${out}/deeplink.png` });
log("deep link:", await p2.evaluate(() => location.hash), await p2.title());
await p2.keyboard.press("Escape"); await p2.waitForTimeout(700);
log("deep link esc:", await p2.evaluate(() => location.hash));


// contact form: validation, then graceful fallback when no RESEND_API_KEY
const p3 = await ctx.newPage();
p3.on("pageerror", (e) => errors.push(e.message));
await p3.goto(base + "/#contact", { waitUntil: "networkidle" }); await p3.waitForTimeout(700);
await p3.getByRole("button", { name: "Send message" }).click(); await p3.waitForTimeout(200);
log("contact empty submit: alerts", await p3.locator('[role=alert]').count(), "focused:", await p3.evaluate(() => document.activeElement?.id));
await p3.fill("#contact-email", "not-an-email"); await p3.getByRole("button", { name: "Send message" }).click(); await p3.waitForTimeout(150);
log("bad email focused:", await p3.evaluate(() => document.activeElement?.id));
await p3.fill("#contact-email", "test@example.com"); await p3.fill("#contact-name", "Test Person");
await p3.fill("#contact-subject", "Hello there"); await p3.fill("#contact-message", "This is a local test message.");
const [resp] = await Promise.all([p3.waitForResponse("**/api/contact"), p3.getByRole("button", { name: "Send message" }).click()]);
await p3.waitForTimeout(400);
log("contact POST:", resp.status(), "fallback shown:", await p3.getByText("email me directly").count());
await p3.screenshot({ path: `${out}/contact-fallback.png` });

// expertise sheet + Esc, settings toggles + profile push
await p3.goto(base + "/#expertise", { waitUntil: "networkidle" }); await p3.waitForTimeout(700);
await p3.getByRole("button", { name: /Prompt Engineering/ }).click(); await p3.waitForTimeout(500);
log("expertise sheet:", await p3.evaluate(() => location.hash), await p3.getByRole("region", { name: "Expertise details" }).count());
await p3.keyboard.press("Escape"); await p3.waitForTimeout(500);
log("sheet esc:", await p3.evaluate(() => location.hash), await p3.getByRole("region", { name: "Expertise details" }).count());
await p3.goto(base + "/#settings", { waitUntil: "networkidle" }); await p3.waitForTimeout(700);
await p3.getByRole("switch", { name: "Dark mode" }).click(); await p3.waitForTimeout(700);
log("dark switch:", await p3.evaluate(() => document.documentElement.classList.contains("dark")));
await p3.getByRole("radio", { name: "Light", exact: true }).click(); await p3.waitForTimeout(700);
log("light radio:", await p3.evaluate(() => document.documentElement.classList.contains("dark")));
await p3.getByRole("switch", { name: "Reduce motion" }).click();
await p3.getByRole("switch", { name: "Larger text" }).click();
await p3.getByRole("radio", { name: "Dusk" }).click();
await p3.getByRole("dialog").getByRole("radio", { name: "Chai" }).click(); await p3.waitForTimeout(300);
log("prefs:", await p3.evaluate(() => [document.documentElement.hasAttribute("data-reduce-motion"), document.documentElement.dataset.text, document.documentElement.dataset.finish, localStorage.getItem("pp-wallpaper")]));
await p3.screenshot({ path: `${out}/settings-prefs.png` });
await p3.reload({ waitUntil: "networkidle" }); await p3.waitForTimeout(500);
log("prefs after reload:", await p3.evaluate(() => [document.documentElement.hasAttribute("data-reduce-motion"), document.documentElement.dataset.text, document.documentElement.dataset.finish]));
await p3.getByRole("button", { name: /Personal info/ }).first().click(); await p3.waitForTimeout(500);
log("profile push:", await p3.evaluate(() => location.hash));
await p3.goBack(); await p3.waitForTimeout(500);
log("profile back:", await p3.evaluate(() => location.hash));

log(errors.length ? "ERRORS:\n" + errors.join("\n") : "no console errors");
await b.close();
