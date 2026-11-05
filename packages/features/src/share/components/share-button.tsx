"use client";

import { Share2 } from "lucide-react";
import { useState, type ComponentProps } from "react";
import { Button } from "@storynest/ui/components/button";
import { ShareDialog, type ShareAccess } from "@storynest/ui/widgets/share-dialog";
import { usePlatform } from "../../_shared/platform.tsx";
import { useAppToast } from "../../_shared/toast.tsx";
import { canShareNatively, shareNatively, shareUrl } from "../model/share-url.ts";
import { shareText } from "../strings.ts";

/**
 * "Share" button that opens the share dialog for one page of the app: the page's absolute link (built on the
 * platform's share origin, the same as the canonical URL) with Copy, and the system share sheet where there is one.
 * A reading list also passes `access`, so its owner sees and changes who can open the link.
 */
export function ShareButton<V extends string = string>({
  path,
  name,
  description,
  access,
  variant = "outline",
  size,
}: {
  /** App path of the page, e.g. storyHref(story). */
  path: string;
  /** What is shared (story title, list name, author name): goes into the dialog title and the share sheet. */
  name: string;
  /** Who can open the link, in one sentence. */
  description: string;
  access?: ShareAccess<V> | undefined;
  variant?: ComponentProps<typeof Button>["variant"];
  size?: ComponentProps<typeof Button>["size"];
}) {
  const platform = usePlatform();
  const toast = useAppToast();
  const [open, setOpen] = useState(false);
  // Built when the dialog opens (the origin may come from window), and kept while it closes.
  const [url, setUrl] = useState("");

  return (
    <ShareDialog
      open={open}
      onOpenChange={(next) => {
        if (next) setUrl(shareUrl(platform.shareOrigin ? platform.shareOrigin() : platform.appOrigin(), path));
        setOpen(next);
      }}
      trigger={
        <Button type="button" variant={variant} size={size} className="px-3">
          <Share2 aria-hidden />
          {shareText.open}
        </Button>
      }
      title={shareText.title(name)}
      description={description}
      url={url}
      linkLabel={shareText.linkLabel}
      copyLabel={shareText.copy}
      copiedLabel={shareText.copied}
      onCopyFailed={() => toast.error(shareText.copyFailed)}
      access={access}
      nativeShare={
        open && canShareNatively()
          ? {
              label: shareText.native,
              onShare: () =>
                void shareNatively({ title: name, url }).then((ok) => {
                  if (!ok) toast.error(shareText.nativeFailed);
                }),
            }
          : undefined
      }
    />
  );
}
