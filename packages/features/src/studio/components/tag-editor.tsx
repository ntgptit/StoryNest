"use client";

import { X } from "lucide-react";
import { useId, useState, type KeyboardEvent } from "react";
import { Badge } from "@storynest/ui/components/badge";
import { Button } from "@storynest/ui/components/button";
import { Input } from "@storynest/ui/components/input";
import { Label } from "@storynest/ui/components/label";
import { usePopularTags } from "../../discovery/index.ts";
import {
  MAX_STORY_TAGS,
  TAG_NAME_MAX_LENGTH,
  TAG_SUGGESTION_COUNT,
  addTags,
  removeTag,
  type TagChip,
  type TagProblem,
} from "../model/tags.ts";
import { studioText } from "../strings.ts";

const t = studioText.tags;

/**
 * Chips for a story's tags. Enter, a comma or leaving the field turns what was typed into tags (a pasted list too);
 * Backspace on an empty field removes the last one; the most used tags are offered as one-click suggestions so authors
 * reuse them instead of inventing near-duplicates. Nothing is saved here: the form saves the tags with the story.
 */
export function TagEditor({
  value,
  onChange,
  disabled = false,
  error,
}: {
  value: readonly TagChip[];
  onChange: (tags: TagChip[]) => void;
  disabled?: boolean;
  /** A problem from the last save (for example the daily quota), shown under the field. */
  error?: string | null | undefined;
}) {
  const inputId = useId();
  const hintId = useId();
  const [draft, setDraft] = useState("");
  const [problem, setProblem] = useState<TagProblem | null>(null);
  const popular = usePopularTags();

  const commit = (raw: string) => {
    if (raw.trim() === "") return;
    const result = addTags(value, raw);
    setProblem(result.problem);
    if (result.tags.length !== value.length) onChange(result.tags);
    setDraft("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commit(draft);
    } else if (event.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1));
      setProblem(null);
    }
  };

  const chosen = new Set(value.map((tag) => tag.slug));
  const suggestions = (popular.data ?? []).filter((tag) => !chosen.has(tag.slug)).slice(0, TAG_SUGGESTION_COUNT);
  const full = value.length >= MAX_STORY_TAGS;
  const message =
    problem === "invalid"
      ? t.problems.invalid(TAG_NAME_MAX_LENGTH)
      : problem === "tooMany"
        ? t.problems.tooMany(MAX_STORY_TAGS)
        : (error ?? null);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={inputId}>{t.label}</Label>
        <span className="text-xs text-muted-foreground">{t.count(value.length, MAX_STORY_TAGS)}</span>
      </div>

      {value.length > 0 ? (
        <ul aria-label={t.listLabel} className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <li key={tag.slug}>
              <Badge variant="secondary" className="gap-1 pr-1">
                #{tag.name}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-5 rounded-full"
                  aria-label={t.remove(tag.name)}
                  disabled={disabled}
                  onClick={() => {
                    onChange(removeTag(value, tag.slug));
                    setProblem(null);
                  }}
                >
                  <X aria-hidden className="size-3" />
                </Button>
              </Badge>
            </li>
          ))}
        </ul>
      ) : null}

      <Input
        id={inputId}
        value={draft}
        disabled={disabled || full}
        placeholder={t.placeholder}
        aria-describedby={hintId}
        aria-invalid={message !== null}
        autoComplete="off"
        onChange={(event) => {
          const next = event.target.value;
          if (/[,;\n]/.test(next)) commit(next);
          else setDraft(next);
        }}
        onKeyDown={onKeyDown}
        onBlur={() => commit(draft)}
      />
      <p id={hintId} className="text-xs text-muted-foreground">
        {t.hint(MAX_STORY_TAGS)}
      </p>
      {message ? (
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      ) : null}

      {suggestions.length > 0 && !full ? (
        <ul aria-label={t.suggestionsLabel} className="flex flex-wrap gap-1.5">
          {suggestions.map((tag) => (
            <li key={tag.slug}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 rounded-full px-3 text-xs"
                disabled={disabled}
                onClick={() => commit(tag.name)}
              >
                #{tag.name}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
