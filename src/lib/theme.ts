export type Theme = "light" | "dark";
export type Finish = "electric" | "graphite" | "chai";

export const THEME_KEY = "pp-theme";
export const FINISH_KEY = "pp-finish";

export const FINISHES: readonly Finish[] = ["electric", "graphite", "chai"];

/** Desktop stage where the 3D phone is the default (WebGL is checked later, on the client). */
export const STAGE_3D_QUERY = "(min-width: 900px) and (min-height: 520px) and (prefers-reduced-motion: no-preference)";

/** Phone mode: the site is the phone (no drawn frame). Matches the CSS in globals.css. */
export const PHONE_QUERY = "(max-width: 599.98px), (max-height: 519.98px)";

/**
 * Events that mean someone is there, so the 3D stage is worth loading. The init script notes the
 * first one as `html[data-intent]` even before hydration.
 */
export const STAGE_INTENT = ["pointermove", "pointerdown", "wheel", "keydown", "touchstart"];

/**
 * Runs in <head> before first paint: tracks the visual viewport (--vvh / --vvt: the height mobile
 * browsers leave between their toolbars and above the keyboard), applies the saved (or system) theme and
 * the saved phone finish so neither flashes, skips the lock screen for deep links
 * and repeat visits this session, and holds the CSS phone back briefly on desktop
 * so the 3D phone can make the entrance. Kept dependency-free on purpose.
 */
export function buildInitScript(appIds: readonly string[]) {
  return `(function(){var d=document.documentElement;try{var v=window.visualViewport;if(v){var u=function(){if(Math.abs(v.scale-1)>0.01)return;d.style.setProperty("--vvh",v.height+"px");d.style.setProperty("--vvt",v.offsetTop+"px")};u();v.addEventListener("resize",u);v.addEventListener("scroll",u)}}catch(e){}try{var h=location.hash.slice(1).split("/")[0];if(${JSON.stringify(appIds)}.indexOf(h)>-1){d.setAttribute("data-deeplink","");d.setAttribute("data-unlocked","")}}catch(e){}try{if(sessionStorage.getItem("pp-unlocked")==="1")d.setAttribute("data-unlocked","")}catch(e){}try{var t=localStorage.getItem("${THEME_KEY}");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}d.classList.toggle("dark",t==="dark");var f=localStorage.getItem("${FINISH_KEY}");if(f==="graphite"||f==="chai")d.setAttribute("data-finish",f);if(localStorage.getItem("pp-text")==="large")d.setAttribute("data-text","large");var r=localStorage.getItem("pp-motion")==="reduce";if(r)d.setAttribute("data-reduce-motion","");if(!r&&matchMedia("${STAGE_3D_QUERY}").matches){d.setAttribute("data-stage-wait","");var n=${JSON.stringify(STAGE_INTENT)},k=function(){d.setAttribute("data-intent","");n.forEach(function(x){removeEventListener(x,k,true)})};n.forEach(function(x){addEventListener(x,k,{capture:true,passive:true})})}}catch(e){}})()`;
}

export function readStored<T extends string>(
  key: string,
  allowed: readonly T[],
): T | null {
  try {
    const value = localStorage.getItem(key);
    return allowed.includes(value as T) ? (value as T) : null;
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private mode or blocked storage: the choice just won't persist.
  }
}

export function currentTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  writeStored(THEME_KEY, theme);
}

/**
 * Switches theme with a circular reveal that grows from `origin` when the
 * View Transitions API exists and motion is allowed; otherwise switches instantly.
 */
export function setThemeWithReveal(
  theme: Theme,
  origin?: { x: number; y: number },
) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!document.startViewTransition || reduce || !origin) {
    applyTheme(theme);
    return;
  }

  const { x, y } = origin;
  const radius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );

  const transition = document.startViewTransition(() => applyTheme(theme));
  transition.ready
    .then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${radius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 520,
          easing: "cubic-bezier(0.32, 0.72, 0, 1)",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    })
    .catch(() => {});
}

export function applyFinish(finish: Finish) {
  const root = document.documentElement;
  if (finish === "electric") root.removeAttribute("data-finish");
  else root.setAttribute("data-finish", finish);
  writeStored(FINISH_KEY, finish);
}
