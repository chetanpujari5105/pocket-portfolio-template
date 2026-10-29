import { validateContent } from "@content/index";
import { ServerDataProvider } from "@/components/os/server-data";
import { Phone } from "@/components/phone/Phone";
import { SeoSummary } from "@/components/studio/SeoSummary";
import { FinishSwatches } from "@/components/studio/FinishSwatches";
import { JsonLd } from "@/components/studio/JsonLd";
import { SideNav } from "@/components/studio/SideNav";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { getLatestVideo, getPosts } from "@/lib/rss";

export default async function Home() {
  // A broken edit in /content fails the build here instead of reaching visitors.
  validateContent();
  // The GitHub heatmap fetches its own data (/api/contributions), so the page never waits on GitHub
  const [feed, video] = await Promise.all([getPosts(), getLatestVideo()]);
  const data = { ...feed, video };

  return (
    <main className="relative flex h-dvh flex-col items-center justify-center gap-6 overflow-hidden bg-studio-bg text-studio-ink [background-image:radial-gradient(120%_90%_at_50%_45%,transparent_55%,var(--studio-vignette))] desk:gap-0">
      <FinishSwatches className="absolute top-7 left-7 z-10 hidden tab:flex" />
      <ThemeToggle className="absolute top-6 right-6 z-10 hidden tab:grid" />
      <ServerDataProvider value={data}>
        <Phone />
      </ServerDataProvider>
      <SideNav />
      <SeoSummary posts={data.posts} />
      <JsonLd />
    </main>
  );
}
