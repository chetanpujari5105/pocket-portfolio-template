import { expect, test } from "@playwright/test";

import { fetchLatestVideo, parseVideoFeed, SNAPSHOT_VIDEO } from "../src/lib/youtube";

/* The YouTube widget's data: the live feed when it answers, else the committed last good video,
 * so a 404 from YouTube never drops the widget back to the channel card (the template ships no
 * snapshot: `null`, so it shows the channel card until you have one). Server-side only, so these
 * run once (in the phone project) without a page. */
const FEED = "https://www.youtube.com/feeds/videos.xml?channel_id=UCtest";

test.beforeEach(({}, info) => test.skip(info.project.name !== "phone", "no page needed; runs once"));

const feed = (id: string, title: string) =>
  `<feed><entry><yt:videoId>${id}</yt:videoId><title>${title}</title><published>2026-10-20T10:00:00+00:00</published></entry></feed>`;
const answer = (status: number, body = "") => (async () => new Response(body, { status })) as unknown as typeof fetch;

test("the live feed's newest video wins when YouTube answers", async () => {
  const v = await fetchLatestVideo(answer(200, feed("abcDEF12345", "New &amp; shiny")), FEED);
  expect(v).toMatchObject({ id: "abcDEF12345", title: "New & shiny", published: "2026-10-20" });
});

test("a 404, an empty feed or a network error keep the last good video", async () => {
  if (SNAPSHOT_VIDEO) expect(SNAPSHOT_VIDEO.id).toMatch(/^[\w-]{6,20}$/);
  for (const fetcher of [answer(404), answer(200, "<feed></feed>"), (async () => Promise.reject(new Error("offline"))) as unknown as typeof fetch]) {
    const v = await fetchLatestVideo(fetcher, FEED);
    expect(v).toEqual(SNAPSHOT_VIDEO);
  }
  expect(parseVideoFeed("<feed></feed>")).toBeNull();
});
