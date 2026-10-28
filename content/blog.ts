import type { BlogPost } from "./schema";

// ✏️ EDIT: your Substack (or any RSS 2.0) feed, like "https://<name>.substack.com/feed".
// Leave it empty and the Blog app shows the posts below.
export const substackFeed = "";

/** Shown when there's no feed, or it can't be reached. ✏️ EDIT: 2–3 of your posts. */
export const fallbackPosts: BlogPost[] = [
  {
    date: "2026-03-10",
    title: "Sample Post: Three Habits That Make Learning Stick",
    subtitle: "Sample subtitle: one line that makes people want to read.",
    image: "/content/blog/sample-post-1.webp",
    url: "https://example.com/blog/sample-post-1",
  },
  {
    date: "2026-02-02",
    title: "Sample Post: My Simple Design Checklist",
    subtitle: "Sample subtitle: what I check before I share any design.",
    image: "/content/blog/sample-post-2.webp",
    url: "https://example.com/blog/sample-post-2",
  },
  {
    date: "2026-01-05",
    title: "Sample Post: What I Learned From My First Course",
    subtitle: "Sample subtitle: the honest version.",
    image: "/content/blog/sample-post-3.webp",
    url: "https://example.com/blog/sample-post-3",
  },
];
