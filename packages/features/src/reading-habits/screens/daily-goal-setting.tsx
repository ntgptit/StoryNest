"use client";

import { Skeleton } from "@storynest/ui/components/skeleton";
import { RollingStepper } from "@storynest/ui/widgets/rolling-stepper";
import { DAILY_GOAL } from "@storynest/validation";
import { useAppToast } from "../../_shared/toast.tsx";
import { useReadingHabits, useSaveDailyGoal } from "../hooks/use-reading-habits.ts";
import { readingHabitsText } from "../strings.ts";

const t = readingHabitsText;

/**
 * The daily reading goal (chapters a day, 1 to 20) for the settings page. Saved on every step; the profile rings follow
 * at once and a refused save puts the previous goal back with a toast.
 */
export function DailyGoalSetting() {
  const habits = useReadingHabits();
  const save = useSaveDailyGoal();
  const toast = useAppToast();
  if (!habits.data) return <Skeleton className="h-11 w-56 rounded-lg" aria-busy />;
  const goal = habits.data.goal;
  return (
    <RollingStepper
      label={t.goal.label}
      valueText={t.goal.value(goal)}
      position={goal}
      canDecrease={goal > DAILY_GOAL.min}
      canIncrease={goal < DAILY_GOAL.max}
      onStep={(direction) => save.mutate(goal + direction, { onError: () => toast.error(t.goal.saveFailed) })}
      decreaseLabel={t.goal.decrease}
      increaseLabel={t.goal.increase}
    />
  );
}
