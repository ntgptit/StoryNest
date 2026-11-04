import { serializeJsonLd } from "@/lib/seo/json-ld";

/** Structured data for search engines. Rendered on the server; the text is escaped so it cannot close the tag. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
