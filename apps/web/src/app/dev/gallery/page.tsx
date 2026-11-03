import { notFound } from "next/navigation";

import { Gallery } from "./gallery";

export const metadata = { title: "Component gallery", robots: { index: false, follow: false } };

/** Development-only catalogue of every shared primitive and widget in all states. Absent from production builds' routes. */
export default function GalleryPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Gallery />;
}
