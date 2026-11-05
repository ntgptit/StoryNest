// Text of the author statistics. Single module so WBS WP 0.4 (i18n) can replace it in one change.
import { defineText } from "../_shared/i18n.ts";
import { en } from "./strings.en.ts";

const vi = {
  title: "Thống kê truyện",
  description: "Người đọc truyện của bạn và nơi họ dừng lại.",
  back: "Về Studio",
  signIn: "Đăng nhập để xem thống kê.",
  signInLink: "Đăng nhập",
  noAccess: {
    title: "Bạn không xem được thống kê này",
    description: "Chỉ chủ truyện và đồng tác giả xem được thống kê.",
  },
  notFound: { title: "Không tìm thấy truyện", description: "Truyện không tồn tại hoặc bạn không quản lý truyện này." },
  error: { title: "Không tải được thống kê", description: "Kiểm tra kết nối và thử lại.", retry: "Thử lại" },
  range: {
    label: "Khoảng thời gian",
    options: { 7: "7 ngày", 30: "30 ngày", 90: "90 ngày" },
  },
  totals: {
    title: "Trong khoảng đã chọn",
    reads: "Lượt đọc",
    votes: "Lượt thích mới",
    comments: "Bình luận mới",
  },
  daily: {
    title: "Theo ngày",
    chartLabel: (days: number, reads: number, votes: number, comments: number) =>
      `Biểu đồ ${days} ngày: ${reads} lượt đọc, ${votes} lượt thích, ${comments} bình luận`,
    note: "Lượt đọc theo ngày chỉ có trong 90 ngày gần nhất. Ngày tính theo giờ UTC. Chạm hoặc rê qua biểu đồ để xem từng ngày; kéo chuột qua vài ngày (hoặc chọn một ngày rồi bấm Phóng to) để phóng to; cờ đánh dấu ngày đăng chương.",
    empty: "Chưa có hoạt động nào trong khoảng này.",
    series: { reads: "Lượt đọc", votes: "Lượt thích", comments: "Bình luận" },
    seriesChart: (series: string) => `${series} theo ngày`,
    hint: "Dùng phím ← và → để xem từng ngày, Home và End để về ngày đầu và ngày cuối, Esc để bỏ chọn. Ba biểu đồ dùng chung một con trỏ. Giữ Shift và nhấn ← hoặc → để chọn một khoảng ngày rồi nhấn Enter để phóng to; Esc khi không chọn ngày nào để xem lại tất cả.",
    zoom: {
      zoomIn: "Phóng to",
      reset: "Xem tất cả",
      selection: (from: string, to: string, days: number) =>
        `Đã chọn ${from} – ${to}, ${days} ngày. Thả chuột hoặc nhấn Enter để phóng to.`,
      zoomed: (from: string, to: string, days: number, total: number) =>
        `Đang xem ${from} – ${to}: ${days} trên ${total} ngày.`,
    },
    latest: (day: string) => `Gần nhất · ${day}`,
    average: "TB",
    showTable: "Xem dạng bảng",
    hideTable: "Ẩn bảng",
    tableCaption: (days: number) => `Số liệu ${days} ngày theo giờ UTC`,
    dayColumn: "Ngày",
    publishedColumn: "Chương đăng",
    published: (numbers: readonly number[]) => `Đăng chương ${numbers.join(", ")}`,
    readout: (day: string, reads: number, votes: number, comments: number, published: string | null) =>
      `${day}: ${reads} lượt đọc, ${votes} lượt thích, ${comments} bình luận${published ? `. ${published}` : ""}`,
  },
  heatmap: {
    title: "Lượt đọc 90 ngày qua",
    label: "Lượt đọc mỗi ngày trong 90 ngày qua, mỗi cột là một tuần",
    hint: "Dùng phím ↑ và ↓ để đi từng ngày, ← và → để đi từng tuần, Home và End để về ngày đầu và ngày cuối, Esc để bỏ chọn.",
    legend: "Lượt đọc mỗi ngày",
    summary: (days: number, reads: string, busiest: string, busiestReads: string) =>
      `${days} ngày: ${reads} lượt đọc. Nhiều nhất vào ${busiest} (${busiestReads} lượt đọc). Chọn một ô để xem ngày đó.`,
    empty: "Chưa có lượt đọc nào trong 90 ngày qua.",
    note: "Mỗi ô là một ngày theo giờ UTC, càng đậm càng nhiều lượt đọc (một người đọc được tính một lần mỗi chương mỗi ngày, không phải số người đọc riêng biệt). Luôn là 90 ngày gần nhất, dù chọn khoảng thời gian nào ở trên.",
    showTable: "Xem lượt đọc theo tuần dạng bảng",
    hideTable: "Ẩn bảng theo tuần",
    tableCaption: "Lượt đọc mỗi ngày trong 90 ngày qua theo tuần, giờ UTC",
    weekColumn: "Tuần bắt đầu",
  },
  funnel: {
    title: "Đọc tiếp qua từng chương",
    label: "Lượt đọc của từng chương theo thứ tự đọc",
    note: "Mỗi bậc là tổng lượt đọc của một chương từ trước đến nay (một người đọc được tính một lần mỗi ngày), không phải số người đọc riêng biệt. Chương mới đăng có ít thời gian hơn để có lượt đọc.",
    empty: "Chưa có lượt đọc nào để vẽ phễu.",
    single: "Mới có một chương: cần ít nhất hai chương để thấy người đọc dừng ở đâu.",
    summary: (last: number, first: number, overall: string) =>
      `Chương ${last} có ${overall} số lượt đọc của chương ${first}.`,
    noBasis: (first: number) => `Chương ${first} chưa có lượt đọc nên chưa so sánh được.`,
    biggestDrop: (number: number, change: string) =>
      `Rơi nhiều nhất ở chương ${number}: ${change} so với chương liền trước.`,
    noDrop: "Không chương nào có ít lượt đọc hơn chương liền trước.",
    highlight: "rơi nhiều nhất",
    showAll: (count: number) => `Xem cả ${count} chương`,
    showFewer: "Thu gọn",
    detail: (step: {
      number: number;
      title: string;
      reads: string;
      first: number;
      ofFirst: string | null;
      previous: number | null;
      change: string | null;
    }) =>
      [
        `Chương ${step.number} · ${step.title}: ${step.reads} lượt đọc`,
        step.ofFirst && step.number !== step.first ? `bằng ${step.ofFirst} của chương ${step.first}` : null,
        step.change && step.previous !== null ? `${step.change} so với chương ${step.previous}` : null,
      ]
        .filter(Boolean)
        .join(", ") + ".",
  },
  scatter: {
    title: "So sánh các chương",
    metricLabel: "Trục dọc",
    metrics: { likesPer100: "Lượt thích trên 100 lượt đọc", retention: "Giữ chân" },
    label: (metric: string) => `Các chương theo lượt đọc (ngang) và ${metric} (dọc)`,
    hint: "Dùng phím mũi tên để chuyển giữa các chương, Enter để chọn, Esc để bỏ chọn.",
    xAxis: "Lượt đọc →",
    yAxis: (metric: string) => `↑ ${metric}`,
    filter: (reads: string) => `Làm mờ chương dưới ${reads} lượt đọc`,
    summary: (shown: number, faded: number) =>
      `${shown} chương trên biểu đồ${faded > 0 ? `, ${faded} chương bị làm mờ` : ""}. Chọn một chấm để xem số liệu.`,
    omittedLikes: (count: number) => `${count} chương chưa có lượt đọc nên không có trên biểu đồ.`,
    omittedRetention: (count: number) =>
      `${count} chương không có chỉ số giữ chân (chương đầu, hoặc chương trước đó chưa có lượt đọc) nên không có trên biểu đồ.`,
    empty: "Chưa có chương nào để vẽ theo trục này.",
    detail: (point: { number: number; title: string; reads: string; likes: string; metric: string; value: string }) =>
      `Chương ${point.number} · ${point.title}: ${point.reads} lượt đọc, ${point.likes} lượt thích, ${point.metric} ${point.value}.`,
    note: "Lượt đọc là tổng lượt đọc của chương từ trước đến nay (một người đọc được tính một lần mỗi chương mỗi ngày), không phải số người đọc riêng biệt. Lượt thích trên 100 lượt đọc = lượt thích ÷ lượt đọc × 100; chương ít lượt đọc cho tỉ lệ dao động mạnh, nên có thể làm mờ chúng.",
  },
  custom: {
    tab: "Tùy chọn",
    open: "Chọn khoảng ngày",
    applied: (from: string, to: string, days: number) => `${from} – ${to} (${days} ngày)`,
    calendar: {
      fromLabel: "Từ ngày",
      toLabel: "Đến ngày",
      placeholder: "Chọn ngày",
      previousMonth: "Tháng trước",
      nextMonth: "Tháng sau",
      gridLabel: "Các ngày trong tháng",
      apply: "Áp dụng",
      pickStart: "Chọn ngày bắt đầu",
      pickEnd: "Giờ chọn ngày kết thúc",
      summary: (days: number, from: string, to: string) => `${days} ngày · ${from} – ${to}`,
    },
    note: "Chỉ chọn được trong 90 ngày gần nhất (lượt đọc theo ngày chỉ được giữ 90 ngày). Ngày tính theo giờ UTC.",
  },
  cohorts: {
    title: "Người đọc mới theo tuần",
    label: "Tỉ lệ người đọc còn đọc tiếp theo tuần bắt đầu",
    week: (offset: number) => (offset === 0 ? "Tuần đầu" : `+${offset}`),
    idle: "Chọn một ô để xem tỉ lệ.",
    size: (readers: number) => `${readers} người đọc mới`,
    hiddenSize: "Dưới 5 người đọc, không hiển thị",
    cell: (week: string, offset: number, percent: string, size: string) =>
      offset === 0
        ? `Bắt đầu tuần ${week} (${size})`
        : `Bắt đầu tuần ${week} (${size}) · ${offset} tuần sau: ${percent} còn đọc`,
    hidden: (week: string) => `Tuần ${week}: dưới 5 người đọc nên không hiển thị`,
    empty: "Chưa có người đọc nào trong 8 tuần qua.",
    note: "Mỗi hàng là những người đọc truyện lần đầu trong tuần đó (thứ Hai đến Chủ nhật, giờ UTC); mỗi ô là phần trăm trong số họ còn đọc ở tuần sau đó. Một người đọc là một tài khoản, hoặc một trình duyệt khi chưa đăng nhập. Tuần có dưới 5 người đọc mới được ẩn để không lộ ai đang đọc. Chỉ có dữ liệu 90 ngày gần nhất.",
  },
  split: {
    title: "Đã đăng nhập hay khách",
    label: (days: number) => `Lượt đọc ${days} ngày qua theo loại người đọc, mỗi ô là 1%`,
    legend: "Loại người đọc",
    signedIn: "Đã đăng nhập",
    anonymous: "Khách",
    share: (label: string, percent: number, reads: string) => `${label}: ${percent}% (${reads} lượt đọc)`,
    readers: (signedIn: string, anonymous: string) => `${signedIn} tài khoản và ${anonymous} trình duyệt khách đã đọc.`,
    empty: "Chưa có lượt đọc nào trong khoảng này.",
    note: "Theo khoảng 7, 30 hoặc 90 ngày đang chọn ở trên (khoảng tùy chọn dùng 90 ngày).",
  },
  terms: {
    title: "Người đọc nói gì",
    periods: "Tháng",
    cloud: (month: string) => `Từ hay gặp trong bình luận ${month}`,
    word: (term: string, mentions: number, change: number | null) =>
      `“${term}”: ${mentions} bình luận${change === null ? " · mới tháng này" : change === 0 ? " · như tháng trước" : ` · ${change > 0 ? "+" : ""}${change} so với tháng trước`}`,
    idle: "Chọn một từ để xem số bình luận nhắc đến nó.",
    empty: "Chưa có từ nào được ít nhất hai người nhắc đến trong tháng này.",
    note: "Từ trong các bình luận đang hiển thị, tách theo từng tiếng; bỏ các từ nối thông dụng. Chỉ hiện từ được ít nhất hai người khác nhau viết, và không bao giờ hiện nội dung bình luận.",
  },
  sources: {
    title: "Người đọc đến từ đâu",
    stages: ["Người đọc", "Đọc tiếp", "Theo dõi"] as const,
    picker: "Nguồn",
    all: (readers: number, followed: number) => `${readers} người đọc → ${followed} theo dõi truyện`,
    one: (label: string, readers: number, continued: number, followed: number, percent: string) =>
      `${label}: ${readers} người đọc, ${continued} đọc tiếp, ${followed} theo dõi (${percent})`,
    names: {
      story_page: "Trang truyện",
      next_chapter: "Chương kế",
      library: "Thư viện",
      search: "Tìm kiếm",
      discover: "Khám phá",
      ranking: "Xếp hạng",
      notification: "Thông báo",
      profile: "Trang tác giả",
      other: "Khác",
      unknown: "Không rõ",
    },
    hidden: (count: number) => `${count} nguồn có dưới 5 người đọc nên không hiển thị.`,
    empty: "Chưa đủ người đọc để vẽ (mỗi nguồn cần ít nhất 5 người).",
    note: "Nguồn là màn hình trong StoryNest mà người đọc mở truyện từ đó, ghi ở lượt đọc đầu tiên trong khoảng; không theo dõi người đọc trên trang web khác. “Đọc tiếp” là đọc ít nhất hai chương trong khoảng; “Theo dõi” chỉ tính tài khoản đã đăng nhập đang theo dõi truyện.",
  },
  chapters: {
    title: "Theo chương",
    note: "“Giữ chân” là số lượt đọc của chương so với chương liền trước.",
    empty: "Chưa có chương nào được đăng.",
    columns: {
      chapter: "Chương",
      reads: "Lượt đọc",
      votes: "Thích",
      comments: "Bình luận",
      retention: "Giữ chân",
    },
    chapterLabel: (number: number) => `Chương ${number}`,
    noRetention: "—",
  },
} as const;

export const analyticsText = defineText("analytics", vi, en);
