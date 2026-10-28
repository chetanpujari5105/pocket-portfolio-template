// Usage: node scripts/optimize-images.mjs <srcDir> <destDir> [maxWidth=1200]
// Converts every .jpg/.png under srcDir to WebP under destDir (same relative path).
import sharp from "sharp";
import { readdir, mkdir } from "node:fs/promises";
import { join, relative, dirname, extname } from "node:path";

const [src, dest, max = "1200"] = process.argv.slice(2);
async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (/\.(jpe?g|png)$/i.test(e.name)) yield p;
  }
}
for await (const file of walk(src)) {
  const out = join(dest, relative(src, file)).replace(extname(file), ".webp");
  await mkdir(dirname(out), { recursive: true });
  const info = await sharp(file).rotate().resize({ width: Number(max), withoutEnlargement: true }).webp({ quality: 78 }).toFile(out);
  console.log(out, `${info.width}x${info.height}`, `${Math.round(info.size / 1024)}KB`);
}
