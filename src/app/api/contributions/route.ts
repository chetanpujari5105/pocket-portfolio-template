import { getContributions } from "@/lib/github";

/** Page 2's GitHub heatmap data, cached for 6 hours (see getContributions); never empty. */
export async function GET() {
  return Response.json(await getContributions());
}
