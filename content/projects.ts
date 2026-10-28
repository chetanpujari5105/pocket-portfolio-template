import type { Project } from "./schema";

// ✏️ EDIT: things you've built. Images go in public/content/projects/<id>.webp at 16:10.
// `category` is one of "Apps", "Games", "Web". One project can be `featured: true`.
export const projects: Project[] = [
  {
    id: "sample-app",
    name: "Sample App",
    tagline: "Sample tagline: what it does in five words",
    description: "Sample description: who it's for and what problem it solves, in one or two sentences.",
    category: "Apps",
    url: "https://example.com/projects/sample-app",
    image: "/content/projects/sample-app.webp",
    stack: ["Next.js", "Vercel"],
    color: "#5b8cff",
    featured: true,
  },
  {
    id: "sample-site",
    name: "Sample Website",
    tagline: "Sample tagline: a site for a client",
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
    tagline: "Sample tagline: a small browser game",
    description: "Sample description: what makes it fun.",
    category: "Games",
    url: "https://example.com/projects/sample-game",
    image: "/content/projects/sample-game.webp",
    stack: ["three.js"],
    color: "#e8451f",
    featured: false,
  },
];
