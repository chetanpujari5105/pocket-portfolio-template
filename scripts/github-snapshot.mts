// Writes public/content/github-contributions.json: the heatmap's fallback when GitHub can't be
// reached (the API route uses it on the server, the widget on the client). The template ships a
// made-up sample (user "sample"); run this once with your own `github` in content/profile.ts, then
// now and then so the fallback stays recent. Usage: npx tsx scripts/github-snapshot.mts
import { writeFileSync } from "node:fs";

import { fetchLiveContributions } from "../src/lib/github";

const { user, total, days } = await fetchLiveContributions();
const data = { user, total, days };
writeFileSync("public/content/github-contributions.json", JSON.stringify(data) + "\n");
console.log(`snapshot: ${data.user}, ${data.days.length} days to ${data.days.at(-1)?.date}, total ${data.total}`);
