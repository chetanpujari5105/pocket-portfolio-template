import { profile } from "./profile";
import type { AppsLayout, Social } from "./schema";

const link = (id: Social["id"]) => profile.socials.find((s) => s.id === id)?.url ?? profile.site.url;

/*
 * Home screen layout. `icon` names a glyph in src/components/os/icons.tsx.
 * Items with `app` open that app (by hash); items with `href` open in a new tab.
 * ✏️ EDIT: labels, gradient colours and order. Brand links take their URL from profile.socials;
 * `brand` can be any social id (linkedin, x, instagram, substack, udemy, youtube, github).
 */
export const appsLayout = {
  // 2×2 block next to the "Work with me" widget
  block: [
    { id: "journey", label: "Journey", icon: "sprout", colors: ["#5fd38d", "#178a4c"], app: "journey" },
    { id: "expertise", label: "Expertise", icon: "sparkles", colors: ["#c08cff", "#6d3fe0"], app: "expertise" },
    { id: "platforms", label: "Platforms", icon: "globe", colors: ["#5cc8ff", "#1769d6"], app: "platforms" },
    { id: "reviews", label: "Reviews", icon: "star", colors: ["#ffd76a", "#f08a00"], app: "reviews" },
  ],
  row: [
    { id: "youtube", label: "YouTube", icon: "play", colors: ["#ff6a5c", "#d81f26"], href: profile.youtube, brand: "youtube" },
    { id: "socials", label: "Socials", icon: "folder", colors: ["#ffffff", "#ffffff"], app: "socials" },
    { id: "projects", label: "Projects", icon: "rocket", colors: ["#ff9a6b", "#e8451f"], app: "projects" },
    { id: "settings", label: "Settings", icon: "gear", colors: ["#b9bec7", "#6b717c"], app: "settings" },
  ],
  links: [
    { id: "linkedin", label: "LinkedIn", icon: "briefcase", colors: ["#0A66C2", "#0A66C2"], href: link("linkedin"), brand: "linkedin" },
    { id: "x", label: "X", icon: "at", colors: ["#000000", "#000000"], href: link("x"), brand: "x" },
  ],
  dock: [
    { id: "courses", label: "Courses", icon: "cap", colors: ["#6aa8ff", "#2747e0"], app: "courses" },
    { id: "blog", label: "Blog", icon: "newspaper", colors: ["#ffb36b", "#ff6a1f"], app: "blog" },
    { id: "services", label: "Services", icon: "bolt", colors: ["#ffd84d", "#f29f00"], app: "services" },
    { id: "contact", label: "Contact", icon: "plane", colors: ["#6fe3d0", "#0e9b8a"], app: "contact" },
  ],
  // ✏️ EDIT: app titles (browser tab: "<title> · <your name>")
  titles: {
    courses: "Courses",
    journey: "Journey",
    expertise: "Expertise",
    platforms: "Platforms",
    projects: "Projects",
    blog: "Blog",
    reviews: "Reviews",
    services: "Services",
    contact: "Contact",
    settings: "Settings",
    socials: "Socials",
    ask: `Ask ${profile.firstName}`,
  },
} satisfies AppsLayout;

/** Optional AI app, shown only when NEXT_PUBLIC_ENABLE_ASK=true */
export const askApp = {
  id: "ask",
  label: `Ask ${profile.firstName}`,
  icon: "chat",
  colors: ["#7ef0c0", "#1aa67a"] as [string, string],
  app: "ask" as const,
};
