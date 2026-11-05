// Text of the reading-habits feature (streak, daily goal, level, badges). Single module so i18n replaces it in one change.
import { defineText } from "../_shared/i18n.ts";
import { en } from "./strings.en.ts";

const vi = {
  title: "Thói quen đọc",
  description: "Chỉ mình bạn thấy phần này.",
  error: { title: "Không tải được thói quen đọc", description: "Kiểm tra kết nối và thử lại.", retry: "Thử lại" },
  streak: {
    title: "Chuỗi ngày đọc",
    unit: (_days: number) => "ngày liên tiếp",
    fullWeek: "Đủ tuần!",
    week: "Tuần này",
    day: (weekday: string, read: boolean, today: boolean) =>
      `${weekday}${today ? " (hôm nay)" : ""}: ${read ? "đã đọc" : "chưa đọc"}`,
    keepGoing: "Đọc một chương hôm nay để giữ chuỗi.",
    doneToday: "Hôm nay bạn đã đọc. Hẹn gặp lại ngày mai!",
    longest: (days: number) => `Dài nhất: ${days} ngày`,
  },
  rings: {
    title: "Mục tiêu hằng ngày",
    group: "Vòng của ngày đang chọn",
    days: "Chọn ngày",
    read: "Chương đã đọc",
    finished: "Chương đọc xong",
    value: (value: number, goal: number) => `${value} / ${goal} chương`,
    today: "Hôm nay",
    dayLabel: (date: string, read: number, finished: number, goal: number) =>
      `${date}: đã đọc ${read}/${goal} chương, đọc xong ${finished}/${goal} chương`,
    summary: (days: number) => `Số ngày đạt mục tiêu trong 7 ngày qua: ${days}`,
    changeGoal: "Đổi mục tiêu",
  },
  level: {
    name: "Cấp độ đọc",
    subtitle: (chapters: number, days: number) => `${chapters} chương · ${days} ngày đọc`,
    level: "CẤP",
    bar: "Kinh nghiệm",
    progress: (into: number, needed: number) => `${into} / ${needed} XP`,
    toNext: (left: number) => `Còn ${left} XP lên cấp`,
    levelUp: "Lên cấp!",
    rules: { chapterRead: "Đọc một chương", chapterFinished: "Đọc xong chương", storyFinished: "Xong một truyện" },
    xp: (xp: number) => `+${xp} XP`,
  },
  badges: {
    title: "Huy hiệu",
    count: (earned: number, total: number) => `${earned}/${total} đã đạt`,
    locked: (name: string, progress: number, target: number) => `${name}: chưa đạt, ${progress}/${target}`,
    flip: (name: string, earned: string, description: string) => `${name}. ${earned}. ${description}`,
    earnedOn: (date: string) => `Đạt ngày ${date}`,
    items: {
      first_chapter: { name: "Chương đầu", description: "Đọc xong chương đầu tiên" },
      daily_goal: { name: "Đạt mục tiêu", description: "Đạt mục tiêu đọc trong một ngày" },
      streak_7: { name: "Bền bỉ", description: "Đọc 7 ngày liên tiếp" },
      streak_30: { name: "Không ngừng", description: "Đọc 30 ngày liên tiếp" },
      first_story: { name: "Trọn vẹn", description: "Đọc xong một truyện đã hoàn thành" },
      stories_10: { name: "Mọt sách", description: "Đọc xong 10 truyện đã hoàn thành" },
    },
  },
  chip: {
    label: (streak: number, read: number, goal: number) =>
      `Chuỗi ${streak} ngày, hôm nay ${read}/${goal} chương. Xem thói quen đọc`,
    days: (streak: number) => `${streak} ngày`,
    today: (read: number, goal: number) => `${read}/${goal} hôm nay`,
  },
  goal: {
    title: "Mục tiêu đọc",
    description: "Số chương bạn muốn đọc mỗi ngày. Chỉ mình bạn thấy.",
    label: "Chương mỗi ngày",
    value: (goal: number) => `${goal} chương/ngày`,
    decrease: "Giảm mục tiêu",
    increase: "Tăng mục tiêu",
    saveFailed: "Không lưu được mục tiêu. Vui lòng thử lại.",
  },
} as const;

export const readingHabitsText = defineText("reading-habits", vi, en);
