import { profile } from "../content/profile";
import { EMOJI, app, fitSuite, open, squash, swipeBack, textOf, unlocked, view } from "./apple";
import { expect, test, type Page } from "./fixtures";

/* Blog, laid out like Settings (v12): the latest post as a card, the rest as grouped rows, a reader
 * that pushes and swipes back, links that go to each post on Substack, and no emoji. Posts are
 * whatever the server serves (the Substack feed, or content/blog.ts when it's down). */

unlocked();

type Post = { url: string; title: string; subtitle: string };
/** The app shows titles word for word but leaves out emoji (as the lock screen's notes do) */
const plain = (s: string) => squash(s.replace(/(?![\u00a9\u00ae\u2122])\p{Extended_Pictographic}(\u200d\p{Extended_Pictographic}|\ufe0f)*\s*/gu, ""));
const slugOf = (url: string) => url.replace(/\/+$/, "").split("/").pop() || url;
const firstPost = async (page: Page) => {
  await open(page, "blog");
  return `blog/${await app(page, "Blog").locator("[data-post-row]").first().getAttribute("data-post-row")}`;
};

test("every post the server serves is listed, and Subscribe goes to Substack", async ({ page, request }) => {
  const { posts } = (await (await request.get("/api/feed")).json()) as { posts: Post[] };
  await open(page, "blog");
  const screen = app(page, "Blog");
  await expect(screen.locator("[data-post-row]")).toHaveCount(posts.length);
  const text = await textOf(page, "app");
  for (const p of posts) {
    expect(text).toContain(plain(p.title));
    expect(text).toContain(plain(p.subtitle));
  }
  expect(text).not.toMatch(EMOJI);

  const subscribe = screen.locator("[data-subscribe]");
  await expect(subscribe).toHaveAttribute("href", profile.substack);
  await expect(subscribe).toHaveAttribute("target", "_blank");
  await expect(subscribe).toHaveAccessibleName("Subscribe on Substack (opens in a new tab)");
});

test("each reader links to its own post", async ({ page, request }) => {
  const { posts } = (await (await request.get("/api/feed")).json()) as { posts: Post[] };
  for (const p of posts.slice(0, 4)) {
    await open(page, `blog/${slugOf(p.url)}`);
    await expect(view(page)).toBeVisible();
    const read = view(page).locator("[data-read-post]");
    await expect(read).toHaveAttribute("href", p.url);
    await expect(read).toHaveAttribute("target", "_blank");
    const told = await textOf(page, "view");
    expect(told).toContain(plain(p.title));
    expect(told).not.toMatch(EMOJI);
  }
});

test("a post pushes its reader and swipes back from the left edge", async ({ page }) => {
  await open(page, "blog");
  const row = app(page, "Blog").locator("[data-post-row]").nth(1);
  const slug = await row.getAttribute("data-post-row");
  await row.click();
  await expect(view(page)).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`#blog/${slug}$`));
  await expect(view(page).getByRole("button", { name: "Share this post" })).toBeVisible();
  await swipeBack(page);
  await expect(view(page)).toHaveCount(0);
  await expect(page).toHaveURL(/#blog$/);
});

fitSuite(["blog", firstPost]);
