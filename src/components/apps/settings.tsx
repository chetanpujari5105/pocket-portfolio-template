"use client";

import Image from "next/image";
import type { MouseEvent } from "react";

import { profile } from "@content/profile";
import { Glyph } from "@/components/os/icons";
import { BrandTile } from "@/components/os/BrandIcon";
import { SOCIAL_MARK } from "@/components/os/social-icons";
import { FINISH_INFO, useSetFinish } from "@/components/studio/FinishSwatches";
import { AppHeader, AppScreen, PushView, Switch, useLastValue } from "@/components/ui/app-shell";
import { Row, Section, TINT } from "@/components/ui/grouped";
import { useTheme } from "@/components/ui/theme-toggle";
import { onRadioGroupKeyDown } from "@/lib/a11y";
import { ICON_PACK } from "@/lib/icon-pack";
import { settlePanel } from "@/lib/panel";
import { goHome, openApp } from "@/lib/router";
import { useOS, WALLPAPERS, type Wallpaper } from "@/lib/store";
import { FINISHES, setThemeWithReveal, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { blurOf } from "@/lib/placeholders";

/*
 * Settings, laid out like iOS Settings: inset-grouped sections, flat tinted tiles, rows at least 44 px, type
 * in rem (so its own Larger text switch scales every row), and the profile as a pushed detail.
 */

const WALLPAPER_INFO: Record<Wallpaper, { label: string; preview: string }> = {
  ribbons: {
    label: "Ribbons",
    preview:
      "radial-gradient(70% 40% at 30% 35%, var(--accent), transparent 70%), radial-gradient(60% 35% at 70% 70%, var(--accent-deep), transparent 70%), linear-gradient(180deg,#1a1205,#000)",
  },
  aurora: {
    label: "Aurora",
    preview:
      "radial-gradient(80% 40% at 50% 20%, #3fe0b0, transparent 70%), radial-gradient(60% 40% at 30% 60%, var(--accent), transparent 70%), linear-gradient(180deg,#041a1a,#020509)",
  },
  dusk: {
    label: "Dusk",
    preview:
      "radial-gradient(90% 50% at 50% 100%, var(--accent), transparent 70%), linear-gradient(180deg,#2a1640,#c0587a 70%,#f2a65a)",
  },
};

// An optional icon pack is credited from its own licence file (README → "Optional: an icon pack").
const ICON_CREDIT =
  ICON_PACK === "ios18"
    ? "App icons: an icon pack added by the site owner (credit and licence in public/icons/ios18/LICENSE.txt); wallpaper and 3D phone are original."
    : "App icons, wallpaper and 3D phone are original.";
const CREDITS = `Designed and built for ${profile.name}, with the Pocket Portfolio template (MIT). ${ICON_CREDIT} Brand logos: Simple Icons (CC0) and Font Awesome Free (CC BY 4.0, LinkedIn), used only to link to ${profile.firstName}'s profiles. World map data: Natural Earth (public domain). Interface sizes and colours follow Apple's published Human Interface Guidelines. iPhone, iOS and iPadOS are trademarks of Apple Inc.`;

const TECH = ["Next.js 16", "React 19", "Tailwind CSS v4", "Motion", "Zustand", "Zod", "WebGL", "Nodemailer"];

/** One white glyph on one flat accent, as in the grouped lists elsewhere */
function RowIcon({ glyph, tint }: { glyph: string; tint: string }) {
  return (
    <span aria-hidden className="squircle grid size-[30px] shrink-0 place-items-center text-white" style={{ background: tint }}>
      <Glyph name={glyph} className="size-[17px]" />
    </span>
  );
}

function ThemePreview({ theme }: { theme: Theme }) {
  const dark = theme === "dark";
  return (
    <span
      aria-hidden
      className={cn(
        "relative block h-[92px] w-[50px] overflow-hidden rounded-[10px] border-[2.5px]",
        dark ? "border-[#2a2a2e] bg-[#0b0b0d]" : "border-[#d8d8dc] bg-[#f4f4f6]",
      )}
    >
      <span className="absolute inset-x-0 top-0 h-[38%] bg-[linear-gradient(160deg,var(--accent),var(--accent-deep))]" />
      <span className="absolute top-[46%] left-[6px] grid grid-cols-3 gap-[4px]">
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className={cn("size-[8px] rounded-[2.5px]", dark ? "bg-white/25" : "bg-black/15")} />
        ))}
      </span>
      <span
        className={cn("absolute inset-x-[5px] bottom-[5px] h-[12px] rounded-[4px]", dark ? "bg-white/15" : "bg-black/10")}
      />
    </span>
  );
}

