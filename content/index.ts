import * as z from "zod";

import { appsLayout } from "./apps";
import { ask } from "./ask";
import { fallbackPosts } from "./blog";
import { courses } from "./courses";
import { expertise } from "./expertise";
import { philosophy } from "./philosophy";
import { platforms } from "./platforms";
import { profile } from "./profile";
import { projects } from "./projects";
import { reviews } from "./reviews";
import {
  AppsLayoutSchema,
  AskCopySchema,
  BlogPostSchema,
  CourseSchema,
  ExpertiseSchema,
  PhilosophySchema,
  PlatformsSchema,
  ProfileSchema,
  ProjectSchema,
  ReviewSchema,
  ServiceSchema,
  StorySchema,
  TimelineEntrySchema,
} from "./schema";
import { services } from "./services";
import { story } from "./story";
import { timeline } from "./timeline";

/**
 * Parses every content file and checks cross-references. Server-only: call it
 * from a Server Component so a broken edit fails the build, not the visitor.
 */
export function validateContent() {
  ProfileSchema.parse(profile);
  StorySchema.parse(story);
  z.array(TimelineEntrySchema).parse(timeline);
  z.array(CourseSchema).parse(courses);
  PlatformsSchema.parse(platforms);
  z.array(ExpertiseSchema).parse(expertise);
  z.array(ServiceSchema).parse(services);
  z.array(PhilosophySchema).parse(philosophy);
  z.array(BlogPostSchema).parse(fallbackPosts);
  z.array(ReviewSchema).parse(reviews);
  z.array(ProjectSchema).parse(projects);
  AppsLayoutSchema.parse(appsLayout);
  AskCopySchema.parse(ask);

  const courseIds = new Set(courses.map((c) => c.id));
  const serviceIds = new Set(services.map((s) => s.id));
  for (const area of expertise) {
    for (const id of area.relatedCourses)
      if (!courseIds.has(id)) throw new Error(`expertise "${area.id}" links unknown course "${id}"`);
    for (const id of area.relatedServices)
      if (!serviceIds.has(id)) throw new Error(`expertise "${area.id}" links unknown service "${id}"`);
  }
  if (courses.filter((c) => c.featured).length !== 1)
    throw new Error("courses.ts needs exactly one featured course");
  return true;
}
