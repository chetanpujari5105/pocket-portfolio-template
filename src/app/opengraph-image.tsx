import { ImageResponse } from "next/og";

import { appsLayout } from "@content/apps";
import { profile } from "@content/profile";
import { countLabel } from "@/lib/utils";

export const alt = `${profile.name} — ${profile.role}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Original share card: the name beside a little phone of app tiles. */
export default function OpengraphImage() {
  const tiles = [...appsLayout.block, ...appsLayout.row, ...appsLayout.dock];
  const stats = [
    [countLabel(profile.stats.students), "students"],
    [`${profile.stats.platforms}+`, "platforms"],
    [`${profile.stats.countries}+`, "countries"],
  ];
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 96px",
        background: "radial-gradient(120% 90% at 30% 40%, #1d1e22, #0e0f11)",
        color: "#f5f5f7",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", maxWidth: 640 }}>
        <div
          style={{
            display: "flex",
            fontSize: 30,
            color: "#ffb800",
            fontWeight: 700,
            letterSpacing: 2,
          }}
        >
          POCKET PORTFOLIO
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 104,
            fontWeight: 800,
            lineHeight: 1,
            marginTop: 18,
            letterSpacing: -3,
          }}
        >
          {profile.firstName}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 104,
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: -3,
          }}
        >
          {profile.lastName}
          {/* Drawn bolt: emoji would need a network font at build time */}
          <svg
            width="74"
            height="86"
            viewBox="12 6 38 52"
            style={{ marginLeft: 14 }}
          >
            <path
              d="M36.5 8 17 36h12.5L26 56l21-29.5H34.2L36.5 8Z"
              fill="#ffb800"
            />
          </svg>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 32,
            color: "#a1a1a6",
            marginTop: 26,
          }}
        >
          {profile.role}
        </div>
        <div style={{ display: "flex", gap: 40, marginTop: 40 }}>
          {stats.map(([value, label]) => (
            <div
              key={label}
              style={{ display: "flex", flexDirection: "column" }}
            >
              <span style={{ fontSize: 44, fontWeight: 800 }}>{value}</span>
              <span style={{ fontSize: 22, color: "#8e8e93" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          width: 262,
          height: 540,
          borderRadius: 52,
          padding: 7,
          background: "linear-gradient(160deg, #ffd23f, #c98a00)",
          boxShadow: "0 40px 80px rgba(0,0,0,0.5)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignContent: "flex-start",
            gap: 13,
            width: "100%",
            height: "100%",
            borderRadius: 46,
            padding: "64px 24px 0",
            background: "linear-gradient(170deg, #3a2a05, #0b0905 60%)",
          }}
        >
          {tiles.map((t) => (
            <div
              key={t.id}
              style={{
                display: "flex",
                width: 40,
                height: 40,
                borderRadius: 10,
                background: `linear-gradient(160deg, ${t.colors[0]}, ${t.colors[1]})`,
              }}
            />
          ))}
        </div>
      </div>
    </div>,
    size,
  );
}
