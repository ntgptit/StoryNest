"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import type { ChapterBlock, ChapterBody } from "@storynest/validation";
import { Button } from "@storynest/ui/components/button";
import { MergeChoice } from "@storynest/ui/widgets/merge-choice";
import {
  applyMerge,
  chooseAll,
  isMergeResolved,
  planMerge,
  TITLE_CHOICE,
  type MergeChoices,
  type MergeConflict,
  type MergeSide,
} from "../model/draft-merge.ts";
import { editorText } from "../strings.ts";

const t = editorText.merge;

interface Version {
  title: string;
  body: readonly ChapterBlock[];
}

function BlockText({ block }: { block: ChapterBlock | null }) {
  if (!block) return <span className="text-muted-foreground italic">{t.missing}</span>;
  switch (block.type) {
    case "image":
      return <span className="text-muted-foreground">{t.image}</span>;
    case "divider":
      return <span className="text-muted-foreground">{t.divider}</span>;
    case "heading":
    case "paragraph":
      if (block.text === "") return <span className="text-muted-foreground italic">{t.emptyParagraph}</span>;
      return <span className={block.type === "heading" ? "font-semibold" : undefined}>{block.text}</span>;
  }
}

function ConflictContent({ conflict, side }: { conflict: MergeConflict; side: MergeSide }) {
  return (
    <>
      <BlockText block={side === "mine" ? conflict.mine : conflict.server} />
      {conflict.formattingOnly ? (
        <span className="font-sans text-xs text-muted-foreground"> ({t.formattingOnly})</span>
      ) : null}
    </>
  );
}

/**
 * Block-by-block merge of the author's unsaved copy with the server draft: one choice per block that differs (and
 * the title), "take all" shortcuts, and "use the merged version" once everything is decided. The merged text is
 * handed to the editor, which saves it like any other edit (against the server's revision).
 */
export function DraftMergeView({
  mine,
  server,
  onApply,
  onCancel,
}: {
  mine: Version;
  server: Version;
  onApply: (merged: { title: string; body: ChapterBody | [] }) => void;
  onCancel: () => void;
}) {
  const headingId = useId();
  const plan = useMemo(() => planMerge(mine, server), [mine, server]);
  const [choices, setChoices] = useState<MergeChoices>({});
  const choose = (key: string, side: MergeSide | undefined) => setChoices((current) => ({ ...current, [key]: side }));
  const total = plan.conflicts.length + (plan.title ? 1 : 0);
  const left = total - Object.values(choices).filter((side) => side !== undefined).length;
  const resolved = isMergeResolved(plan, choices);
  const sides = (render: (side: MergeSide) => ReactNode) => [
    { side: "mine" as const, label: t.mine, content: render("mine") },
    { side: "server" as const, label: t.server, content: render("server") },
  ];

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-4 rounded-md border bg-card p-4 text-sm text-card-foreground shadow-md"
    >
      <div className="flex flex-col gap-1">
        <h2 id={headingId} className="text-base font-semibold">
          {t.title}
        </h2>
        <p className="text-muted-foreground">{t.description}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => setChoices(chooseAll(plan, "mine"))}>
          {t.allMine}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setChoices(chooseAll(plan, "server"))}>
          {t.allServer}
        </Button>
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {resolved ? t.resolved : t.remaining(left)}
        </p>
      </div>
      <ol className="flex flex-col">
        {plan.title ? (
          <li className="border-b pb-4 mb-4 last:mb-0 last:border-0 last:pb-0">
            <MergeChoice
              label={t.titleGroup}
              chosen={choices[TITLE_CHOICE]}
              onChoose={(side) => choose(TITLE_CHOICE, side)}
              options={sides((side) => (
                <span className="font-semibold">{side === "mine" ? plan.title?.mine : plan.title?.server}</span>
              ))}
            />
          </li>
        ) : null}
        {plan.conflicts.map((conflict, index) => (
          <li key={conflict.id} className="border-b pb-4 mb-4 last:mb-0 last:border-0 last:pb-0">
            <MergeChoice
              label={t.block(index + 1)}
              chosen={choices[conflict.id]}
              onChoose={(side) => choose(conflict.id, side)}
              options={sides((side) => (
                <ConflictContent conflict={conflict} side={side} />
              ))}
            />
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={!resolved} onClick={() => onApply(applyMerge(plan, choices))}>
          {t.apply}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          {t.cancel}
        </Button>
      </div>
    </section>
  );
}
