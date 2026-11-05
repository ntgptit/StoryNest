"use client";

import { SkySwitch } from "@storynest/ui/widgets/sky-switch";
import { useSiteTheme } from "../hooks/use-site-theme.ts";
import { toggledTheme } from "../model/site-theme.ts";
import { settingsText } from "../strings.ts";

/** Compact day/night switch for menus: on = dark. Flipping it chooses that theme explicitly on this device. */
export function ThemeSwitch({ className }: { className?: string }) {
  const { scheme, setTheme } = useSiteTheme();
  return (
    <SkySwitch
      night={scheme === "dark"}
      onNightChange={() => setTheme(toggledTheme(scheme))}
      label={settingsText.theme.darkSwitch}
      className={className}
    />
  );
}
