import * as z from "zod";

import { courses } from "@content/courses";
import { platforms } from "@content/platforms";
import { profile } from "@content/profile";
import { projects } from "@content/projects";

export const AskRequestSchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(1000) }))
    .min(1)
    .max(12),
});

export type AskMessage = z.infer<typeof AskRequestSchema>["messages"][number];

export type AskResult =
  | { ok: true; reply: string }
  | { ok: false; reason: "invalid" | "rate-limited" | "unavailable" | "failed" };

/** Every URL the site itself publishes; replies may only link to these. */
export const ALLOWED_LINKS = new Set<string>([
  profile.udemyProfile,
  profile.youtube,
  profile.substack,
  ...profile.socials.map((s) => s.url),
  ...courses.map((c) => c.url),
  ...projects.flatMap((p) => (p.url ? [p.url] : [])),
  ...platforms.primary.flatMap((p) => (p.url ? [p.url] : [])),
]);

/** Course recommendation token the model writes: {{course:<id>}} */
export const COURSE_TOKEN = /\{\{course:([a-z0-9-]+)\}\}/g;
