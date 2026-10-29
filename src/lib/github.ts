import { cacheLife } from "next/cache";

import { profile } from "@content/profile";
import { SITE_URL } from "@/lib/site";

import snapshot from "../../public/content/github-contributions.json";

export type ContributionLevel = 0 | 1 | 2 | 3 | 4;
export type ContributionDay = { date: string; level: ContributionLevel; count: number | null };
/**
 * `days` covers the last HEATMAP_WEEKS weeks, oldest first, starting on a Sunday. `source`:
 * `github` (live) or `snapshot` (public/content/github-contributions.json, written by
 * scripts/github-snapshot.mts, used when GitHub can't be reached).
 */
export type Contributions = { user: string; total: number | null; days: ContributionDay[]; source: "github" | "snapshot" };

export const HEATMAP_WEEKS = 34;

const LEVELS: Record<string, ContributionLevel> = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
};

/** Day cells from the public `github.com/users/<user>/contributions` fragment. */
export function parseContributionsHtml(html: string): { total: number | null; days: ContributionDay[] } {
  const counts = new Map<string, number>();
  for (const [, id, text] of html.matchAll(/<tool-tip[^>]*\bfor="([^"]+)"[^>]*>([^<]*)<\/tool-tip>/g)) {
    const n = text.match(/^(\d[\d,]*) contribution/);
    counts.set(id, n ? Number(n[1].replace(/,/g, "")) : 0);
  }
  const days: ContributionDay[] = [];
  for (const [cell] of html.matchAll(/<td\b[^>]*\bdata-date="[^"]+"[^>]*>/g)) {
    const date = cell.match(/data-date="(\d{4}-\d{2}-\d{2})"/)?.[1];
    const level = Number(cell.match(/data-level="(\d)"/)?.[1] ?? -1);
    const id = cell.match(/\bid="([^"]+)"/)?.[1];
    if (!date || level < 0 || level > 4) continue;
    days.push({ date, level: level as ContributionLevel, count: id && counts.has(id) ? counts.get(id)! : null });
  }
  const total = html.match(/([\d,]+)\s+contributions?\s+in the last year/);
  return { total: total ? Number(total[1].replace(/,/g, "")) : null, days };
}

/** The last `weeks` whole columns (Sunday → Saturday), ending with the week that holds the newest day. */
export function lastWeeks(days: ContributionDay[], weeks = HEATMAP_WEEKS): ContributionDay[] {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const last = sorted.at(-1);
  if (!last) return [];
  const end = new Date(`${last.date}T00:00:00Z`);
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - end.getUTCDay() - (weeks - 1) * 7);
  const from = start.toISOString().slice(0, 10);
  return sorted.filter((d) => d.date >= from);
}

async function fromGraphQL(user: string, token: string) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { authorization: `bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      query: `query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{date contributionCount contributionLevel}}}}}}`,
      variables: { login: user },
    }),
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error(`GitHub GraphQL ${res.status}`);
  const json = await res.json();
  const cal = json?.data?.user?.contributionsCollection?.contributionCalendar;
  if (!cal) throw new Error("GitHub GraphQL: no calendar");
  const days: ContributionDay[] = cal.weeks.flatMap((w: { contributionDays: { date: string; contributionCount: number; contributionLevel: string }[] }) =>
    w.contributionDays.map((d) => ({ date: d.date, count: d.contributionCount, level: LEVELS[d.contributionLevel] ?? 0 })),
  );
  return { total: cal.totalContributions as number, days };
}

async function fromHtml(user: string) {
  const res = await fetch(`https://github.com/users/${encodeURIComponent(user)}/contributions`, {
    headers: { "user-agent": `${new URL(SITE_URL).host} (+${SITE_URL})`, "x-requested-with": "XMLHttpRequest" },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error(`GitHub contributions ${res.status}`);
  const parsed = parseContributionsHtml(await res.text());
  if (!parsed.days.length) throw new Error("GitHub contributions: no cells");
  return parsed;
}

/** The calendar straight from GitHub (uncached): GraphQL when `GITHUB_TOKEN` is set, else the public fragment. */
export async function fetchLiveContributions(user = profile.github): Promise<Contributions> {
  const token = process.env.GITHUB_TOKEN;
  const sources = token ? [() => fromGraphQL(user, token), () => fromHtml(user)] : [() => fromHtml(user)];
  let error: unknown;
  for (const source of sources) {
    try {
      const { total, days } = await source();
      return { user, total, days: lastWeeks(days), source: "github" };
    } catch (e) {
      error = e; // try the next source
    }
  }
  throw error;
}

/**
 * The contribution calendar for /api/contributions, cached for 6 hours and refreshed in the
 * background (stale-while-revalidate), so no visitor waits on GitHub. If GitHub can't be reached
 * it is the committed snapshot, never nothing.
 */
export async function getContributions(): Promise<Contributions> {
  "use cache";
  cacheLife({ stale: 3600, revalidate: 21600, expire: 604800 });
  try {
    return await fetchLiveContributions();
  } catch {
    return { ...(snapshot as Omit<Contributions, "source">), source: "snapshot" };
  }
}
