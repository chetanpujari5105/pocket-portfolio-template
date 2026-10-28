import type { Profile } from "./schema";

/*
 * Who you are, and every personal setting the site uses (title, URL, links, GitHub, YouTube).
 * Components read these fields; nothing personal is hard-coded anywhere else.
 * Everything below is SAMPLE content for "Alex Rivera". Replace each ✏️ EDIT field with your own.
 */
export const profile = {
  name: "Alex Rivera", // ✏️ EDIT: your full name
  firstName: "Alex", // ✏️ EDIT: first line of the big name beside the phone
  lastName: "Rivera", // ✏️ EDIT: second line of the big name
  tagline: "I make design and AI feel easy.", // ✏️ EDIT: one short line
  headline: "I help people learn design and AI, one small step at a time.", // ✏️ EDIT
  typingLine: "I teach design to 12K+ students", // ✏️ EDIT
  subHeadline: "Course creator · 12,000+ students · Workshop speaker", // ✏️ EDIT
  role: "Course Creator", // ✏️ EDIT: your job title
  shortBio: "Course creator and designer. 12K+ students in 40+ countries.", // ✏️ EDIT: one sentence
  // ✏️ EDIT: a 2–4 sentence introduction in your own voice
  intro:
    "This is sample text. Replace it with a short, friendly introduction: who you help, what you teach or build, and why people like working with you.",
  footerTagline: "Making hard things simple.", // ✏️ EDIT
  location: "Your City, Country", // ✏️ EDIT
  education: "Your School or University", // ✏️ EDIT (or "Self-taught")
  email: "hello@example.com", // ✏️ EDIT: where people can reach you (shown in Contact)
  responseTime: "I usually reply within 2 days.", // ✏️ EDIT
  status: "Available for projects", // ✏️ EDIT: the green pill beside the phone
  avatar: "/content/profile.webp", // ✏️ EDIT: replace public/content/profile.webp with your photo (square)
  badges: ["Course Creator", "Designer", "Speaker"], // ✏️ EDIT: up to 3 short badges
  highlight: {
    title: "Sample Workshop · Example Conference", // ✏️ EDIT: one proud moment
    text: "Replace this with a talk, award or project you're proud of, in one or two sentences.", // ✏️ EDIT
  },
  // ✏️ EDIT: your profiles. Remove any you don't use. `id` picks the official brand mark.
  socials: [
    { id: "linkedin", label: "LinkedIn", handle: "your-linkedin", url: "https://example.com/linkedin" },
    { id: "x", label: "X", handle: "@your_handle", url: "https://example.com/x" },
    { id: "instagram", label: "Instagram", handle: "@your_handle", url: "https://example.com/instagram" },
    { id: "substack", label: "Substack", handle: "your-newsletter", url: "https://example.com/newsletter" },
    { id: "udemy", label: "Udemy", handle: "your-udemy", url: "https://example.com/udemy" },
    { id: "youtube", label: "YouTube", handle: "@your_channel", url: "https://example.com/youtube" },
    { id: "github", label: "GitHub", handle: "octocat", url: "https://github.com/octocat" },
  ],
  udemyProfile: "https://example.com/udemy", // ✏️ EDIT: your main course or portfolio page ("Explore all" links here)
  youtube: "https://example.com/youtube", // ✏️ EDIT: your YouTube channel URL
  // ✏️ EDIT: your YouTube channel id (starts with "UC"; find it in the channel's page source).
  // Leave empty and the page-2 video widget links to `youtube` instead of the latest video.
  youtubeChannelId: "",
  youtubeLine: "Design lessons with Alex", // ✏️ EDIT: shown on the YouTube widget until a video is found
  substack: "https://example.com/newsletter", // ✏️ EDIT: your newsletter or blog home page
  // ✏️ EDIT: your GitHub username, for the page-2 contribution heatmap.
  // "octocat" is GitHub's own demo account, used here only as a working sample.
  github: "octocat",
  // ✏️ EDIT: your numbers. Keep them honest; they count up on the home screen.
  stats: {
    students: 12000,
    courses: 6,
    platforms: 3,
    countries: 40,
    yearsTeaching: 4,
    linkedinImpressions2025: 25000,
  },
  sideLine: "Course Creator · 12K+ students", // ✏️ EDIT: muted line under your name beside the phone
  journeySubtitle: "From first lesson to 12K students.", // ✏️ EDIT: subtitle of the Journey app
  site: {
    // ✏️ EDIT: your live address. NEXT_PUBLIC_SITE_URL (or Vercel's production URL) wins when set.
    url: "https://example.com",
    title: "Alex Rivera — Course Creator · 12K+ Students", // ✏️ EDIT: browser tab and search title
    // ✏️ EDIT: one or two sentences for Google and link previews
    description: "Alex Rivera — course creator and designer. 12K+ students in 40+ countries. Sample content for the Pocket Portfolio template.",
    shortName: "Alex", // ✏️ EDIT: name under the icon when installed to a phone's home screen
    mark: "AR", // ✏️ EDIT: your initials (1–3 letters), engraved on the back of the 3D phone
  },
} satisfies Profile;
