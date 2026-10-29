// Bundles sw/sw.ts into public/sw.js before `next build` (Vercel's build adapter collects public/
// during the build, so a file written afterwards never ships), with the precache list (the start
// page and icons) injected where the worker reads self.__SW_MANIFEST. Fonts and chunks need no
// list: they are cache-first under /_next/static, and the first visit copies them in (sw-register).
// Usage: node scripts/build-sw.mjs
import { createHash, randomUUID } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { build } from "esbuild";

const hash = (buf) => createHash("sha256").update(buf).digest("hex").slice(0, 16);
const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

const entries = [];
// Icons and the web app manifest's images
for (const file of walk("public/icons").filter((f) => !f.endsWith(".txt"))) entries.push({ url: `/${relative("public", file)}`, revision: hash(readFileSync(file)) });
// The start page: revisioned per deploy (the commit on Vercel), so each one refreshes the offline copy
const revision = process.env.VERCEL_GIT_COMMIT_SHA ?? randomUUID();
entries.push({ url: "/", revision });

await build({
  entryPoints: ["sw/sw.ts"],
  outfile: "public/sw.js",
  bundle: true,
  format: "esm",
  minify: true,
  target: "es2020",
  define: { "self.__SW_MANIFEST": JSON.stringify(entries), "process.env.NODE_ENV": '"production"' },
  logLevel: "warning",
});
console.log(`public/sw.js: ${entries.length} precached files (revision ${revision.slice(0, 12)})`);
