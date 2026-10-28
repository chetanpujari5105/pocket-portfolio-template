import { profile } from "@content/profile";
import type { Social } from "@content/schema";

import type { BrandMark } from "./BrandIcon";
import { github, instagram, linkedin, substack, udemy, x, youtube } from "./brand-marks";

/** Each social link shows its brand's official mark (see BrandIcon). */
export const SOCIAL_MARK: Record<Social["id"], BrandMark> = {
  linkedin,
  x,
  instagram,
  "ai-instagram": instagram,
  substack,
  udemy,
  youtube,
  github,
};

/** Home-screen items with a `brand` slug (any social id) */
export const HOME_MARKS: Record<string, BrandMark> = SOCIAL_MARK;

/** The Socials folder: every profile in content/profile.ts, in order, except YouTube (it has its own icon) */
export const FOLDER_SOCIALS: Social["id"][] = profile.socials.map((s) => s.id).filter((id) => id !== "youtube");
