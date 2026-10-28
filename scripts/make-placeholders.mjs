// Sample images for the template: simple SVG cards rasterised to WebP with sharp.
// Usage: node scripts/make-placeholders.mjs  (overwrites the sample files in public/content)
// Replace them with your own images, same names or new ones referenced from /content.
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import sharp from "sharp";

const out = "public/content";

function card({ w, h, from, to, title, label }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  <circle cx="${w * 0.82}" cy="${h * 0.18}" r="${h * 0.42}" fill="#fff" fill-opacity="0.10"/>
  <circle cx="${w * 0.12}" cy="${h * 0.95}" r="${h * 0.32}" fill="#000" fill-opacity="0.10"/>
  <text x="${w * 0.07}" y="${h * 0.56}" font-family="Helvetica, Arial, sans-serif" font-size="${h * 0.12}" font-weight="700" fill="#fff">${title}</text>
  <text x="${w * 0.07}" y="${h * 0.7}" font-family="Helvetica, Arial, sans-serif" font-size="${h * 0.055}" fill="#fff" fill-opacity="0.8">${label}</text>
</svg>`;
}

function avatar(size, initials) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffcf5a"/><stop offset="1" stop-color="#ff7a3d"/></linearGradient></defs>
  <rect width="${size}" height="${size}" fill="url(#g)"/>
  <circle cx="${size / 2}" cy="${size * 0.4}" r="${size * 0.17}" fill="#fff" fill-opacity="0.9"/>
  <ellipse cx="${size / 2}" cy="${size * 0.92}" rx="${size * 0.33}" ry="${size * 0.27}" fill="#fff" fill-opacity="0.9"/>
  <text x="${size / 2}" y="${size * 0.47}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="${size * 0.13}" font-weight="700" fill="#ff7a3d">${initials}</text>
</svg>`;
}

const files = [
  ["profile.webp", avatar(480, "AR")],
  ["courses/your-first-course.webp", card({ w: 1280, h: 720, from: "#4f7cff", to: "#1b2fb8", title: "Your Course Title", label: "Sample course image · 16:9" })],
  ["courses/prompting-basics.webp", card({ w: 1280, h: 720, from: "#9b6bff", to: "#4b25c9", title: "Prompting Basics", label: "Sample course image · 16:9" })],
  ["courses/short-videos.webp", card({ w: 1280, h: 720, from: "#ff7a5c", to: "#c2261f", title: "Short AI Videos", label: "Sample course image · 16:9" })],
  ["courses/calm-notes.webp", card({ w: 1280, h: 720, from: "#37c98b", to: "#11724a", title: "A Calm Notes System", label: "Sample course image · 16:9" })],
  ["blog/sample-post-1.webp", card({ w: 1200, h: 675, from: "#ffb04d", to: "#e8551f", title: "Sample Post One", label: "Sample blog image · 16:9" })],
  ["blog/sample-post-2.webp", card({ w: 1200, h: 675, from: "#47b8ff", to: "#155fd0", title: "Sample Post Two", label: "Sample blog image · 16:9" })],
  ["blog/sample-post-3.webp", card({ w: 1200, h: 675, from: "#ff6fae", to: "#b5236a", title: "Sample Post Three", label: "Sample blog image · 16:9" })],
  ["projects/sample-app.webp", card({ w: 1280, h: 800, from: "#5b8cff", to: "#2340b8", title: "Sample App", label: "Sample project screenshot · 16:10" })],
  ["projects/sample-site.webp", card({ w: 1280, h: 800, from: "#2fc48a", to: "#0f6b47", title: "Sample Website", label: "Sample project screenshot · 16:10" })],
  ["projects/sample-game.webp", card({ w: 1280, h: 800, from: "#ff7b52", to: "#b8301a", title: "Sample Game", label: "Sample project screenshot · 16:10" })],
];

for (const [name, svg] of files) {
  const path = join(out, name);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, await sharp(Buffer.from(svg)).webp({ quality: 82 }).toBuffer());
  console.log(path);
}
