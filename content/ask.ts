import type { AskCopy } from "./schema";

/** Copy for the optional Ask app (NEXT_PUBLIC_ENABLE_ASK=true). Its answers come only from /content. */
export const ask = {
  title: "Ask Alex", // ✏️ EDIT: "Ask <your first name>"
  intro: "Ask me about my courses, services, or work. I answer from what's on this site.", // ✏️ EDIT
  placeholder: "Ask about a course or a service…", // ✏️ EDIT
  // ✏️ EDIT: up to 6 suggestion chips
  suggestions: ["Which course should I start with?", "Can you design my website?", "Do you run workshops?"],
  unavailable: "The assistant is resting right now. Email me directly and I'll reply myself.", // ✏️ EDIT
} satisfies AskCopy;
