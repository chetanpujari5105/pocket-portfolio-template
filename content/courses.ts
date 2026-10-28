import type { Course, CourseCategory } from "./schema";

// ✏️ EDIT: the filter chips in the Courses app. To add a category, also add it to
// CourseCategorySchema in schema.ts.
export const courseCategories: CourseCategory[] = ["AI Video", "AI & Prompting", "Design", "Productivity"];

// ✏️ EDIT: your courses (or products, workshops, talks). Exactly one needs `featured: true`.
// Images go in public/content/courses/<id>.webp at 16:9. Write blurbs from facts only: no invented ratings.
export const courses = [
  {
    id: "your-first-course", // ✏️ EDIT: short, URL-safe id (it becomes #courses/your-first-course)
    title: "Your Course Title: Start Here", // ✏️ EDIT
    platform: "Udemy", // ✏️ EDIT: where it's sold
    badge: "BESTSELLER", // ✏️ EDIT: a short label, or "NEW"
    category: "Design", // ✏️ EDIT: one of courseCategories
    image: "/content/courses/your-first-course.webp", // ✏️ EDIT
    url: "https://example.com/courses/your-first-course", // ✏️ EDIT: the enroll link (with your referral code, if any)
    featured: true,
    blurb: "Sample blurb: one sentence about what people learn.", // ✏️ EDIT
    audience: "Sample audience: who this course is for.", // ✏️ EDIT
  },
  {
    id: "prompting-basics",
    title: "Sample Course: Prompting Basics",
    platform: "Udemy",
    badge: "HIGHEST RATED",
    category: "AI & Prompting",
    image: "/content/courses/prompting-basics.webp",
    url: "https://example.com/courses/prompting-basics",
    featured: false,
    blurb: "Sample blurb: write clearer prompts and get better answers.",
    audience: "Sample audience: anyone who uses AI chat tools at work.",
  },
  {
    id: "short-videos",
    title: "Sample Course: Short AI Videos",
    platform: "Skillshare",
    badge: "NEW",
    category: "AI Video",
    image: "/content/courses/short-videos.webp",
    url: "https://example.com/courses/short-videos",
    featured: false,
    blurb: "Sample blurb: plan, generate and edit a 30-second video.",
    audience: "Sample audience: creators who want video without filming.",
  },
  {
    id: "calm-notes",
    title: "Sample Course: A Calm Notes System",
    platform: "Udemy",
    badge: "POPULAR",
    category: "Productivity",
    image: "/content/courses/calm-notes.webp",
    url: "https://example.com/courses/calm-notes",
    featured: false,
    blurb: "Sample blurb: one simple system for notes, tasks and projects.",
    audience: "Sample audience: students and busy professionals.",
  },
] satisfies Course[];

export type CourseId = (typeof courses)[number]["id"];
