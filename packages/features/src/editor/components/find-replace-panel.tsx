"use client";

import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import { useState } from "react";
import { FindReplaceBar } from "@storynest/ui/widgets/find-replace-bar";
import { findReplaceState } from "../model/find-replace.ts";
import { editorText } from "../strings.ts";

const t = editorText.find;

/**
 * The find-and-replace panel of the chapter editor, shown while the editor's search is open (the toolbar button or
 * Ctrl/Cmd+F in the text). The search itself lives in the editor (FindReplace extension); this only wires the bar.
 */
export function FindReplacePanel({ editor }: { editor: Editor }) {
  const search = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const s = findReplaceState(e.state);
      return {
        open: s.open,
        query: s.query,
        caseSensitive: s.caseSensitive,
        total: s.matches.length,
        current: s.current,
        requests: s.requests,
      };
    },
  });
  const [replacement, setReplacement] = useState("");
  const [replacedCount, setReplacedCount] = useState<number | null>(null);

  if (!search.open) return null;

  const status =
    replacedCount !== null
      ? t.replaced(replacedCount)
      : search.query === ""
        ? ""
        : search.total === 0
          ? t.noMatches
          : t.position(search.current + 1, search.total);

  const close = () => {
    editor.chain().closeFindReplace().focus().run();
    setReplacedCount(null);
  };

  return (
    <FindReplaceBar
      find={search.query}
      replace={replacement}
      caseSensitive={search.caseSensitive}
      current={search.current + 1}
      total={search.total}
      status={status}
      focusRequest={search.requests}
      labels={{
        region: t.region,
        find: t.find,
        replace: t.replace,
        caseSensitive: t.caseSensitive,
        previous: t.previous,
        next: t.next,
        replaceOne: t.replaceOne,
        replaceAll: t.replaceAll,
        close: t.close,
      }}
      onFindChange={(value) => {
        setReplacedCount(null);
        editor.commands.setFindQuery(value, search.caseSensitive);
      }}
      onReplaceChange={setReplacement}
      onCaseSensitiveChange={(value) => {
        setReplacedCount(null);
        editor.commands.setFindQuery(search.query, value);
      }}
      onNext={() => {
        setReplacedCount(null);
        editor.commands.findNext();
      }}
      onPrevious={() => {
        setReplacedCount(null);
        editor.commands.findPrevious();
      }}
      onReplace={() => {
        if (editor.commands.replaceCurrent(replacement)) setReplacedCount(1);
      }}
      onReplaceAll={() => {
        const count = search.total;
        if (editor.commands.replaceAll(replacement)) setReplacedCount(count);
      }}
      onClose={close}
    />
  );
}
