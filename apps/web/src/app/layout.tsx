import type { Metadata, Viewport } from "next";

import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: { default: "StoryNest", template: "%s · StoryNest" },
  description: "Đọc và đăng truyện trực tuyến.",
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
    <html lang="vi">
      <body className="min-h-dvh">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
