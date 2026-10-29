import type { Review, ReviewSource } from "./schema";

/*
 * ✏️ EDIT: reviews of your work, copied word for word from the platform where people left them
 * (Udemy, Google, Fiverr, Upwork, …). Never write, edit or "improve" a review, and never invent
 * one. The four below are SAMPLES: `sample: true` puts a "Sample" tag on each, and the summary
 * says so. Replace them with real reviews (CONTENT.md → Reviews; prompts/12 does it for you), then
 * delete the `sample` lines and set `verified: true`.
 */

/** The day you copied the reviews: relative dates like "2 years ago" are counted back from it. */
export const READ_ON = "2026-01-15"; // ✏️ EDIT

/** ✏️ EDIT: where the reviews come from. Omit `totals` to hide the "On <platform>: …" line. */
export const reviewSource = {
  name: "Your platform",
  url: "https://example.com/reviews",
  linkLabel: "All reviews on your platform",
  totals: { reviews: 1200, people: 12000, peopleLabel: "students" },
} satisfies ReviewSource;

const DESIGN = {
  course: "Your Course Title: Start Here",
  courseShort: "Start Here",
  courseUrl: "https://example.com/courses/your-first-course",
};
const PROMPTING = {
  course: "Sample Course: Prompting Basics",
  courseShort: "Prompting",
  courseUrl: "https://example.com/courses/prompting-basics",
};

/** In order of strength; `featured` ones fill the carousel at the top of the app. */
export const reviews: Review[] = [
  {
    id: "sample-1",
    ...DESIGN,
    rating: 5,
    text: "This is a sample review. Replace it with a real one, copied word for word from your platform.",
    author: "Sample Reviewer",
    date: "2 months ago",
    source: "Sample",
    verified: false,
    sample: true,
    featured: true,
  },
  {
    id: "sample-2",
    ...PROMPTING,
    rating: 5,
    text: "Another sample review. The first sentence shows in bold, like a title. The rest follows in grey.",
    author: "Sample Student",
    date: "5 months ago",
    source: "Sample",
    verified: false,
    sample: true,
    featured: true,
  },
  {
    id: "sample-3",
    ...DESIGN,
    rating: 4,
    text: "A third sample. Real reviews are often short, and that's fine. Keep the reviewer's own words.",
    author: "Sample Learner",
    date: "a year ago",
    source: "Sample",
    verified: false,
    sample: true,
    featured: true,
  },
  {
    id: "sample-4",
    ...PROMPTING,
    rating: 5,
    text: "The last sample. Delete all four once you've pasted your own reviews.",
    author: "Sample Client",
    date: "2 years ago",
    source: "Sample",
    verified: false,
    sample: true,
  },
];
