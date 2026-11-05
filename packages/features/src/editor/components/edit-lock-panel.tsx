"use client";

import { useEffect, useState } from "react";
import { Button } from "@storynest/ui/components/button";
import { ControlHandoff, type HandoffPerson } from "@storynest/ui/widgets/control-handoff";
import { useAuth } from "../../_shared/auth.tsx";
import { useAppToast } from "../../_shared/toast.tsx";
import { useEditLock } from "../hooks/use-team-tools.ts";
import { lockState, type LockState } from "../model/edit-lock.ts";
import { editorText } from "../strings.ts";

const t = editorText.lock;

/** The current time, refreshed every few seconds, so an expired lock reads as free without waiting for the poll. */
function useNow(everyMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(timer);
  }, [everyMs]);
  return now;
}

function people(state: LockState, me: string | null): HandoffPerson[] {
  const self = { id: me ?? "me", name: t.you };
  switch (state.kind) {
    case "free":
      return [{ ...self, editing: false, asked: false }];
    case "mine":
      return [
        { ...self, editing: true, asked: false },
        ...(state.askedBy ? [{ ...state.askedBy, editing: false, asked: true }] : []),
      ];
    case "other":
      return [
        { ...state.holder, editing: true, asked: false },
        { ...self, editing: false, asked: state.askedByMe },
      ];
  }
}

/**
 * Who is editing this draft (Lucian 196's control hand-off, the lock part). Advisory: it never blocks typing or
 * saving, because the draft's revision check already refuses a save based on an older text. It shows the holder,
 * lets others ask for the control and lets the holder hand it over or keep it.
 */
export function EditLockPanel({ chapterId }: { chapterId: string }) {
  const toast = useAppToast();
  const auth = useAuth();
  const me = auth.status === "authenticated" ? auth.user.id : null;
  const { lock, action } = useEditLock(chapterId);
  const now = useNow(5_000);
  if (lock.isPending || lock.isError) return null;
  const state = lockState(lock.data, me, now);
  const run = (name: Parameters<typeof action.mutate>[0]) =>
    action.mutate(name, { onError: () => toast.error(t.errors.generic) });

  const status =
    state.kind === "free"
      ? t.status.free
      : state.kind === "mine"
        ? state.askedBy
          ? `${t.status.mine} ${t.status.askedYou(state.askedBy.name)}`
          : t.status.mine
        : state.askedByMe
          ? t.status.waiting(state.holder.name)
          : t.status.other(state.holder.name);

  return (
    <ControlHandoff
      label={t.label}
      editingLabel={t.editing}
      askedLabel={t.asked}
      people={people(state, me)}
      status={status}
    >
      {state.kind === "free" ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={action.isPending}
          onClick={() => run("claim_edit_lock")}
        >
          {t.take}
        </Button>
      ) : null}
      {state.kind === "other" && !state.askedByMe ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={action.isPending}
          onClick={() => run("request_edit_lock")}
        >
          {t.request}
        </Button>
      ) : null}
      {state.kind === "mine" && state.askedBy ? (
        <>
          <Button type="button" size="sm" disabled={action.isPending} onClick={() => run("hand_over_edit_lock")}>
            {t.handOver(state.askedBy.name)}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={action.isPending}
            onClick={() => run("decline_edit_request")}
          >
            {t.keep}
          </Button>
        </>
      ) : null}
    </ControlHandoff>
  );
}
