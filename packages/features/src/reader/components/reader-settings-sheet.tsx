"use client";

import { Type } from "lucide-react";
import {
  READER_FONT_SIZES,
  READER_FONTS,
  READER_LINE_HEIGHTS,
  READER_THEMES,
  type ReaderFont,
  type ReaderLineHeight,
  type ReaderTheme,
} from "@storynest/validation";
import { revealFrom } from "@storynest/ui/lib/view-transition";
import { RollingStepper } from "@storynest/ui/widgets/rolling-stepper";
import { SwatchPicker } from "@storynest/ui/widgets/swatch-picker";
import { Button } from "@storynest/ui/components/button";
import { Label } from "@storynest/ui/components/label";
import { Switch } from "@storynest/ui/components/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@storynest/ui/components/sheet";
import { cn } from "@storynest/ui/lib/utils";
import { useReaderPreferences } from "../hooks/use-reader-preferences.ts";
import { useReaderFocusMode } from "../hooks/use-reader-focus.ts";
import { canStepFontSize, stepFontSize } from "../model/preferences.ts";
import { readerText } from "../strings.ts";

const text = readerText.settings;

/** Each background as its paper with a sample of its ink; "match app theme" is half light, half dark paper. */
const THEME_SWATCH: Record<ReaderTheme, string> = {
  site: "bg-[linear-gradient(135deg,var(--color-paper-light)_50%,var(--color-paper-dark)_50%)]",
  light: "bg-paper-light text-ink-light",
  sepia: "bg-paper-sepia text-ink-sepia",
  dark: "bg-paper-dark text-ink-dark",
};
/** Sample letters inside a swatch (not text to translate: a type specimen, like a font picker's). */
const SWATCH_SAMPLE = "Aa";

function Choice<T extends string>({
  label,
  values,
  current,
  labelOf,
  onSelect,
}: {
  label: string;
  values: readonly T[];
  current: T;
  labelOf: (value: T) => string;
  onSelect: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex flex-wrap gap-2">
        {values.map((value) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={value === current ? "default" : "outline"}
            aria-pressed={value === current}
            onClick={() => onSelect(value)}
          >
            {labelOf(value)}
          </Button>
        ))}
      </div>
    </div>
  );
}

/**
 * Reading options in a side sheet: size, line spacing, font and background, and focus mode. Every change is applied at
 * once. Focus mode is kept on this device only (it is not part of the preferences synced to the account).
 */
export function ReaderSettingsSheet() {
  const { preferences, update } = useReaderPreferences();
  const focus = useReaderFocusMode();
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm">
          <Type aria-hidden className="size-4" />
          {text.open}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[min(22rem,90vw)] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{text.title}</SheetTitle>
          <SheetDescription>{text.description}</SheetDescription>
        </SheetHeader>
        <div className={cn("flex flex-col gap-6 px-4 pb-6")}>
          <RollingStepper
            label={text.fontSize}
            valueText={text.sizeNames[preferences.fontSize]}
            position={READER_FONT_SIZES.indexOf(preferences.fontSize)}
            canDecrease={canStepFontSize(preferences.fontSize, -1)}
            canIncrease={canStepFontSize(preferences.fontSize, 1)}
            onStep={(direction) => update({ fontSize: stepFontSize(preferences.fontSize, direction) })}
            decreaseLabel={text.smaller}
            increaseLabel={text.larger}
          />
          <Choice<ReaderLineHeight>
            label={text.lineHeight}
            values={READER_LINE_HEIGHTS}
            current={preferences.lineHeight}
            labelOf={(value) => text.lineHeights[value]}
            onSelect={(lineHeight) => update({ lineHeight })}
          />
          <Choice<ReaderFont>
            label={text.font}
            values={READER_FONTS}
            current={preferences.font}
            labelOf={(value) => text.fonts[value]}
            onSelect={(font) => update({ font })}
          />
          <SwatchPicker<ReaderTheme>
            label={text.theme}
            value={preferences.theme}
            options={READER_THEMES.map((value) => ({
              value,
              label: text.themes[value],
              className: THEME_SWATCH[value],
              content: value === "site" ? null : SWATCH_SAMPLE,
            }))}
            // The new background spreads out in a circle from the pressed swatch (instant with reduced motion).
            onChange={(theme, swatch) => revealFrom(swatch, () => update({ theme }))}
          />
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="reader-focus-mode">{text.focus}</Label>
              <p id="reader-focus-mode-hint" className="text-xs text-muted-foreground">
                {text.focusHint}
              </p>
            </div>
            <Switch
              id="reader-focus-mode"
              aria-describedby="reader-focus-mode-hint"
              checked={focus.on}
              onCheckedChange={focus.setOn}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
