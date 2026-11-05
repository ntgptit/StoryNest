"use client";

import { ReadingHabitsPanel } from "@storynest/features";

/** The reader's own habits under the profile (client: they are private, read with the reader's session). */
export function MeHabits({ name }: { name?: string | undefined }) {
  return <ReadingHabitsPanel {...(name ? { name } : {})} />;
}
