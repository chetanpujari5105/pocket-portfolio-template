"use client";

import Image from "next/image";
import { RotateCw, Share } from "lucide-react";

import { profile } from "@content/profile";
import { useServerData, type FeedPost } from "@/components/os/server-data";
import {
  AppHeader,
  AppNav,
  AppScreen,
  Pill,
  PushView,
  SwipeRow,
  useLastValue,
} from "@/components/ui/app-shell";
import { openApp } from "@/lib/router";
import { useOS } from "@/lib/store";
import { blurOf } from "@/lib/placeholders";

const slugOf = (url: string) => url.replace(/\/+$/, "").split("/").pop() || url;

function formatDate(iso: string) {
  if (!iso) return "";
  const d = new Date(`${iso}T12:00:00Z`);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Native share sheet where there is one; otherwise copy the link and say so in the status pill. */
async function share(title: string, url: string) {
  try {
    if (navigator.share) await navigator.share({ title, url });
    else {
      await navigator.clipboard.writeText(url);
      useOS.getState().showPill("done", "Link copied", "link");
    }
  } catch {
    // Share sheet dismissed, or clipboard blocked
  }
}

const iconButton =
  "press-spring grid size-[34px] place-items-center rounded-full bg-app-group";

function Thumb({
  post,
  className,
  sizes,
}: {
  post: FeedPost;
  className: string;
  sizes: string;
}) {
  if (!post.image)
    return (
      <span
        className={`${className} bg-[linear-gradient(150deg,var(--accent),var(--accent-deep))]`}
      />
    );
  return (
    <span className={`${className} relative overflow-hidden bg-app-background`}>
      <Image
        src={post.image}
        {...blurOf(post.image)}
        alt=""
        fill
        sizes={sizes}
        className="object-cover"
      />
    </span>
  );
}

function Reader({ post }: { post: FeedPost }) {
  return (
    <AppScreen>
      <div className="mb-4">
        <AppNav
          backLabel="Back to Blog"
          title={post.title}
          action={
            <button
              type="button"
              onClick={() => void share(post.title, post.url)}
              aria-label="Share this post"
              className={iconButton}
            >
              <Share className="size-4" aria-hidden />
            </button>
          }
        />
      </div>
      <p className="text-[12.5px] font-medium text-app-muted">
        {formatDate(post.date)}
      </p>
      <h2 className="mt-1 text-[26px] leading-[1.15] font-bold tracking-tight">
        {post.title}
      </h2>
      <p className="mt-2 text-[16px] leading-snug text-app-secondary">
        {post.subtitle}
      </p>
      <Thumb
        post={post}
        className="mt-4 block aspect-[16/9] rounded-[16px]"
        sizes="(max-width: 600px) 100vw, 400px"
      />
      <p className="mt-5 text-[16px] leading-[1.65]">{post.excerpt}</p>
      <Pill href={post.url} className="mt-6 w-full py-3 text-[15.5px]">
        Read the full post on Substack
      </Pill>
    </AppScreen>
  );
}

export default function BlogApp() {
  const { posts, refresh } = useServerData();
  const sub = useOS((s) => (s.route.app === "blog" ? s.route.sub : null));
  const shown = useLastValue(sub);
  const current = posts.find((p) => slugOf(p.url) === shown);

  const reload = async () => {
    const { showPill } = useOS.getState();
    showPill("progress", "Checking for new posts");
    try {
      const added = await refresh();
      showPill(
        "done",
        added
          ? `${added} new post${added > 1 ? "s" : ""}`
          : "Blog is up to date",
      );
    } catch {
      showPill("info", "Couldn't refresh. Showing saved posts");
    }
  };

  const [first, ...rest] = posts;

  return (
    <>
      <AppScreen onRefresh={reload}>
        <AppHeader
          title="Blog"
          subtitle="Fresh insights, delivered simply."
          action={
            <>
              <button
                type="button"
                onClick={() => void reload()}
                aria-label="Refresh posts"
                className={iconButton}
              >
                <RotateCw className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() =>
                  void share(`${profile.name} on Substack`, profile.substack)
                }
                aria-label="Share the blog"
                className={iconButton}
              >
                <Share className="size-4" aria-hidden />
              </button>
              <Pill href={profile.substack} className="py-[7px] text-[13px]">
                Subscribe
              </Pill>
            </>
          }
        />

        {first && (
          <button
            type="button"
            onClick={() => openApp("blog", slugOf(first.url))}
            className="mb-6 block w-full overflow-hidden rounded-[18px] bg-app-group text-left transition-transform duration-150 active:scale-[0.98]"
          >
            <Thumb
              post={first}
              className="block aspect-[16/9]"
              sizes="(max-width: 600px) 100vw, 400px"
            />
            <span className="block p-4">
              <span className="block text-[12px] font-medium text-app-muted">
                {formatDate(first.date)}
              </span>
              <span className="mt-1 block text-[19px] leading-snug font-bold tracking-tight">
                {first.title}
              </span>
              <span className="mt-1 line-clamp-2 block text-[14px] text-app-secondary">
                {first.subtitle}
              </span>
            </span>
          </button>
        )}

        <ul className="overflow-hidden rounded-[14px] bg-app-group">
          {rest.map((post, i) => (
            <li key={post.url} className="relative">
              <SwipeRow
                label="Share"
                icon={<Share className="size-[18px]" aria-hidden />}
                onAction={() => void share(post.title, post.url)}
              >
                <button
                  type="button"
                  onClick={() => openApp("blog", slugOf(post.url))}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-app-divider/40"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11.5px] font-medium text-app-muted">
                      {formatDate(post.date)}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-[14.5px] leading-snug font-semibold">
                      {post.title}
                    </span>
                    <span className="mt-0.5 line-clamp-1 block text-[12.5px] text-app-muted">
                      {post.subtitle}
                    </span>
                  </span>
                  <Thumb
                    post={post}
                    className="block size-[64px] shrink-0 rounded-[10px]"
                    sizes="64px"
                  />
                </button>
              </SwipeRow>
              {i < rest.length - 1 && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute right-0 bottom-0 left-4 z-1 h-[0.5px] bg-app-divider"
                />
              )}
            </li>
          ))}
        </ul>
      </AppScreen>

      <PushView open={!!sub && !!current} label="Post">
        {current && <Reader post={current} />}
      </PushView>
    </>
  );
}
