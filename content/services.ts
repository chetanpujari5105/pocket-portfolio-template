import type { Service } from "./schema";

export const servicesTitle = "How I can help"; // ✏️ EDIT: heading of the Services app
export const servicesIntro = "Sample intro: one friendly sentence about who you work with."; // ✏️ EDIT

// ✏️ EDIT: what people can hire you for. `subject` pre-fills the contact form.
// Services with a `chip` appear on the home screen's "Work with me" widget (2–3 is best).
export const services: Service[] = [
  {
    id: "design",
    emoji: "📐",
    title: "Sample Service: Design",
    description: "Sample description: what you deliver, for whom, and what makes it good.",
    subject: "Design project",
    chip: "Design",
  },
  {
    id: "websites",
    emoji: "💼",
    title: "Sample Service: Websites",
    description: "Sample description: fast, simple websites that look good on every screen.",
    subject: "Website project",
    chip: "Websites",
  },
  {
    id: "automation",
    emoji: "🤖",
    title: "Sample Service: AI Setup",
    description: "Sample description: set up AI tools and small automations for a team.",
    subject: "AI setup",
    chip: "AI Setup",
  },
  {
    id: "workshops",
    emoji: "🎤",
    title: "Sample Service: Workshops",
    description: "Sample description: hands-on sessions for schools, teams and events.",
    subject: "Workshop request",
  },
];
