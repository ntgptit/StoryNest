import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ACHIEVEMENT_CODES, DAILY_GOAL } from "@storynest/validation";
import { AuthProvider } from "../_shared/auth.tsx";
import type { DataClient } from "../_shared/client.ts";
import { DataProvider } from "../_shared/data.tsx";
import { setLanguage } from "../_shared/i18n.ts";
import { PlatformProvider, type PlatformAdapter } from "../_shared/platform.tsx";
import { TEST_USER_ID, testSession, withAuth } from "../_shared/test-auth.ts";
import { ToastProvider } from "../_shared/toast.tsx";
import { getReadingHabits, saveDailyGoal } from "./api/habits.api.ts";
import { readingHabitsKeys } from "./keys.ts";
import {
  STATS_COLUMNS,
  levelFor,
  oldestDayNeeded,
  toAchievements,
  toHistory,
  toReadingHabits,
  toStreak,
  toWeek,
  utcDay,
  withGoal,
  xpFor,
  xpToNext,
  type DayRow,
  type StatsRow,
} from "./model/habits.ts";
import { DailyGoalSetting } from "./screens/daily-goal-setting.tsx";
import { ReadingHabitsPanel } from "./screens/reading-habits-panel.tsx";
import { ReadingStreakChip } from "./screens/reading-streak-chip.tsx";
import { readingHabitsText } from "./strings.ts";

const t = readingHabitsText;
// Thursday 5 Nov 2026, 10:00 UTC.
const NOW = new Date("2026-11-05T10:00:00Z");

const STATS: StatsRow = {
  current_streak: 4,
  longest_streak: 9,
  last_read_day: "2026-11-05",
  reading_days: 20,
  chapters_read: 30,
  chapters_finished: 12,
  stories_finished: 2,
};
const DAYS: DayRow[] = [
  { read_day: "2026-11-02", chapters_read: 1, chapters_finished: 0 },
  { read_day: "2026-11-03", chapters_read: 3, chapters_finished: 2 },
  { read_day: "2026-11-04", chapters_read: 2, chapters_finished: 1 },
  { read_day: "2026-11-05", chapters_read: 2, chapters_finished: 2 },
];

afterEach(cleanup);
beforeEach(() => setLanguage("vi", { persist: false }));

