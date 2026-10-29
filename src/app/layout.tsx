import type { Metadata, Viewport } from "next";
import { Archivo, Geist } from "next/font/google";
import { preload } from "react-dom";

import { ThemeSync } from "@/components/ui/theme-toggle";
import { appsLayout } from "@content/apps";
import { profile } from "@content/profile";
import { PACK_ICONS } from "@/lib/icon-pack";
import { SITE_URL } from "@/lib/site";
import { buildInitScript } from "@/lib/theme";
import "./globals.css";

// The UI face: the only font preloaded. Variable, so every weight is one file.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

// Expanded-width display face for the name and the lock-screen clock: swapped in when it lands
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
  preload: false,
});

const deepLinkApps = Object.keys(appsLayout.titles).filter(
  (id) => id !== "ask" || process.env.NEXT_PUBLIC_ENABLE_ASK === "true",
);

const { title, description } = profile.site;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: "/" },
  title,
  description,
  openGraph: {
    title,
    description,
    url: "/",
    siteName: profile.name,
    type: "website",
  },
  // Installed to the home screen it opens full screen; content already respects the safe areas
  appleWebApp: { capable: true, title: profile.site.shortName, statusBarStyle: "black-translucent" },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // The keyboard shrinks the layout (Android), so a focused field and Send stay in view
  interactiveWidget: "resizes-content",
  // Blends the browser bar into the wallpaper's top edge; <Phone> keeps it in step with the screen
  themeColor: "#0b0b0d",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // The icon pack's faces are CSS backgrounds, found late; ask for them with the page (~25 KB)
  for (const href of PACK_ICONS) preload(href, { as: "image", type: "image/webp" });
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${archivo.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: buildInitScript(deepLinkApps) }} />
      </head>
      <body className="min-h-full">
        <ThemeSync />
        {children}
      </body>
    </html>
  );
}
