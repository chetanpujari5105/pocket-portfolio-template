import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(165deg, #ffd23f, #f08a00)",
        }}
      >
        <svg width="110" height="110" viewBox="0 0 64 64">
          <path d="M36.5 8 17 36h12.5L26 56l21-29.5H34.2L36.5 8Z" fill="#1a1205" />
        </svg>
      </div>
    ),
    size,
  );
}