describe("reading habits model", () => {
  it("counts UTC days", () => {
    expect(utcDay(NOW)).toBe("2026-11-05");
    expect(utcDay(new Date("2026-11-05T23:30:00+07:00"))).toBe("2026-11-05");
    expect(utcDay(NOW, -5)).toBe("2026-10-31");
  });

  it("keeps a streak alive through today and yesterday only", () => {
    expect(toStreak(STATS, NOW)).toEqual({ current: 4, longest: 9, readToday: true });
    expect(toStreak({ ...STATS, last_read_day: "2026-11-04" }, NOW)).toEqual({
      current: 4,
      longest: 9,
      readToday: false,
    });
    expect(toStreak({ ...STATS, last_read_day: "2026-11-03" }, NOW)).toEqual({
      current: 0,
      longest: 9,
      readToday: false,
    });
    expect(toStreak(null, NOW)).toEqual({ current: 0, longest: 0, readToday: false });
  });

  it("lays out the Monday-to-Sunday week", () => {
    const week = toWeek(DAYS, NOW);
    expect(week.map((d) => d.day)).toEqual([
      "2026-11-02",
      "2026-11-03",
      "2026-11-04",
      "2026-11-05",
      "2026-11-06",
      "2026-11-07",
      "2026-11-08",
    ]);
    expect(week.map((d) => d.read)).toEqual([true, true, true, true, false, false, false]);
    expect(week.findIndex((d) => d.isToday)).toBe(3);
    expect(week.filter((d) => d.isFuture)).toHaveLength(3);
    // a day with only finished chapters (no read counted) does not keep a streak
    expect(toWeek([{ read_day: "2026-11-02", chapters_read: 0, chapters_finished: 1 }], NOW)[0]?.read).toBe(false);
  });

  it("fills the last seven days, today last", () => {
    const history = toHistory(DAYS, NOW);
    expect(history).toHaveLength(7);
    expect(history[0]).toEqual({ day: "2026-10-30", isToday: false, chaptersRead: 0, chaptersFinished: 0 });
    expect(history.at(-1)).toEqual({ day: "2026-11-05", isToday: true, chaptersRead: 2, chaptersFinished: 2 });
    expect(oldestDayNeeded(NOW)).toBe("2026-10-30");
    // on a Sunday the week reaches back further than the history
    expect(oldestDayNeeded(new Date("2026-11-08T12:00:00Z"))).toBe("2026-11-02");
  });

  it("derives XP and level by the documented rules", () => {
    expect(xpFor(STATS)).toBe(30 * 10 + 12 * 20 + 2 * 100);
    expect(xpFor(null)).toBe(0);
    expect([1, 2, 3].map(xpToNext)).toEqual([100, 150, 200]);
    expect(levelFor(0)).toEqual({ level: 1, into: 0, needed: 100, total: 0 });
    expect(levelFor(99).level).toBe(1);
    expect(levelFor(100)).toEqual({ level: 2, into: 0, needed: 150, total: 100 });
    // 740 = 100 + 150 + 200 + 250 + 40
    expect(levelFor(740)).toEqual({ level: 5, into: 40, needed: 300, total: 740 });
  });

  it("shows earned badges as earned and the progress of the locked ones", () => {
    const history = toHistory(DAYS, NOW);
    const list = toAchievements([{ code: "first_chapter", earned_at: "2026-10-01T00:00:00Z" }], STATS, history, 3);
    expect(list.map((a) => a.code)).toEqual([...ACHIEVEMENT_CODES]);
    const by = Object.fromEntries(list.map((a) => [a.code, a]));
    expect(by.first_chapter).toMatchObject({ earnedAt: "2026-10-01T00:00:00Z", progress: 1, target: 1 });
    expect(by.streak_7).toMatchObject({ earnedAt: null, progress: 7, target: 7 }); // capped, waits for the server
    expect(by.streak_30).toMatchObject({ progress: 9, target: 30 });
    expect(by.stories_10).toMatchObject({ progress: 2, target: 10 });
    expect(by.daily_goal).toMatchObject({ progress: 0, target: 1 });
    // an unknown code from a newer server is ignored rather than shown
    expect(toAchievements([{ code: "made_up", earned_at: "x" }], null, history, 3).every((a) => !a.earnedAt)).toBe(
      true,
    );
  });

  it("clamps the goal and moves only the daily-goal badge with it", () => {
    const habits = toReadingHabits({ stats: STATS, days: DAYS, achievements: [], goal: null }, NOW);
    expect(habits.goal).toBe(DAILY_GOAL.default);
    expect(toReadingHabits({ stats: null, days: [], achievements: [], goal: 99 }, NOW).goal).toBe(DAILY_GOAL.max);
    const lower = withGoal(habits, 2);
    expect(lower.goal).toBe(2);
    expect(lower.achievements.find((a) => a.code === "daily_goal")?.progress).toBe(1);
    expect(lower.achievements.find((a) => a.code === "streak_30")).toEqual(
      habits.achievements.find((a) => a.code === "streak_30"),
    );
    expect(withGoal(habits, 0).goal).toBe(DAILY_GOAL.min);
  });
});

type Result = { data: unknown; error: unknown };
function fakeClient(tables: Partial<Record<string, unknown>> = {}, errors: Partial<Record<string, unknown>> = {}) {
  const calls: { table: string; method: string; args: unknown[] }[] = [];
  const upsert = vi.fn(async (_row: unknown, _options?: unknown) => ({ data: null, error: null }) as Result);
  const from = vi.fn((table: string) => {
    const result = (): Result => ({ data: tables[table] ?? null, error: errors[table] ?? null });
    const chain: Record<string, unknown> = {};
    for (const method of ["select", "eq", "gte", "order"]) {
      chain[method] = (...args: unknown[]) => {
        calls.push({ table, method, args });
        return chain;
      };
    }
    chain.maybeSingle = async () => result();
    chain.then = (resolve: (r: Result) => unknown) => Promise.resolve(result()).then(resolve);
    chain.upsert = upsert;
    return chain;
  });
  return { from, upsert, calls };
}

const LOADED = {
  user_reading_stats: STATS,
  user_reading_days: DAYS,
  user_achievements: [{ code: "first_chapter", earned_at: "2026-10-01T00:00:00Z" }],
  user_settings: { daily_chapter_goal: 2 },
};

