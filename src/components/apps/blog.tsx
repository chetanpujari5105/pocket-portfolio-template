"use client";

import Image from "next/image";
import { RotateCw, Share } from "lucide-react";

import { profile } from "@content/profile";
import { useServerData, type FeedPost } from "@/components/os/server-data";
import { AppHeader, AppScreen, PushView, useLastValue } from "@/components/ui/app-shell";
import { ProminentButton, Row, Section, TINT, Tile } from "@/components/ui/grouped";
import { blurOf } from "@/lib/placeholders";
import { openApp } from "@/lib/router";
import { useOS } from "@/lib/store";

/*
 * Blog, laid out like Settings: the latest post as a large card, the rest as grouped rows (a
 * thumbnail, the title, its subtitle and date), each pushing a reader that ends in one "Read the
 * full post on Substack" button. Posts come from the Substack feed (content/blog.ts when it's down).
 */

/**
 * Post titles and subtitles exactly as written, minus any emoji (a few Substack titles open with
 * one); the lock screen's notes do the same.
 */
const plain = (s: string) =>
  s.replace(/(?![\u00a9\u00ae\u2122])\p{Extended_Pictographic}(\u200d\p{Extended_Pictographic}|\ufe0f)*\s*/gu, "").trim();

const slugOf = (url: string) => url.replace(/\/+$/, "").split("/").pop() || url;

function formatDate(iso: string) {
  if (!iso) return "";
  const d = new Date(`${iso}T12:00:00Z`);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
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

const iconButton = "press-spring glass-button grid size-[44px] place-items-center rounded-full";

function Thumb({ post, className, sizes }: { post: FeedPost; className: string; sizes: string }) {
  if (!post.image)
    return <span aria-hidden className={`block shrink-0 bg-[linear-gradient(150deg,var(--accent),var(--accent-deep))] ${className}`} />;
  return (
    <span aria-hidden className={`relative block shrink-0 overflow-hidden bg-app-background ${className}`}>
      <Image src={post.image} {...blurOf(post.image)} alt="" fill sizes={sizes} className="object-cover" />
    </span>
  );
}

function Reader({ post }: { post: FeedPost }) {
  return (
    <AppScreen>
      <AppHeader
        title={plain(post.title)}
        backLabel="Back to Blog"
        subtitle={plain(post.subtitle)}
        action={
          <button type="button" onClick={() => void share(post.title, post.url)} aria-label="Share this post" className={iconButton}>
            <Share className="size-4" aria-hidden />
          </button>
        }
      />
      <p className="-mt-3 mb-4 text-ios-footnote text-app-muted">
        <time dateTime={post.date}>{formatDate(post.date)}</time>
      </p>
      <Thumb post={post} className="aspect-[16/9] w-full rounded-ios-xl" sizes="(max-width: 600px) 100vw, 400px" />
      <p className="mt-5 text-ios-body">{plain(post.excerpt)}</p>
      <ProminentButton href={post.url} label={`Read the full post on Substack (opens in a new tab)`} data={{ "data-read-post": "" }}>
        Read the full post on Substack
      </ProminentButton>
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
      showPill("done", added ? `${added} new post${added > 1 ? "s" : ""}` : "Blog is up to date");
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
              <button type="button" onClick={() => void reload()} aria-label="Refresh posts" className={iconButton}>
                <RotateCw className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => void share(`${profile.name} on Substack`, profile.substack)}
                aria-label="Share the blog"
                className={iconButton}
              >
                <Share className="size-4" aria-hidden />
              </button>
            </>
          }
        />

        {first && (
          <Section header="Latest" inset={16}>
            <button
              type="button"
              onClick={() => openApp("blog", slugOf(first.url))}
              data-post-row={slugOf(first.url)}
              className="block w-full text-left transition-colors duration-150 active:bg-ios-fill-tertiary [@media(hover:hover)]:hover:bg-ios-fill-quaternary"
            >
              <Thumb post={first} className="aspect-[16/9] w-full" sizes="(max-width: 600px) 100vw, 400px" />
              <span className="block px-4 pt-3 pb-4">
                <span className="block text-ios-footnote text-app-muted">{formatDate(first.date)}</span>
                <span className="mt-0.5 block text-ios-title-3 font-semibold">{plain(first.title)}</span>
                <span className="mt-1 block text-ios-subheadline text-app-muted">{plain(first.subtitle)}</span>
              </span>
            </button>
          </Section>
        )}

        {rest.length > 0 && (
          <Section header="More posts" inset={80}>
            {rest.map((post) => (
              <Row
                key={post.url}
                leading={<Thumb post={post} className="size-13 rounded-ios-m" sizes="52px" />}
                title={plain(post.title)}
                secondary={
                  <>
                    <span className="block">{plain(post.subtitle)}</span>
                    <span className="mt-0.5 block text-ios-footnote">{formatDate(post.date)}</span>
                  </>
                }
                onPush={() => openApp("blog", slugOf(post.url))}
                data={{ "data-post-row": slugOf(post.url) }}
              />
            ))}
          </Section>
        )}

        <Section label="Subscribe">
          <Row
            leading={<Tile glyph="pen" tint={TINT.orange} />}
            title="Subscribe on Substack"
            href={profile.substack}
            label="Subscribe on Substack (opens in a new tab)"
            data={{ "data-subscribe": "" }}
          />
        </Section>
      </AppScreen>

      <PushView open={!!sub && !!current} label="Post">
        {current && <Reader post={current} />}
      </PushView>
    </>
  );
}
