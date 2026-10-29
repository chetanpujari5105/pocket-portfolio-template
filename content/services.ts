import type { Service } from "./schema";

export const servicesTitle = "Services"; // ✏️ EDIT: title of the Services app
export const servicesIntro = "Sample intro: one friendly sentence about who you work with."; // ✏️ EDIT
/** Under the list, above its single Contact row */
export const servicesFooter = "Not sure which one fits? Tell me what you need."; // ✏️ EDIT

/*
 * ✏️ EDIT: what people can hire you for. `title` is the subject the Contact form opens with.
 * `summary` is one line under the title; `points` (3–5) are the detail screen's "What you get";
 * `goodFor` says who it suits; `tools` is optional. Services with a `chip` appear on the home
 * screen's "Work with me" widget (2–3 is best). Each id's tile is in components/apps/service-tile.tsx.
 */
export const services: Service[] = [
  {
    id: "design",
    title: "Design",
    summary: "Sample: interfaces that feel simple.",
    description: "Sample description: what you deliver, for whom, and what makes it good.",
    points: ["Sample point: a clear first draft", "Sample point: two rounds of changes", "Sample point: files ready for developers"],
    goodFor: "Sample: small teams and new products.",
    tools: { label: "Made with", items: ["Figma"] },
    chip: "Design",
  },
  {
    id: "websites",
    title: "Websites",
    summary: "Sample: fast sites for every screen.",
    description: "Sample description: fast, simple websites that look good on every screen.",
    points: ["Sample point: responsive on every screen", "Sample point: fast to load", "Sample point: easy to update"],
    goodFor: "Sample: anyone who needs a website that works.",
    tools: { label: "Built with", items: ["Next.js", "Vercel"] },
    chip: "Websites",
  },
  {
    id: "automation",
    title: "AI Setup",
    summary: "Sample: AI tools that save time.",
    description: "Sample description: set up AI tools and small automations for a team.",
    points: ["Sample point: pick the right tools", "Sample point: set them up with you", "Sample point: a short how-to for the team"],
    goodFor: "Sample: teams with repetitive work.",
    chip: "AI Setup",
  },
  {
    id: "workshops",
    title: "Workshops",
    summary: "Sample: hands-on sessions for groups.",
    description: "Sample description: hands-on sessions for schools, teams and events.",
    points: ["Sample point: a plan agreed up front", "Sample point: hands-on exercises", "Sample point: notes to keep"],
    goodFor: "Sample: schools, teams and events.",
  },
];
