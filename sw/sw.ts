/// <reference lib="webworker" />
import { CacheFirst, ExpirationPlugin, NetworkFirst, Serwist, StaleWhileRevalidate, type PrecacheEntry } from "serwist";

/*
 * The service worker (built by scripts/build-sw.mjs before `next build`, served as /sw.js; never in dev).
 * - Pages: network first (fresh HTML and a deploy's new chunks), the last copy offline or past 3 s.
 * - /_next/static: cache first. Hashed and immutable, so once the app's chunks have been fetched
 *   (the home screen prefetches every app at idle) a repeat visit runs entirely from the cache.
 * - Images, the Substack feed: stale-while-revalidate, refreshed in the background.
 * - Precached at install: the start page and icons.
 * A new deploy's worker takes over at once (skipWaiting + clientsClaim) and drops old precaches.
 */

declare const self: ServiceWorkerGlobalScope & { __SW_MANIFEST: (PrecacheEntry | string)[] };

const DAY = 24 * 60 * 60;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: { cleanupOutdatedCaches: true },
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ request }) => request.mode === "navigate",
      handler: new NetworkFirst({
        cacheName: "pages",
        networkTimeoutSeconds: 3,
        plugins: [new ExpirationPlugin({ maxEntries: 8, maxAgeSeconds: 7 * DAY })],
      }),
    },
    {
      matcher: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/_next/static/"),
      handler: new CacheFirst({
        cacheName: "static",
        plugins: [new ExpirationPlugin({ maxEntries: 300, maxAgeSeconds: 60 * DAY })],
      }),
    },
    {
      // Optimised images: thumbnails, avatars, the latest YouTube video and blog covers
      matcher: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/_next/image"),
      handler: new StaleWhileRevalidate({
        cacheName: "images",
        plugins: [new ExpirationPlugin({ maxEntries: 150, maxAgeSeconds: 30 * DAY })],
      }),
    },
    {
      // The Substack feed refresh; GitHub and YouTube data arrive inside the page itself
      matcher: ({ url, sameOrigin }) => sameOrigin && url.pathname === "/api/feed",
      handler: new StaleWhileRevalidate({
        cacheName: "feed",
        plugins: [new ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 7 * DAY })],
      }),
    },
    {
      matcher: ({ url, sameOrigin }) => sameOrigin && /^\/(icons\/|content\/|icon\.svg|apple-icon|manifest\.webmanifest)/.test(url.pathname),
      handler: new StaleWhileRevalidate({ cacheName: "assets" }),
    },
  ],
});

serwist.addEventListeners();
