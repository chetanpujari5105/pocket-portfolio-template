import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3100);

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  // Each desktop page renders WebGL (3D phone + wallpaper); too many at once starve the GPU
  workers: process.env.CI ? 2 : 4,
  forbidOnly: !!process.env.CI,
  // One local retry absorbs GPU-contention timing under 4 parallel WebGL workers; it is reported as "flaky".
  retries: process.env.CI ? 2 : 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
    // Real GPU on macOS: the 3D phone and wallpaper shader crawl on the software renderer
    launchOptions: process.platform === "darwin" ? { args: ["--use-angle=metal", "--ignore-gpu-blocklist"] } : {},
  },
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.02, animations: "disabled" } },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "tablet", use: { ...devices["Desktop Chrome"], viewport: { width: 834, height: 1112 } } },
    { name: "phone", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, hasTouch: true } },
  ],
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
