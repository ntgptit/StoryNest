"use client";

import { BookOpen, Search } from "lucide-react";
import { useMediaQuery } from "@storynest/ui/lib/use-media-query";
import { CommandPalette, type PaletteGroup } from "@storynest/ui/widgets/command-palette";
import { useEffect, useState } from "react";
import { useAuth } from "../../_shared/auth.tsx";
import { useNavigation } from "../../_shared/platform.tsx";
import { storyHref } from "../../discovery/index.ts";
import {
  SUGGESTION_DELAY_MS,
  isSearchable,
  normalizeTerm,
  searchHref,
  useDebouncedValue,
  useSuggestions,
} from "../../search/index.ts";
import { filterCommands, isPaletteShortcut, paletteCommands } from "../model/palette.ts";
import { shellText } from "../strings.ts";

/**
 * Ctrl/Cmd+K command palette on desktop (Lucian 046): the navigation's sections and the header search's story
 * suggestions (same query, same pause) in one keyboard list, plus "see all results". Phones have no such key and keep
 * the header search; the shortcut is ignored while typing in a field or the editor.
 */
export function CommandPaletteLauncher() {
  const desktop = useMediaQuery("(min-width: 768px)");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!desktop) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isPaletteShortcut(event)) return;
      event.preventDefault();
      setOpen((current) => !current);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [desktop]);

  // Mounted only while open: every opening starts with an empty field and no stale suggestions.
  return open ? <Palette onClose={() => setOpen(false)} /> : null;
}

function Palette({ onClose }: { onClose: () => void }) {
  const navigation = useNavigation();
  const auth = useAuth();
  const t = shellText.palette;
  const [query, setQuery] = useState("");
  const term = normalizeTerm(query);
  const debounced = useDebouncedValue(term, SUGGESTION_DELAY_MS);
  const suggestions = useSuggestions(debounced);
  const stories = isSearchable(term) && isSearchable(debounced) ? (suggestions.data ?? []) : [];
  const go = (href: string) => () => navigation.push(href);

  const groups: PaletteGroup[] = [
    {
      key: "go",
      label: t.goTo,
      items: filterCommands(paletteCommands(auth.status === "authenticated"), term).map((command) => ({
        key: command.href,
        label: command.label,
        icon: command.icon,
        onSelect: go(command.href),
      })),
    },
    {
      key: "stories",
      label: t.stories,
      items: [
        ...stories.map((story) => ({
          key: story.id,
          label: story.title,
          icon: BookOpen,
          onSelect: go(storyHref(story)),
        })),
        ...(isSearchable(term)
          ? [{ key: "search-all", label: t.searchAll(term), icon: Search, onSelect: go(searchHref(term)) }]
          : []),
      ],
    },
  ];

  return (
    <CommandPalette
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      query={query}
      onQueryChange={setQuery}
      groups={groups}
      labels={{ title: t.title, input: t.input, placeholder: t.placeholder, empty: t.empty, results: t.results }}
      footer={
        <>
          <span>{t.hints.move}</span>
          <span>{t.hints.run}</span>
          <span>{t.hints.close}</span>
        </>
      }
    />
  );
}
