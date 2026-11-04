"use client";

import { useRef, useState } from "react";
import { formatCount, newId } from "@storynest/utils";
import { DB_LIMITS } from "@storynest/validation";
import { Button } from "@storynest/ui/components/button";
import { Textarea } from "@storynest/ui/components/textarea";
import { bodyProblemMessage, checkBody } from "../model/comment.ts";
import { commentText } from "../strings.ts";

const t = commentText.composer;
/** The counter only appears when the limit is near, so it does not nag. */
const SHOW_COUNTER_FROM = DB_LIMITS.commentBody * 0.8;

/**
 * Text box for a comment, a reply or an edit. `onSubmit` gets the text and an id that stays the same for as long as
 * this text is being sent, so a retry after a lost answer cannot post twice; after a success the field is emptied and
 * the next text gets a new id. It rejects with the message to show.
 */
export function CommentComposer({
  label,
  initial = "",
  submitLabel = t.submit,
  submittingLabel = t.submitting,
  autoFocus = false,
  onSubmit,
  onCancel,
}: {
  label: string;
  initial?: string;
  submitLabel?: string;
  submittingLabel?: string;
  autoFocus?: boolean;
  onSubmit: (body: string, id: string) => Promise<void>;
  onCancel?: (() => void) | undefined;
}) {
  const [text, setText] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const id = useRef(newId());
  const inputId = useRef(`comment-${newId()}`).current;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (sending) return;
    const problem = checkBody(text);
    if (problem) {
      setError(bodyProblemMessage(problem));
      return;
    }
    setError(null);
    setSending(true);
    try {
      await onSubmit(text.trim(), id.current);
      setText(initial);
      id.current = newId();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : commentText.errors.generic);
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-2" aria-busy={sending}>
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <Textarea
        id={inputId}
        value={text}
        autoFocus={autoFocus}
        placeholder={t.placeholder}
        aria-invalid={error !== null}
        disabled={sending}
        onChange={(event) => setText(event.target.value)}
      />
      <div className="flex items-center justify-between gap-2">
        <p
          role={error ? "alert" : undefined}
          className={error ? "text-sm text-destructive" : "text-xs text-muted-foreground"}
        >
          {error ??
            (text.length >= SHOW_COUNTER_FROM
              ? t.count(formatCount(text.length, "vi"), formatCount(DB_LIMITS.commentBody, "vi"))
              : "")}
        </p>
        <div className="flex gap-2">
          {onCancel ? (
            <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={sending}>
              {t.cancel}
            </Button>
          ) : null}
          <Button type="submit" size="sm" disabled={sending}>
            {sending ? submittingLabel : submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}
