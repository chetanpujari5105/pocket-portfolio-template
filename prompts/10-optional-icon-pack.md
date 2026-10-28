Add an optional icon pack for my own apps. Keep the original icons as the fallback.

Pack: "iOS 18 App Icons • Free Resource" by David Akhmedbayev, Figma Community, CC BY 4.0.
My duplicated copy: {{FIGMA_FILE_LINK}}

1. Export the light-theme icons I map below as SVG (PNG at 3x only if one has raster
   effects). Use my logged-in Figma session through Claude in Chrome, or the Figma REST API
   if I put a read-only FIGMA_TOKEN in .env.local (never commit it). Never type my password.
   If a login or captcha appears, stop and tell me.
2. Mapping (my app -> pack icon): {{APP_1}} -> {{PACK_ICON_1}}, {{APP_2}} -> {{PACK_ICON_2}}, ...
   An app with no match keeps its original icon. Brand tiles (LinkedIn, X, YouTube and the
   rest) stay official. Check each export is the full icon on a clean squircle.
3. Save them to public/icons/ios18/ as 180x180 WebP under 20 KB each, full bleed (the site's
   squircle mask is the edge), plus a LICENSE.txt with the author, source link, CC BY 4.0
   and what you changed.
4. Draw them as the tile face everywhere an app icon appears: home, dock, folder previews,
   launch animation, app switcher, lock-screen notification, banner and the OG image. Keep the
   squircle mask, press dim, labels and spacing. Put it behind NEXT_PUBLIC_ICON_PACK=ios18;
   unset or "original" keeps today's icons.
5. Credit it in Settings -> About -> Credits and the README: "iOS 18 App Icons by David
   Akhmedbayev, CC BY 4.0, via Figma Community. iPhone and the app designs they depict are
   trademarks of Apple Inc."
6. Run lint, typecheck, build and tests with the pack on and off. Update the home screenshot
   baselines on purpose and say which ones changed.