function Profile() {
  return (
    <AppScreen>
      <AppHeader title={profile.name} backLabel="Back to Settings" subtitle={profile.role} />
      <span className="relative mb-5 block size-24 overflow-hidden rounded-full shadow-[0_0_0_0.5px_var(--app-divider)]">
        <Image src={profile.avatar} {...blurOf(profile.avatar)} alt={profile.name} fill sizes="96px" className="object-cover" />
      </span>
      <p className="mb-6 text-ios-body">{profile.shortBio}</p>
      <Section header="Details" inset={16}>
        <Row title="Location" detail={profile.location} />
        <Row title="Education" secondary={profile.education} />
        <Row title="Email" secondary={profile.email} href={`mailto:${profile.email}`} label={`Email ${profile.email}`} data={{ "data-profile-email": "" }} />
      </Section>
      <Section header="Find me">
        {profile.socials.map((s) => (
          <Row
            key={s.id}
            leading={<BrandTile mark={SOCIAL_MARK[s.id]} />}
            title={s.label}
            secondary={s.handle}
            href={s.url}
            label={`Open ${s.label} profile (opens in a new tab)`}
            data={{ "data-profile-social": s.id }}
          />
        ))}
      </Section>
    </AppScreen>
  );
}

export default function SettingsApp() {
  const sub = useOS((s) => (s.route.app === "settings" ? s.route.sub : null));
  const shown = useLastValue(sub);
  const theme = useTheme();
  const finish = useOS((s) => s.finish);
  const wallpaper = useOS((s) => s.wallpaper);
  const setWallpaper = useOS((s) => s.setWallpaper);
  const reduceMotion = useOS((s) => s.reduceMotion);
  const setReduceMotion = useOS((s) => s.setReduceMotion);
  const largeText = useOS((s) => s.largeText);
  const setLargeText = useOS((s) => s.setLargeText);
  const setFinish = useSetFinish();

  const pickTheme = (next: Theme, event: MouseEvent<HTMLElement>) => {
    if (next === theme) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setThemeWithReveal(next, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  };

  return (
    <>
      <AppScreen>
        <AppHeader title="Settings" />

        <Section label="Profile" inset={86}>
          <Row
            leading={
              <span aria-hidden className="relative my-1.5 block size-[58px] shrink-0 overflow-hidden rounded-full">
                <Image src={profile.avatar} {...blurOf(profile.avatar)} alt="" fill sizes="58px" className="object-cover" />
              </span>
            }
            title={<span className="text-ios-title-3 font-semibold">{profile.name}</span>}
            secondary="AI Educator, bio & links"
            onPush={() => openApp("settings", "profile")}
            data={{ "data-profile-row": "" }}
          />
        </Section>

        <Section header="Display & Brightness" inset={16}>
          <div role="radiogroup" onKeyDown={onRadioGroupKeyDown} aria-label="Appearance" className="flex justify-center gap-12 px-4 pt-4 pb-3">
            {(["light", "dark"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={theme === t}
                tabIndex={theme === t ? 0 : -1}
                aria-label={t === "light" ? "Light" : "Dark"}
                suppressHydrationWarning
                onClick={(e) => pickTheme(t, e)}
                className="flex flex-col items-center gap-2 transition-transform duration-150 ease-out active:scale-[0.96]"
              >
                <ThemePreview theme={t} />
                <span className="text-ios-subheadline font-medium capitalize">{t}</span>
                <span
                  aria-hidden
                  className={cn(
                    "grid size-[22px] place-items-center rounded-full border-[1.5px] transition-colors duration-150",
                    theme === t ? "border-transparent bg-ios-blue text-white" : "border-app-divider",
                  )}
                >
                  {theme === t && (
                    <svg viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="m2.5 6.2 2.3 2.3 4.7-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
              </button>
            ))}
          </div>
          <Row
            title="Dark mode"
            accessory={<Switch checked={theme === "dark"} label="Dark mode" onChange={(on) => setThemeWithReveal(on ? "dark" : "light")} />}
          />
        </Section>

        <Section header="Wallpaper">
          <div role="radiogroup" onKeyDown={onRadioGroupKeyDown} aria-label="Wallpaper" className="grid grid-cols-3 gap-3 p-4">
            {WALLPAPERS.map((w) => (
              <button
                key={w}
                type="button"
                role="radio"
                aria-checked={wallpaper === w}
                tabIndex={wallpaper === w ? 0 : -1}
                onClick={() => setWallpaper(w)}
                className="flex flex-col items-center gap-2 transition-transform duration-150 ease-out active:scale-[0.96]"
              >
                <span
                  aria-hidden
                  className={cn(
                    "block aspect-[9/16] w-full rounded-[12px] transition-shadow duration-150",
                    wallpaper === w
                      ? "shadow-[0_0_0_2px_var(--app-group),0_0_0_4px_var(--ios-blue)]"
                      : "shadow-[0_0_0_0.5px_var(--app-divider)]",
                  )}
                  style={{ background: WALLPAPER_INFO[w].preview }}
                />
                <span className="text-ios-footnote font-medium">{WALLPAPER_INFO[w].label}</span>
              </button>
            ))}
          </div>
        </Section>

        <Section header="Phone finish">
          <div role="radiogroup" onKeyDown={onRadioGroupKeyDown} aria-label="Phone finish" className="flex flex-wrap justify-around gap-y-3 px-4 py-4">
            {FINISHES.map((f) => (
              <button
                key={f}
                type="button"
                role="radio"
                aria-checked={finish === f}
                tabIndex={finish === f ? 0 : -1}
                onClick={() => setFinish(f)}
                className="flex flex-col items-center gap-2 transition-transform duration-150 ease-out active:scale-[0.94]"
              >
                <span
                  aria-hidden
                  className={cn(
                    "block size-11 rounded-full transition-shadow duration-150",
                    finish === f
                      ? "shadow-[0_0_0_2.5px_var(--app-group),0_0_0_4.5px_var(--ios-blue)]"
                      : "shadow-[inset_0_0_0_1px_rgb(0_0_0/0.12)]",
                  )}
                  style={{ background: `linear-gradient(150deg, ${FINISH_INFO[f].color}, ${FINISH_INFO[f].deep})` }}
                />
                <span className="text-ios-footnote font-medium">{FINISH_INFO[f].label}</span>
              </button>
            ))}
          </div>
        </Section>

        <Section
          header="Home Screen"
          footer="Or long-press the home screen: drag icons to move them, drop one on another to make a folder, and tap – to remove one."
        >
          <Row
            leading={<RowIcon glyph="sparkles" tint={TINT.purple} />}
            title="Edit Home Screen"
            onPush={() => {
              goHome();
              useOS.getState().setWiggle(true);
            }}
          />
          <Row
            leading={<RowIcon glyph="star" tint={TINT.blue} />}
            title="App Library"
            secondary="Every app and link, and the ones you removed"
            onPush={() => useOS.getState().setHomeSheet({ kind: "library" })}
          />
          <Row
            leading={<RowIcon glyph="toggles" tint={TINT.red} />}
            title={<span className="text-ios-red">Reset Home Screen</span>}
            onAction={() => useOS.getState().setHomeSheet({ kind: "reset" })}
          />
        </Section>

        <Section header="Accessibility" footer="Reduce motion swaps zooms and slides for gentle fades.">
          <Row
            leading={<RowIcon glyph="sparkles" tint={TINT.teal} />}
            title="Reduce motion"
            accessory={<Switch checked={reduceMotion} label="Reduce motion" onChange={setReduceMotion} />}
          />
          <Row
            leading={<RowIcon glyph="newspaper" tint={TINT.gray} />}
            title="Larger text"
            accessory={<Switch checked={largeText} label="Larger text" onChange={setLargeText} />}
          />
          <Row
            leading={<RowIcon glyph="gear" tint={TINT.gray} />}
            title="Control Center"
            secondary="Or pull down from the top-right corner of the screen."
            onPush={() => settlePanel(true)}
          />
        </Section>

        <Section header="General">
          <Row
            leading={<RowIcon glyph="gear" tint={TINT.gray} />}
            title="About this site"
            secondary="A portfolio you use like a phone. Every app is a section; open one from the home screen or press ⌘K to search."
          />
          <div className="py-2.5 pr-4 pl-[58px]">
            <p className="text-ios-body">Built with</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {TECH.map((t) => (
                <span key={t} className="rounded-full bg-app-background px-2.5 py-1 text-ios-footnote font-medium text-app-secondary">
                  {t}
                </span>
              ))}
            </div>
          </div>
          <Row leading={<RowIcon glyph="layers" tint={TINT.indigo} />} title="Credits" secondary={<span data-credits>{CREDITS}</span>} />
        </Section>
      </AppScreen>

      <PushView open={sub === "profile"} label="Profile">
        {shown === "profile" && <Profile />}
      </PushView>
    </>
  );
}
