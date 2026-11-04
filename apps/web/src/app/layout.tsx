import type { Metadata, Viewport } from "next";

import { buildReaderBootstrapScript } from "@storynest/features";

import { CHAPTER_PATH_PATTERN } from "@/lib/routes";

import "./globals.css";
import { getSiteUrl } from "@/lib/site";
import { appText } from "@/lib/strings";

import { Providers } from "./providers";

export const metadata: Metadata = {
  // Makes every relative canonical and Open Graph URL absolute.
  metadataBase: getSiteUrl(),
  title: { default: appText.siteName, template: appText.titleTemplate },
  description: appText.siteDescription,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // required for the safe-area utilities (pt-safe, pb-safe) to have effect
  // The browser UI colour must be a literal; keep these in sync with --background in design-tokens.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fcfaf6" }, // token-check-ignore: meta tag needs a literal
    { media: "(prefers-color-scheme: dark)", color: "#1b1815" }, // token-check-ignore: meta tag needs a literal
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning on <html>: the bootstrap script below sets data-reader-* on it before hydration.
    <html lang="vi" suppressHydrationWarning>
      <head>
        {/* Applies the stored reader preferences on chapter pages while the page is parsed: no flash of the wrong background. */}
        <script dangerouslySetInnerHTML={{ __html: buildReaderBootstrapScript(CHAPTER_PATH_PATTERN) }} />
      </head>
      <body className="min-h-dvh">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
