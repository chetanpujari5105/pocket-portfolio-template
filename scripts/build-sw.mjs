// Bundles sw/sw.ts into public/sw.js after `next build`, with the precache list (the start page,
// fonts, icons) injected where the worker reads self.__SW_MANIFEST. Revisions are content hashes,
// so an unchanged file is never downloaded twice. Usage: node scripts/build-sw.mjs
import { createHash } from "node:crypto";
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
// Fonts (next/font output); hashed file names, so the URL is the revision
for (const file of walk(".next/static/media").filter((f) => /\.(woff2?)$/.test(f)))
  entries.push({ url: `/_next/static/${relative(".next/static", file)}`, revision: null });
// Icons and the web app manifest's images
for (const file of walk("public/icons")) entries.push({ url: `/${relative("public", file)}`, revision: hash(readFileSync(file)) });
// The start page: revisioned per build, so each deploy refreshes the offline copy
const buildId = readFileSync(".next/BUILD_ID", "utf8").trim();
entries.push({ url: "/", revision: buildId });

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
console.log(`public/sw.js: ${entries.length} precached files (build ${buildId})`);
