// Initial JS shipped by the home page, gzipped (the budget is 200 KB). Run against a production server.
import { gzipSync } from "node:zlib";

const base = process.argv[2] ?? "http://localhost:3100";
const html = await (await fetch(base + "/")).text();
// noModule scripts (legacy polyfills) are never fetched by modern browsers
const srcs = [...new Set([...html.matchAll(/<script([^>]+)>/g)].filter((m) => !/nomodule/i.test(m[1])).map((m) => m[1].match(/src="([^"]+)"/)?.[1]).filter(Boolean))];
let total = 0;
const rows = [];
for (const src of srcs) {
  const body = Buffer.from(await (await fetch(new URL(src, base))).arrayBuffer());
  const gz = gzipSync(body, { level: 9 }).length;
  total += gz;
  rows.push([gz, src]);
}
const inline = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join("");
const inlineGz = gzipSync(Buffer.from(inline)).length;
rows.sort((a, b) => b[0] - a[0]).forEach(([gz, src]) => console.log(`${(gz / 1024).toFixed(1).padStart(7)} KB  ${src}`));
console.log(`${(inlineGz / 1024).toFixed(1).padStart(7)} KB  (inline scripts / RSC payload)`);
console.log(`total external: ${(total / 1024).toFixed(1)} KB gzipped across ${srcs.length} files (${total} B; budget ${200 * 1024} B)`);
