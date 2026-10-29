import type { Platforms } from "./schema";

// ✏️ EDIT: where people can find your work. `url: null` shows the platform without a link.
// `handle` (optional) is shown under the name: it must be part of `url`, e.g. "youtube.com/@your_channel".
// Names with an official mark (Udemy, Skillshare, Coursera, Packt, O'Reilly, YouTube) show it.
export const platforms: Platforms = {
  primary: [
    { name: "Udemy", url: "https://example.com/udemy", handle: "example.com/udemy", logo: "U" },
    { name: "Skillshare", url: "https://example.com/skillshare", handle: "example.com/skillshare", logo: "S" },
    { name: "YouTube", url: "https://example.com/youtube", handle: "example.com/youtube", logo: "▶" },
  ],
  // ✏️ EDIT: partners that resell or distribute your work (or leave the list empty: [])
  distribution: ["Sample Partner One", "Sample Partner Two", "Sample Partner Three"],
};
