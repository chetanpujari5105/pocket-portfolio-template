import type { Expertise } from "./schema";

// ✏️ EDIT: what you're good at. relatedCourses / relatedServices cross-link to ids in
// courses.ts and services.ts (the build fails with a clear message if an id doesn't exist).
export const expertise: Expertise[] = [
  {
    id: "design",
    emoji: "🎨",
    title: "Sample Skill: UI Design",
    tools: ["Figma", "Wireframing", "Prototyping"],
    relatedCourses: ["your-first-course"],
    relatedServices: ["design"],
  },
  {
    id: "ai",
    emoji: "🤖",
    title: "Sample Skill: AI Tools",
    tools: ["Prompting", "AI video", "Automation"],
    relatedCourses: ["prompting-basics", "short-videos"],
    relatedServices: ["automation"],
  },
  {
    id: "teaching",
    emoji: "📚",
    title: "Sample Skill: Teaching",
    tools: ["Curriculum design", "Workshops", "Video lessons"],
    relatedCourses: ["calm-notes"],
    relatedServices: ["workshops"],
  },
  {
    id: "web",
    emoji: "💻",
    title: "Sample Skill: Websites",
    tools: ["HTML", "CSS", "Vercel"],
    relatedCourses: [],
    relatedServices: ["websites"],
  },
];
