"use client";

import { useCountdown } from "@storynest/ui/lib/use-countdown";
import { LockoutCountdown } from "@storynest/ui/widgets/lockout-countdown";
import { useCallback, useState, type ReactNode } from "react";
import type { AppError } from "../../_shared/errors.ts";
import { retryAfterSeconds } from "../model/messages.ts";
import { authText } from "../strings.ts";

/**
 * The wait a rate-limited auth call asked for (Lucian 067). `start(error)` begins it when the error named a number of
 * seconds and returns whether it did; `locked` keeps the submit button disabled until the time is up.
 */
export function useLockout() {
  const [total, setTotal] = useState<number | null>(null);
  const { left, restart } = useCountdown(0);
  const start = useCallback(
    (error: AppError): boolean => {
      const seconds = retryAfterSeconds(error);
      setTotal(seconds);
      if (seconds !== null) restart(seconds);
      return seconds !== null;
    },
    [restart],
  );
  const clear = useCallback(() => setTotal(null), []);
  return { total, left, locked: total !== null && left > 0, start, clear };
}

/** The countdown panel for a running (or just finished) lockout, or null when there is none. */
export function LockoutNotice({ lockout, action }: { lockout: ReturnType<typeof useLockout>; action?: ReactNode }) {
  if (lockout.total === null) return null;
  const t = authText.lockout;
  return (
    <LockoutCountdown
      secondsLeft={lockout.left}
      total={lockout.total}
      title={t.title}
      readyTitle={t.ready}
      waitingLabel={t.waiting}
      action={lockout.left > 0 ? action : undefined}
    />
  );
}
