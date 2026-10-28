import * as z from "zod";

/*
 * Schemas for everything in /content. The data files import only the *types*
 * (erased at build), so Zod never reaches the client bundle. `validateContent()`
 * in ./index.ts parses every file on the server at build time.
 */

const url = z.url();
const localImage = z.string().startsWith("/content/");

export const AppIdSchema = z.enum([
  "courses",
  "journey",
  "expertise",
  "platforms",
  "projects",
  "blog",
  "reviews",
  "services",
  "contact",
  "settings",
  "socials",
  "ask",
]);

export const SocialSchema = z.object({
  id: z.enum(["linkedin", "x", "instagram", "ai-instagram", "substack", "udemy", "youtube", "github"]),
  label: z.string(),
  handle: z.string(),
  url,
});

export const StorySchema = z.array(z.string()).min(1);

export const ProfileSchema = z.object({
  name: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  tagline: z.string(),
  headline: z.string(),
  typingLine: z.string(),
  subHeadline: z.string(),
  role: z.string(),
  shortBio: z.string(),
  intro: z.string(),
  footerTagline: z.string(),
  location: z.string(),
  education: z.string(),
  email: z.email(),
  responseTime: z.string(),
  status: z.string(),
  avatar: localImage,
  badges: z.array(z.string()),
  highlight: z.object({ title: z.string(), text: z.string() }),
  socials: z.array(SocialSchema),
  udemyProfile: url,
  youtube: url,
  substack: url,
  /** GitHub username: the page-2 contribution heatmap and the GitHub links */
  github: z.string().regex(/^[a-z\d](?:[a-z\d-]{0,38})$/i),
  /** YouTube channel id ("UC…") for the latest-video widget; empty links the channel instead */
  youtubeChannelId: z.string().regex(/^(UC[\w-]{22})?$/),
  /** YouTube widget and Now Playing title when there is no latest video */
  youtubeLine: z.string(),
  stats: z.object({
    students: z.number().int(),
    courses: z.number().int(),
    platforms: z.number().int(),
    countries: z.number().int(),
    yearsTeaching: z.number().int(),
    linkedinImpressions2025: z.number().int(),
  }),
  /** Muted line under the name beside the phone */
  sideLine: z.string(),
  journeySubtitle: z.string(),
  /** Site-wide settings: the canonical URL, the home title and description, the installed-app name */
  site: z.object({
    url,
    title: z.string(),
    description: z.string(),
    shortName: z.string().max(12),
    /** Initials engraved on the back of the 3D phone */
    mark: z.string().min(1).max(3),
  }),
});

export const TimelineEntrySchema = z.object({ year: z.number().int(), text: z.string() });

export const CourseCategorySchema = z.enum(["AI Video", "AI & Prompting", "Design", "Productivity"]);

export const CourseSchema = z.object({
  id: z.string(),
  title: z.string(),
  platform: z.string(),
  badge: z.string(),
  category: CourseCategorySchema,
  image: localImage,
  url,
  featured: z.boolean(),
  blurb: z.string(),
  audience: z.string(),
});

export const PlatformsSchema = z.object({
  primary: z.array(
    z.object({
      name: z.string(),
      url: url.nullable(),
      logo: z.string(),
      note: z.string().optional(),
    }),
  ),
  distribution: z.array(z.string()),
});

export const ExpertiseSchema = z.object({
  id: z.string(),
  emoji: z.string(),
  title: z.string(),
  tools: z.array(z.string()),
  relatedCourses: z.array(z.string()),
  relatedServices: z.array(z.string()),
});

export const ServiceSchema = z.object({
  id: z.string(),
  emoji: z.string(),
  title: z.string(),
  description: z.string(),
  subject: z.string(),
  chip: z.string().optional(),
});

export const PhilosophySchema = z.object({ emoji: z.string(), quote: z.string() });

export const BlogPostSchema = z.object({
  date: z.string(),
  title: z.string(),
  subtitle: z.string(),
  image: z.string(),
  url,
});

export const ReviewSchema = z.object({
  name: z.string(),
  role: z.string(),
  city: z.string(),
  quote: z.string(),
  rating: z.number().int().min(1).max(5),
  verified: z.boolean(),
});

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  tagline: z.string(),
  description: z.string(),
  category: z.enum(["Apps", "Games", "Web"]),
  url,
  image: localImage,
  stack: z.array(z.string()),
  color: z.string(),
  featured: z.boolean(),
});

export const HomeItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  icon: z.string(),
  /** Two gradient stops for the icon tile */
  colors: z.tuple([z.string(), z.string()]),
  app: AppIdSchema.optional(),
  href: url.optional(),
  /** Official brand mark instead of a glyph (a slug from src/components/os/brand-icons.ts) */
  brand: z.string().optional(),
});

export const AppsLayoutSchema = z.object({
  block: z.array(HomeItemSchema).length(4),
  row: z.array(HomeItemSchema).length(4),
  /** Brand links straight on page 1, under the row */
  links: z.array(HomeItemSchema).max(4),
  dock: z.array(HomeItemSchema).length(4),
  titles: z.record(AppIdSchema, z.string()),
});

export const AskCopySchema = z.object({
  title: z.string(),
  intro: z.string(),
  placeholder: z.string(),
  suggestions: z.array(z.string()).min(1).max(6),
  unavailable: z.string(),
});

export type AppId = z.infer<typeof AppIdSchema>;
export type Social = z.infer<typeof SocialSchema>;
export type Profile = z.infer<typeof ProfileSchema>;
export type TimelineEntry = z.infer<typeof TimelineEntrySchema>;
export type CourseCategory = z.infer<typeof CourseCategorySchema>;
export type Course = z.infer<typeof CourseSchema>;
export type Platforms = z.infer<typeof PlatformsSchema>;
export type Expertise = z.infer<typeof ExpertiseSchema>;
export type Service = z.infer<typeof ServiceSchema>;
export type Philosophy = z.infer<typeof PhilosophySchema>;
export type BlogPost = z.infer<typeof BlogPostSchema>;
export type Review = z.infer<typeof ReviewSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type HomeItem = z.infer<typeof HomeItemSchema>;
export type AppsLayout = z.infer<typeof AppsLayoutSchema>;
export type AskCopy = z.infer<typeof AskCopySchema>;
