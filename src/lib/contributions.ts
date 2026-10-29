import type { ContributionDay, Contributions } from "@/lib/github";

/**
 * One request per visit, shared by the GitHub widget (every copy) and the lock screen: the cached
 * API route, else the committed snapshot, else nothing (the skeleton stays, still a full grid).
 */
let request: Promise<Contributions | null> | null = null;
export function loadContributions() {
  const json = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url} ${res.status}`);
    const data = (await res.json()) as Contributions;
    if (!data?.days?.length) throw new Error(`${url}: no days`);
    return data;
  };
  request ??= json("/api/contributions")
    .catch(() => json("/content/github-contributions.json").then((d): Contributions => ({ ...d, source: "snapshot" })))
    .catch(() => null);
  return request;
}

/** Contributions and active days over the last `n` days of the data. */
export function recent(days: ContributionDay[], n = 7) {
  const last = days.slice(-n);
  return { count: last.reduce((sum, d) => sum + (d.count ?? 0), 0), active: last.filter((d) => d.level > 0).length };
}
