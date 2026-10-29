import * as z from "zod";

/** Shared by the Contact app (client hints) and /api/contact (authoritative). */
export const ContactSchema = z.object({
  name: z.string().trim().min(2, "Please tell me your name.").max(80),
  email: z.email("That email doesn't look right."),
  subject: z.string().trim().min(3, "Add a short subject.").max(140),
  message: z.string().trim().min(10, "A little more detail, please (10+ characters).").max(5000),
  /** Honeypot: humans never see or fill this. */
  company: z.string().max(0).optional().or(z.literal("")),
});

export type ContactInput = z.infer<typeof ContactSchema>;

/**
 * What /api/contact answers. `unavailable` means email isn't set up (or Gmail/Resend refuses
 * the settings): the form offers "email me directly". `failed` is a hiccup worth retrying.
 */
export type ContactResult =
  | { ok: true }
  | { ok: false; reason: "invalid"; fieldErrors: Partial<Record<keyof ContactInput, string>> }
  | { ok: false; reason: "rate-limited"; email: string; retryAfter: number }
  | { ok: false; reason: "unavailable" | "failed"; email: string }
  | { ok: false; reason: "forbidden" };

export function fieldErrorsOf(error: z.ZodError<ContactInput>) {
  const out: Partial<Record<keyof ContactInput, string>> = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as keyof ContactInput;
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}
