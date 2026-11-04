"use client";

import { Minus, Plus, Type } from "lucide-react";
import {
  READER_FONTS,
  READER_LINE_HEIGHTS,
  READER_THEMES,
  type ReaderFont,
  type ReaderLineHeight,
  type ReaderTheme,
} from "@storynest/validation";
import { Button } from "@storynest/ui/components/button";
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
import { canStepFontSize, stepFontSize } from "../model/preferences.ts";
import { readerText } from "../strings.ts";

const text = readerText.settings;

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

/** Reading options in a side sheet: size, line spacing, font and background. Every change is applied at once. */
export function ReaderSettingsSheet() {
  const { preferences, update } = useReaderPreferences();
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
          <div role="group" aria-label={text.fontSize} className="flex flex-col gap-2">
            <span className="text-sm font-medium">{text.fontSize}</span>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                size="icon"
                variant="outline"
                aria-label={text.smaller}
                disabled={!canStepFontSize(preferences.fontSize, -1)}
                onClick={() => update({ fontSize: stepFontSize(preferences.fontSize, -1) })}
              >
                <Minus aria-hidden className="size-4" />
              </Button>
              <output aria-live="polite" className="min-w-20 text-center text-sm">
                {text.sizeNames[preferences.fontSize]}
              </output>
              <Button
                type="button"
                size="icon"
                variant="outline"
                aria-label={text.larger}
                disabled={!canStepFontSize(preferences.fontSize, 1)}
                onClick={() => update({ fontSize: stepFontSize(preferences.fontSize, 1) })}
              >
                <Plus aria-hidden className="size-4" />
              </Button>
            </div>
          </div>
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
          <Choice<ReaderTheme>
            label={text.theme}
            values={READER_THEMES}
            current={preferences.theme}
            labelOf={(value) => text.themes[value]}
            onSelect={(theme) => update({ theme })}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
