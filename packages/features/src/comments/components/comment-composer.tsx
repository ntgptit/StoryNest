"use client";

import { useEffect, useRef, useState } from "react";
import { formatCount, newId } from "@storynest/utils";
import { DB_LIMITS } from "@storynest/validation";
import { Button } from "@storynest/ui/components/button";
import { MentionTextarea } from "@storynest/ui/widgets/mention-textarea";
import { SubmitButton } from "@storynest/ui/widgets/submit-button";
import { useMentionCandidates } from "../hooks/use-comments.ts";
import { bodyProblemMessage, checkBody } from "../model/comment.ts";
import { MENTION_DEBOUNCE_MS } from "../model/mention.ts";
import { commentText } from "../strings.ts";
import { currentLocale } from "../../_shared/i18n.ts";

const t = commentText.composer;
/** The counter only appears when the limit is near, so it does not nag. */
const SHOW_COUNTER_FROM = DB_LIMITS.commentBody * 0.8;

/**
 * Text box for a comment, a reply or an edit. `onSubmit` gets the text and an id that stays the same for as long as
 * this text is being sent, so a retry after a lost answer cannot post twice; after a success the field is emptied and
 * the next text gets a new id. It rejects with the message to show. The send button shows a spinner while sending
 * and a check with `doneLabel` once the comment is in (SubmitButton); the check comes after the success, so it
 * never holds the new comment back. Typing @ offers people to mention (Lucian 268); the server tells them once the
 * comment is posted.
 */
export function CommentComposer({
  label,
  initial = "",
  submitLabel = t.submit,
  submittingLabel = t.submitting,
  doneLabel = t.done,
  autoFocus = false,
  onSubmit,
  onCancel,
}: {
  label: string;
  initial?: string;
  submitLabel?: string;
  submittingLabel?: string;
  doneLabel?: string;
  autoFocus?: boolean;
  onSubmit: (body: string, id: string) => Promise<void>;
  onCancel?: (() => void) | undefined;
}) {
  const [text, setText] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(0);
  const id = useRef(newId());
  const inputId = useRef(`comment-${newId()}`).current;
  const hintId = `${inputId}-hint`;
  const [typed, setTyped] = useState<string | null>(null);
  const [query, setQuery] = useState<string | null>(null);
  useEffect(() => {
    if (typed === null) {
      setQuery(null);
      return;
    }
    const timer = setTimeout(() => setQuery(typed), MENTION_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [typed]);
  const people = useMentionCandidates(query);

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
      setSent((count) => count + 1);
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
      <MentionTextarea
        id={inputId}
        value={text}
        onValueChange={setText}
        candidates={typed ? (people.data ?? []) : []}
        onQueryChange={setTyped}
        listLabel={t.mentions.list}
        emptyLabel={typed ? (people.isFetching ? commentText.loadingMore : t.mentions.empty) : t.mentions.typeName}
        notifyLabel={t.mentions.notify}
        autoFocus={autoFocus}
        placeholder={t.placeholder}
        aria-invalid={error !== null}
        aria-describedby={hintId}
        disabled={sending}
      />
      <div className="flex items-center justify-between gap-2">
        <p
          id={hintId}
          role={error ? "alert" : undefined}
          className={error ? "text-sm text-destructive" : "text-xs text-muted-foreground"}
        >
          {error ??
            (text.length >= SHOW_COUNTER_FROM
              ? t.count(formatCount(text.length, currentLocale()), formatCount(DB_LIMITS.commentBody, currentLocale()))
              : t.spoilerHint)}
        </p>
        <div className="flex gap-2">
          {onCancel ? (
            <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={sending}>
              {t.cancel}
            </Button>
          ) : null}
          <SubmitButton
            size="sm"
            label={submitLabel}
            busyLabel={submittingLabel}
            doneLabel={doneLabel}
            busy={sending}
            succeeded={sent}
          />
        </div>
      </div>
    </form>
  );
}
