"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import type { ModerationAction, ReportReason, ReportStatus } from "@storynest/validation";
import { useAuth } from "../../_shared/auth.tsx";
import { useDataClientGetter } from "../../_shared/data.tsx";
import { toAppError, type AppError } from "../../_shared/errors.ts";
import {
  listMyReports,
  listTargetHistory,
  listReports,
  moderate,
  resolveReport,
  submitReport,
  withdrawReport,
} from "../api/moderation.api.ts";
import { moderationKeys } from "../keys.ts";
import { isOpenReport, type MyReport } from "../model/my-reports.ts";
import type { TargetAction } from "../model/target-history.ts";
import { reportCursorAfter, type QueueFilter, type ReportPage, type ReportTarget } from "../model/report.ts";

type Pages = InfiniteData<ReportPage, { createdAt: string; id: string } | undefined>;

/** Whether the signed-in account is a moderator. For showing the right menu only: the database decides what is allowed. */
export function useIsModerator(): boolean {
  const auth = useAuth();
  return auth.status === "authenticated" && auth.user.app_metadata?.role === "moderator";
}

/** The signed-in account's own reports, for the "Reported" state and the My reports page. Idle for guests. */
export function useMyReports() {
  const getClient = useDataClientGetter();
  const auth = useAuth();
  const userId = auth.status === "authenticated" ? auth.user.id : null;
  return useQuery<MyReport[], AppError>({
    queryKey: moderationKeys.mine(userId ?? "none"),
    queryFn: () => listMyReports(getClient(), userId ?? "").catch((e: unknown) => Promise.reject(toAppError(e))),
    enabled: userId !== null,
  });
}

/** Whether the account already has an open report of this thing (then the button says so). */
/** The moderation history of one target. Loaded only when asked for (the panel's "show history"). */
export function useTargetHistory(targetId: string, enabled: boolean) {
  const getClient = useDataClientGetter();
  return useQuery<TargetAction[], AppError>({
    queryKey: moderationKeys.history(targetId),
    queryFn: () => listTargetHistory(getClient(), targetId).catch((e: unknown) => Promise.reject(toAppError(e))),
    enabled,
    staleTime: 0,
  });
}

/** "Withdraw report" on the reporter's list; the list is read again afterwards. */
export function useWithdrawReport() {
  const getClient = useDataClientGetter();
  const queryClient = useQueryClient();
  return useMutation<void, AppError, string>({
    mutationFn: async (reportId) => {
      try {
        await withdrawReport(getClient(), reportId);
      } catch (error) {
        throw toAppError(error);
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: [...moderationKeys.all, "mine"] }),
  });
}

export function useHasOpenReport(kind: ReportTarget, targetId: string): boolean {
  const reports = useMyReports();
  return (reports.data ?? []).some(
    (report) => report.kind === kind && report.targetId === targetId && isOpenReport(report),
  );
}

export function useSubmitReport() {
  const getClient = useDataClientGetter();
  const queryClient = useQueryClient();
  return useMutation<
    string,
    AppError,
    { kind: ReportTarget; targetId: string; reason: ReportReason; description: string }
  >({
    mutationFn: async (input) => {
      try {
        return await submitReport(getClient(), input);
      } catch (error) {
        throw toAppError(error);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...moderationKeys.all, "mine"] }),
  });
}

export function useReportQueue(filter: QueueFilter) {
  const getClient = useDataClientGetter();
  const auth = useAuth();
  const userId = auth.status === "authenticated" ? auth.user.id : null;
  return useInfiniteQuery<
    ReportPage,
    AppError,
    Pages,
    readonly unknown[],
    { createdAt: string; id: string } | undefined
  >({
    queryKey: moderationKeys.queue(userId ?? "none", filter),
    initialPageParam: undefined,
    queryFn: ({ pageParam }) =>
      listReports(getClient(), { filter, cursor: pageParam }).catch((e: unknown) => Promise.reject(toAppError(e))),
    getNextPageParam: reportCursorAfter,
    enabled: userId !== null,
  });
}

/** What changes with any moderation write: every queue reloads (an item moves from "open" to "closed"). */
function useRefreshQueue() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: moderationKeys.all });
}

export function useModerate() {
  const getClient = useDataClientGetter();
  const refresh = useRefreshQueue();
  return useMutation<
    string,
    AppError,
    { action: ModerationAction; targetId: string; reason: string; reportId: string }
  >({
    mutationFn: async (input) => {
      try {
        return await moderate(getClient(), input);
      } catch (error) {
        throw toAppError(error);
      }
    },
    onSettled: refresh,
  });
}

export function useResolveReport() {
  const getClient = useDataClientGetter();
  const refresh = useRefreshQueue();
  return useMutation<
    void,
    AppError,
    { reportId: string; status: Extract<ReportStatus, "reviewing" | "resolved" | "dismissed">; reason: string }
  >({
    mutationFn: async (input) => {
      try {
        await resolveReport(getClient(), input);
      } catch (error) {
        throw toAppError(error);
      }
    },
    onSettled: refresh,
  });
}
