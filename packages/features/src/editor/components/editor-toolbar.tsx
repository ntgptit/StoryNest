"use client";

import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import {
  Bold,
  Heading2,
  ImagePlus,
  Italic,
  Minus,
  Redo2,
  Strikethrough,
  TextSearch,
  Underline,
  Undo2,
} from "lucide-react";
import { useRef, type ComponentType } from "react";
import { Button } from "@storynest/ui/components/button";
import { ShortcutTooltip, ToolbarTooltips, type Shortcut } from "@storynest/ui/widgets/shortcut-tooltip";
import { IMAGE_ACCEPTED_TYPES } from "../../_shared/image-prepare.ts";
import { findReplaceState } from "../model/find-replace.ts";
import { editorText } from "../strings.ts";

const t = editorText.toolbar;

type Item = {
  /** Stable name (the find button is also a target of the first-run tour). */
  id: string;
  label: string;
  /** The editor's own keyboard shortcut, shown in the tooltip. */
  shortcut?: Shortcut;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  active?: boolean;
  /** For a button that opens a panel: whether it is open (aria-expanded instead of aria-pressed). */
  expanded?: boolean;
  disabled?: boolean;
  run: () => void;
};

/**
 * Formatting buttons for exactly what a chapter body can hold. State comes from the editor, so it follows the cursor.
 * Each icon button has a tooltip with its name and shortcut (Lucian 076: one provider, so it moves along the row).
 */
export function EditorToolbar({
  editor,
  onImage,
  imageBusy = false,
}: {
  editor: Editor;
  /** Called with the file the author picked; without it there is no picture button. */
  onImage?: ((file: File) => void) | undefined;
  imageBusy?: boolean;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      heading: e.isActive("heading"),
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
      finding: findReplaceState(e.state).open,
    }),
  });

  const items: Item[] = [
    {
      id: "heading",
      label: t.heading,
      shortcut: ["Mod", "Alt", "2"],
      icon: Heading2,
      active: state.heading,
      run: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      id: "bold",
      label: t.bold,
      shortcut: ["Mod", "B"],
      icon: Bold,
      active: state.bold,
      run: () => editor.chain().focus().toggleBold().run(),
    },
    {
      id: "italic",
      label: t.italic,
      shortcut: ["Mod", "I"],
      icon: Italic,
      active: state.italic,
      run: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      id: "underline",
      shortcut: ["Mod", "U"],
      label: t.underline,
      icon: Underline,
      active: state.underline,
      run: () => editor.chain().focus().toggleUnderline().run(),
    },
    {
      id: "strike",
      shortcut: ["Mod", "Shift", "S"],
      label: t.strike,
      icon: Strikethrough,
      active: state.strike,
      run: () => editor.chain().focus().toggleStrike().run(),
    },
    { id: "divider", label: t.divider, icon: Minus, run: () => editor.chain().focus().setHorizontalRule().run() },
    ...(onImage
      ? [
          {
            id: "image",
            label: imageBusy ? t.imageUploading : t.image,
            icon: ImagePlus,
            disabled: imageBusy,
            run: () => fileInput.current?.click(),
          },
        ]
      : []),
    {
      id: "find",
      shortcut: ["Mod", "F"],
      label: t.find,
      icon: TextSearch,
      expanded: state.finding,
      run: () => (state.finding ? editor.chain().closeFindReplace().focus().run() : editor.commands.openFindReplace()),
    },
    {
      id: "undo",
      label: t.undo,
      shortcut: ["Mod", "Z"],
      icon: Undo2,
      disabled: !state.canUndo,
      run: () => editor.chain().focus().undo().run(),
    },
    {
      id: "redo",
      label: t.redo,
      shortcut: ["Mod", "Shift", "Z"],
      icon: Redo2,
      disabled: !state.canRedo,
      run: () => editor.chain().focus().redo().run(),
    },
  ];

  return (
    <ToolbarTooltips>
      <div
        role="toolbar"
        aria-label={t.label}
        className="flex flex-wrap items-center gap-1 rounded-lg border bg-card p-1"
      >
        {items.map(({ id, label, shortcut, icon: Icon, active, expanded, disabled, run }) => (
          <ShortcutTooltip key={id} label={label} shortcut={shortcut}>
            <Button
              type="button"
              size="icon"
              variant={active || expanded ? "secondary" : "ghost"}
              aria-label={label}
              aria-pressed={active === undefined ? undefined : active}
              aria-expanded={expanded}
              disabled={disabled}
              // The toolbar must not take focus away from the text (it would lose the selection on some browsers).
              onMouseDown={(event) => event.preventDefault()}
              onClick={run}
              data-tool={id}
            >
              <Icon aria-hidden className="size-4" />
            </Button>
          </ShortcutTooltip>
        ))}
        {onImage ? (
          <input
            ref={fileInput}
            type="file"
            accept={IMAGE_ACCEPTED_TYPES.join(",")}
            aria-label={t.imageInput}
            className="sr-only"
            tabIndex={-1}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = ""; // picking the same file again must still fire
              if (file) onImage(file);
            }}
          />
        ) : null}
      </div>
    </ToolbarTooltips>
  );
}
