"use client";

import { useSyncExternalStore } from "react";
import { useMediaQuery } from "@storynest/ui/lib/use-media-query";

const noSubscribe = () => () => undefined;

/** True when the web app runs installed (its own window, no browser address bar): display-mode standalone or iOS. */
export function useStandaloneDisplay(): boolean {
  const standalone = useMediaQuery("(display-mode: standalone)");
  const iosStandalone = useSyncExternalStore(
    noSubscribe,
    () => (navigator as Navigator & { standalone?: boolean }).standalone === true,
    () => false,
  );
  return standalone || iosStandalone;
}
