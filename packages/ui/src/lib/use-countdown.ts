"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Whole seconds left of a cooldown that `restart()` starts (e.g. "Resend" locked for 60 s after an email went out).
 * Starts idle (0 left) until the first restart, unless `startNow` is set. Measured against the clock, so a tab that
 * slept in the background shows the right number when it wakes.
 */
export function useCountdown(seconds: number, { startNow = false } = {}): { left: number; restart: () => void } {
  const [until, setUntil] = useState<number | null>(() => (startNow ? Date.now() + seconds * 1000 : null));
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (until === null) return;
    const tick = () => {
      const current = Date.now();
      setNow(current);
      if (current >= until) setUntil(null);
    };
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [until]);

  const restart = useCallback(() => {
    const current = Date.now();
    setNow(current);
    setUntil(current + seconds * 1000);
  }, [seconds]);

  const left = until === null ? 0 : Math.max(0, Math.ceil((until - now) / 1000));
  return { left, restart };
}
