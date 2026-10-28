// Chrome performance trace of a phone visit on a 4× CPU / "Fast 4G" profile:
// cold load → tap Journey → close → tap Courses → close → tap Blog.
// Writes the raw trace and prints where the time goes after each tap (tasks, JS by function,
// script fetches, style/layout/paint).
// Usage: node scripts/speed-trace.mjs [baseUrl] [outDir]
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3100";
const outDir = process.argv[3] ?? "screenshots/speed";
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 392, height: 690 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
await ctx.addInitScript(() => sessionStorage.setItem("pp-unlocked", "1"));
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
await cdp.send("Network.enable");
await cdp.send("Network.emulateNetworkConditions", {
  offline: false,
  latency: 60,
  downloadThroughput: (9 * 1024 * 1024) / 8,
  uploadThroughput: (1.5 * 1024 * 1024) / 8,
});

await browser.startTracing(page, {
  categories: [
    "devtools.timeline",
    "disabled-by-default-devtools.timeline",
    "v8.execute",
    "disabled-by-default-v8.cpu_profiler",
    "blink.user_timing",
    "loading",
  ],
});

const marks = [];
const mark = async (label) => marks.push({ label, at: await page.evaluate(() => performance.timeOrigin + performance.now()) });

await page.goto(base + "/", { waitUntil: "load" });
await mark("load");
await page.waitForFunction(() => document.documentElement.hasAttribute("data-awake"));
await page.waitForTimeout(2000);

for (const app of ["journey", "courses", "blog"]) {
  const icon = page.locator(`[data-icon-tile="${app}"]`).first();
  for (let i = 0; i < 3 && !(await icon.isVisible()); i++) {
    await page.getByRole("button", { name: /^Page \d+ of \d+$/ }).nth(i + 1).click();
    await page.waitForTimeout(500);
  }
  await mark(`tap ${app}`);
  await icon.click();
  await page.waitForTimeout(1500);
  if (app !== "blog") {
    await mark(`close ${app}`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(1200);
  }
}
const trace = await browser.stopTracing();
writeFileSync(`${outDir}/trace.json`, trace);
await browser.close();

/* ───── Analysis: what runs in the 600 ms after each tap ───── */
const events = JSON.parse(trace.toString()).traceEvents;
// Trace clock (µs) ↔ wall clock: anchor on the navigation start of the page
const nav = events.find((e) => e.name === "navigationStart" && e.args?.data?.isLoadingMainFrame);
const loadMark = marks[0].at;
const domLoad = events.find((e) => e.name === "MarkLoad" || e.name === "loadEventEnd");
void domLoad;
// Use the first "tap" click EventDispatch in the trace as the anchor for each tap instead
const clicks = events.filter((e) => e.name === "EventDispatch" && e.args?.data?.type === "click").sort((a, b) => a.ts - b.ts);
const mainPid = clicks[0]?.pid;
const mainTid = clicks[0]?.tid;
void nav;
void loadMark;

// CPU profile samples → self time by function
const profileNodes = new Map();
const samples = [];
for (const e of events) {
  if (e.name !== "ProfileChunk" || e.pid !== mainPid) continue;
  const d = e.args?.data?.cpuProfile;
  if (!d) continue;
  for (const n of d.nodes ?? []) profileNodes.set(n.id, n.callFrame);
  const deltas = e.args.data.timeDeltas ?? [];
  let t = samples.length ? samples.at(-1).ts : (events.find((x) => x.name === "Profile" && x.pid === mainPid)?.args?.data?.startTime ?? e.ts);
  (d.samples ?? []).forEach((id, i) => {
    t += deltas[i] ?? 0;
    samples.push({ ts: t, id });
  });
}

const report = [];
for (const click of clicks) {
  const from = click.ts;
  const to = from + 600_000;
  const inWindow = (e) => e.pid === mainPid && e.tid === mainTid && e.ts >= from && e.ts < to;
  const tasks = events.filter((e) => inWindow(e) && e.name === "RunTask" && e.dur > 5000).map((e) => ({ at: Math.round((e.ts - from) / 1000), ms: Math.round(e.dur / 1000) }));
  const sum = (name) => Math.round(events.filter((e) => inWindow(e) && e.name === name).reduce((a, e) => a + (e.dur ?? 0), 0) / 1000);
  const fetched = events
    .filter((e) => e.name === "ResourceSendRequest" && e.ts >= from && e.ts < to)
    .map((e) => e.args.data.url.split("/").pop());
  const self = new Map();
  for (let i = 0; i < samples.length - 1; i++) {
    const s = samples[i];
    if (s.ts < from || s.ts >= to) continue;
    const f = profileNodes.get(s.id);
    if (!f || f.functionName === "(idle)" || f.functionName === "(program)") continue;
    const key = `${f.functionName || "(anon)"} ${f.url ? f.url.split("/").pop() : ""}:${f.lineNumber}`;
    self.set(key, (self.get(key) ?? 0) + (samples[i + 1].ts - s.ts) / 1000);
  }
  const top = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => `${v.toFixed(1)}ms ${k}`);
  report.push({
    click: Math.round(click.dur / 1000) + "ms in the click handler",
    tasksOver5ms: tasks,
    scripting: sum("FunctionCall") + sum("EvaluateScript") + sum("v8.compile"),
    style: sum("UpdateLayoutTree"),
    layout: sum("Layout"),
    paint: sum("Paint") + sum("PaintImage"),
    gc: sum("MinorGC") + sum("MajorGC") + sum("V8.GC_SCAVENGER"),
    fetched,
    topSelfTime: top,
  });
}
writeFileSync(`${outDir}/trace-summary.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
