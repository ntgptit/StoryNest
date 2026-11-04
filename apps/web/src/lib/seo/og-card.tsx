import { appText } from "@/lib/strings";

export const OG_SIZE = { width: 1200, height: 630 } as const;

/**
 * The picture shown when a link is shared: an optional cover next to a heading and a line below it. The colours are
 * literals because an image has no access to the theme's CSS variables.
 */
export function OgCard({
  heading,
  line,
  coverUrl,
}: {
  heading: string;
  line?: string | undefined;
  coverUrl?: string | undefined;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        gap: 56,
        padding: 72,
        background: "#fcfaf6", // token-check-ignore: an image cannot read the CSS tokens
        color: "#1b1815", // token-check-ignore: an image cannot read the CSS tokens
      }}
    >
      {coverUrl ? (
        <img src={coverUrl} alt="" width={300} height={450} style={{ objectFit: "cover", borderRadius: 16 }} />
      ) : null}
      <div style={{ display: "flex", flexDirection: "column", gap: 24, flex: 1 }}>
        <div style={{ fontSize: 28, color: "#9a4a10" /* token-check-ignore */ }}>{appText.siteName}</div>
        <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.15 }}>{heading}</div>
        {line ? <div style={{ fontSize: 34, color: "#6b6258" /* token-check-ignore */ }}>{line}</div> : null}
      </div>
    </div>
  );
}
