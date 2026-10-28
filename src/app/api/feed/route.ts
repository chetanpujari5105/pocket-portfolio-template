import { getPosts } from "@/lib/rss";

/** The Substack feed as JSON, for pull-to-refresh in Blog. Cached like the page (see getPosts). */
export async function GET() {
  return Response.json(await getPosts());
}
