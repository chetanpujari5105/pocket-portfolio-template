"use client";

import { useEffect, useState, useSyncExternalStore, type ComponentType } from "react";

/*
 * A code-split component that never suspends. `next/dynamic` loads a chunk on first render and
 * shows its fallback through Suspense, which React holds back for ~300 ms, so a launch that
 * mounts a window and its app in the same frame stalls on it. Here the chunk is fetched ahead
 * (`preload()`, at idle or on pointerdown) and, once it has arrived, renders synchronously in
 * the very first frame; if it is still on its way, `Fallback` shows and the component swaps in
 * the moment it lands, wrapped in `arriveClassName` (a fade) so it doesn't cut in.
 */
export type Lazy<P> = ComponentType<P> & { preload: () => Promise<void> };

export function lazyComponent<P extends object>(
  load: () => Promise<ComponentType<P>>,
  Fallback?: ComponentType,
  arriveClassName?: string,
): Lazy<P> {
  let Loaded: ComponentType<P> | null = null;
  let pending: Promise<void> | null = null;
  const listeners = new Set<() => void>();
  const subscribe = (fn: () => void) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  };
  const preload = () =>
    (pending ??= load().then(
      (component) => {
        Loaded = component;
        listeners.forEach((fn) => fn());
      },
      () => {
        // A failed fetch (offline, a deploy in between) is retried on the next preload
        pending = null;
      },
    ));

  function LazyComponent(props: P) {
    const Component = useSyncExternalStore(subscribe, () => Loaded, () => null);
    const [waited] = useState(() => !Loaded);
    useEffect(() => {
      if (!Loaded) void preload();
    }, []);
    if (!Component) return Fallback ? <Fallback /> : null;
    if (waited && arriveClassName)
      return (
        <div className={arriveClassName}>
          <Component {...props} />
        </div>
      );
    return <Component {...props} />;
  }
  return Object.assign(LazyComponent, { preload });
}

/** Runs `fn` once the main thread is quiet, within `timeout` ms. Returns a cancel function. */
export function whenIdle(fn: () => void, timeout = 1500) {
  // Safari before 18 has no requestIdleCallback
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(fn, { timeout });
    return () => window.cancelIdleCallback(id);
  }
  const id = setTimeout(fn, Math.min(timeout, 200));
  return () => clearTimeout(id);
}
