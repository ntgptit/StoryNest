"use client";

import { Button } from "@storynest/ui/components/button";
import { LANGUAGES, setLanguage, useLanguage } from "../../_shared/index.ts";
import { shellText } from "../strings.ts";

/** Header control that moves to the next language (there are two). The whole page re-reads its text at once. */
export function LanguageSwitcher() {
  const language = useLanguage();
  const next = LANGUAGES[(LANGUAGES.indexOf(language) + 1) % LANGUAGES.length] ?? language;
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="px-2 text-xs font-semibold"
      aria-label={shellText.language.switchTo(shellText.language.names[next])}
      onClick={() => setLanguage(next)}
    >
      {language.toUpperCase()}
    </Button>
  );
}