describe("reading habits api", () => {
  it("reads only the caller's own rows, from the oldest day it needs", async () => {
    const c = fakeClient(LOADED);
    const habits = await getReadingHabits(c as unknown as DataClient, "u1", NOW);
    expect(c.from.mock.calls.map(([table]) => table).sort()).toEqual([
      "user_achievements",
      "user_reading_days",
      "user_reading_stats",
      "user_settings",
    ]);
    expect(c.calls.filter((x) => x.method === "eq").every((x) => x.args[0] === "user_id" && x.args[1] === "u1")).toBe(
      true,
    );
    expect(c.calls).toContainEqual({ table: "user_reading_stats", method: "select", args: [STATS_COLUMNS] });
    expect(c.calls).toContainEqual({ table: "user_reading_days", method: "gte", args: ["read_day", "2026-10-30"] });
    expect(habits.goal).toBe(2);
    expect(habits.streak.current).toBe(4);
    expect(c.upsert).not.toHaveBeenCalled();
  });

  it("works for a reader with nothing yet", async () => {
    const habits = await getReadingHabits(fakeClient() as unknown as DataClient, "u1", NOW);
    expect(habits.level).toEqual({ level: 1, into: 0, needed: 100, total: 0 });
    expect(habits.achievements.every((a) => a.earnedAt === null)).toBe(true);
  });

  it("fails as an AppError", async () => {
    const c = fakeClient(LOADED, { user_reading_stats: { message: "denied", code: "42501" } });
    await expect(getReadingHabits(c as unknown as DataClient, "u1", NOW)).rejects.toMatchObject({ kind: "forbidden" });
  });

  it("saves the goal column only", async () => {
    const c = fakeClient();
    await saveDailyGoal(c as unknown as DataClient, "u1", 5);
    expect(c.upsert).toHaveBeenCalledWith({ user_id: "u1", daily_chapter_goal: 5 }, { onConflict: "user_id" });
  });

  it("keys habits by account", () => {
    expect(readingHabitsKeys.account("a")).not.toEqual(readingHabitsKeys.account("b"));
  });
});

const adapter: PlatformAdapter = {
  platform: "web",
  isNative: false,
  Link: ({ href, replace: _replace, children, ...rest }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useNavigation: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn(), pathname: "/me" }),
  appOrigin: () => "https://app.test",
  openExternal: vi.fn(),
};
const toasts = { show: vi.fn() };

function renderWith(client: ReturnType<typeof fakeClient>, node: React.ReactNode, signedIn = true) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <DataProvider client={withAuth(client, signedIn ? testSession() : null)}>
        <AuthProvider>
          <PlatformProvider adapter={adapter}>
            <ToastProvider port={toasts}>{node}</ToastProvider>
          </PlatformProvider>
        </AuthProvider>
      </DataProvider>
    </QueryClientProvider>,
  );
}

describe("reading habits screens", () => {
  it("shows the streak, rings, level and badges of the signed-in reader", async () => {
    const c = fakeClient(LOADED);
    renderWith(c, <ReadingHabitsPanel name="An" locale="vi" />);
    expect(await screen.findByRole("region", { name: t.streak.title })).toBeTruthy();
    expect(screen.getByRole("region", { name: t.rings.title })).toBeTruthy();
    expect(screen.getByRole("progressbar", { name: t.level.bar })).toBeTruthy();
    expect(screen.getByText(t.badges.count(1, 6))).toBeTruthy();
    expect(screen.getByRole("link", { name: t.rings.changeGoal }).getAttribute("href")).toBe("/settings");
    expect(c.calls.filter((x) => x.method === "eq").every((x) => x.args[1] === TEST_USER_ID)).toBe(true);
  });

  it("offers a retry when loading fails", async () => {
    renderWith(fakeClient(LOADED, { user_achievements: { message: "x", code: "XX000" } }), <ReadingHabitsPanel />);
    expect(await screen.findByRole("button", { name: t.error.retry })).toBeTruthy();
  });

  it("requests nothing for a guest", async () => {
    const c = fakeClient(LOADED);
    renderWith(c, <ReadingStreakChip />, false);
    await act(async () => undefined);
    expect(c.from).not.toHaveBeenCalledWith("user_reading_stats");
  });

  it("the library chip links to the profile with the streak and today's count", async () => {
    renderWith(fakeClient(LOADED), <ReadingStreakChip />);
    const link = await screen.findByRole("link", { name: t.chip.label(4, 2, 2) });
    expect(link.getAttribute("href")).toBe("/me");
  });

  it("steps the daily goal and saves it", async () => {
    const c = fakeClient(LOADED);
    renderWith(c, <DailyGoalSetting />);
    await screen.findByText(t.goal.value(2));
    fireEvent.click(screen.getByRole("button", { name: t.goal.increase }));
    await waitFor(() =>
      expect(c.upsert).toHaveBeenCalledWith(
        { user_id: TEST_USER_ID, daily_chapter_goal: 3 },
        { onConflict: "user_id" },
      ),
    );
  });
});
