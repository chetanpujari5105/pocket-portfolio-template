Add an optional icon pack for my own apps. The template already supports one: src/lib/icon-pack.ts
maps each app to an image in public/icons/ios18/ and NEXT_PUBLIC_ICON_PACK=ios18 turns it on
(unset or "original" keeps the template's own icons). No pack images ship with the template.

Pack: {{PACK_NAME}} by {{PACK_AUTHOR}}, licence {{PACK_LICENCE}}, from {{PACK_LINK}}.
(For example the free "iOS 18 App Icons" pack on the Figma Community, CC BY 4.0. Stop and tell me
if the licence doesn't allow use on a public website, or if you can't find it.)

1. Export the icons in the mapping below as 180x180 images. Use my logged-in Figma session through
   Claude in Chrome, or the Figma REST API if I put a read-only FIGMA_TOKEN in .env.local (never
   commit it). Never type my password. If a login, passkey or captcha appears, stop and tell me.
2. Mapping (my app -> pack icon -> file name expected by src/lib/icon-pack.ts):
   courses -> {{ICON}} -> books, journey -> {{ICON}} -> maps, expertise -> {{ICON}} -> tips,
   platforms -> {{ICON}} -> app-store, reviews -> {{ICON}} -> photos, projects -> {{ICON}} -> files,
   settings -> {{ICON}} -> settings, blog -> {{ICON}} -> notes, services -> {{ICON}} -> wallet,
   contact -> {{ICON}} -> mail. An app with no match keeps its original icon (remove its line
   from IOS18 in src/lib/icon-pack.ts). Brand tiles (LinkedIn, X, YouTube and the rest) stay official.
3. Save them to public/icons/ios18/<file>.webp, 180x180, under 20 KB each, full bleed (the site's
   squircle mask is the edge), plus a LICENSE.txt with the author, source link, licence and what
   you changed.
4. Set NEXT_PUBLIC_ICON_PACK=ios18 in .env.local and in Vercel. Put the credit the licence asks for
   into Settings -> Credits (ICON_CREDIT in src/components/apps/settings.tsx), e.g.
   "App icons: <pack> by <author>, <licence>, via <source>."
5. Run lint, typecheck, build and tests with the pack on and off (NEXT_PUBLIC_ICON_PACK set for the
   build and for playwright). Update the home screenshot baselines on purpose and say which changed.
