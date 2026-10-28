import type { Review } from "./schema";

/*
 * ✏️ EDIT: real reviews from real people. Only reviews with `verified: true` are shown.
 * Set `verified: true` only after you've confirmed the quote is real and you have the person's
 * permission to publish it. Until one is verified, the app shows "Stories coming soon".
 * These two are SAMPLES and must stay unverified.
 */
export const reviews: Review[] = [
  {
    name: "Sample Student",
    role: "Sample role",
    city: "Sample City",
    quote: "This is a sample review. Replace it with a real quote you have permission to publish.",
    rating: 5,
    verified: false,
  },
  {
    name: "Sample Client",
    role: "Sample company",
    city: "Sample City",
    quote: "Another sample review. Keep `verified: false` until it's real.",
    rating: 5,
    verified: false,
  },
];

export const verifiedReviews = reviews.filter((r) => r.verified);
