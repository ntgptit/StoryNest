"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../_shared/auth.tsx";
import { useDataClientGetter } from "../../_shared/data.tsx";
import { toAppError, type AppError } from "../../_shared/errors.ts";
import { getReadingHabits, saveDailyGoal } from "../api/habits.api.ts";
import { readingHabitsKeys } from "../keys.ts";
import { clampGoal, withGoal, type ReadingHabits } from "../model/habits.ts";

function useUserId(): string | null {
  const auth = useAuth();
  return auth.status === "authenticated" ? auth.user.id : null;
}

/** The signed-in reader's habits; idle for a guest (guests have none: their reads are never attributed). */
export function useReadingHabits() {
  const getClient = useDataClientGetter();
  const userId = useUserId();
  return useQuery<ReadingHabits, AppError>({
    queryKey: readingHabitsKeys.account(userId ?? "guest"),
    queryFn: () => getReadingHabits(getClient(), userId ?? "").catch((e: unknown) => Promise.reject(toAppError(e))),
    enabled: userId !== null,
    // Reading happens on other pages: show fresh numbers whenever the panel is opened again.
    staleTime: 0,
  });
}

/**
 * Saves the daily goal. The rings follow at once; a refusal puts the previous goal back. Afterwards the habits are read
 * again, because a lower goal that today already meets earns the daily-goal badge on the server.
 */
export function useSaveDailyGoal() {
  const getClient = useDataClientGetter();
  const queryClient = useQueryClient();
  const userId = useUserId();
  const key = readingHabitsKeys.account(userId ?? "guest");
  return useMutation<void, AppError, number, { previous: ReadingHabits | undefined }>({
    mutationFn: async (goal) => {
      if (userId === null) throw toAppError(new Error("not signed in"));
      try {
        await saveDailyGoal(getClient(), userId, clampGoal(goal));
      } catch (error) {
        throw toAppError(error);
      }
    },
    onMutate: async (goal) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ReadingHabits>(key);
      if (previous) queryClient.setQueryData<ReadingHabits>(key, withGoal(previous, goal));
      return { previous };
    },
    onError: (_error, _goal, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}
