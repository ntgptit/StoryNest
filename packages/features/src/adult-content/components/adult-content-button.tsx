"use client";

import { ShieldAlert, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@storynest/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@storynest/ui/components/dialog";
import { useAdultContent } from "../hooks/use-adult-content.ts";
import { adultContentText } from "../strings.ts";

const t = adultContentText;

/**
 * Header control for adult content. Hidden by default; to show it the reader confirms they are 18 or older in a dialog
 * (the confirmation is only a statement: there is nothing to verify it against, so it is a clear choice, not a lock).
 */
export function AdultContentButton() {
  const { show, enable, disable } = useAdultContent();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={t.button}
        aria-pressed={show}
        onClick={() => setOpen(true)}
      >
        {show ? <ShieldCheck aria-hidden /> : <ShieldAlert aria-hidden />}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.dialog.title}</DialogTitle>
            <DialogDescription>{show ? t.dialog.shownDescription : t.dialog.hiddenDescription}</DialogDescription>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">{t.dialog.deviceNote}</p>
          <DialogFooter>
            {show ? (
              <Button
                type="button"
                onClick={() => {
                  disable();
                  setOpen(false);
                }}
              >
                {t.dialog.disable}
              </Button>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  {t.dialog.keepHidden}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    enable();
                    setOpen(false);
                  }}
                >
                  {t.dialog.enable}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
