/*
 * The service worker (sw/sw.ts, built to public/sw.js) is registered once the page is idle, from
 * this small chunk rather than the first bundle.
 */

export async function registerWorker() {
  try {
    await navigator.serviceWorker.register("/sw.js");
    await warmCache();
  } catch {
    // No worker (private mode, blocked storage): the site works as a plain page
  }
}

/**
 * The chunks this first visit fetched before the service worker took over go into its cache too
 * (straight from the HTTP cache), so the very next visit runs offline-fast.
 */
async function warmCache() {
  await navigator.serviceWorker.ready;
  const urls = performance
    .getEntriesByType("resource")
    .map((entry) => entry.name)
    .filter((url) => url.startsWith(`${location.origin}/_next/static/`));
  const cache = await caches.open("static");
  await Promise.all(urls.map((url) => cache.match(url).then((hit) => (hit ? undefined : cache.add(url))).catch(() => {})));
}
