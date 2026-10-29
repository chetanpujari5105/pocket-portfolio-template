import type { Project } from "./schema";

// ✏️ EDIT: things you've built. Images go in public/content/projects/<id>.webp at 16:10.
// `category` is one of "Apps", "Games", "Web". Exactly one project is `featured: true` (the big card).
// `url: null` lists a project with nothing public to open yet; `status` is an optional line under
// its tagline ("Closed beta", "In the App Store review queue"). Taglines show in narrow rows: keep
// them under ~30 characters.
export const projects: Project[] = [
  {
    id: "sample-app",
    name: "Sample App",
    tagline: "Sample: what it does",
    description: "Sample description: who it's for and what problem it solves, in one or two sentences.",
    category: "Apps",
    url: "https://example.com/projects/sample-app",
    status: "Sample status: public beta",
    image: "/content/projects/sample-app.webp",
    stack: ["Next.js", "Vercel"],
    color: "#5b8cff",
    featured: true,
  },
  {
    id: "sample-site",
    name: "Sample Website",
    tagline: "Sample: a site for a client",
    description: "Sample description: what you designed and built.",
    category: "Web",
    url: "https://example.com/projects/sample-site",
    image: "/content/projects/sample-site.webp",
    stack: ["HTML", "CSS"],
    color: "#1f9d6b",
    featured: false,
  },
  {
    id: "sample-game",
    name: "Sample Game",
    tagline: "Sample: a small browser game",
    description: "Sample description: what makes it fun. This one has no public link yet, so it opens nowhere.",
    category: "Games",
    url: null,
    status: "Sample status: in development",
    image: "/content/projects/sample-game.webp",
    stack: ["three.js"],
    color: "#e8451f",
    featured: false,
  },
];
