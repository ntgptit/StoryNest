export const en = {
  title: "Story statistics",
  description: "Who reads your story and where they stop.",
  back: "Back to Studio",
  signIn: "Sign in to view statistics.",
  signInLink: "Sign in",
  noAccess: {
    title: "You can't view these statistics",
    description: "Only the story owner and co-authors can view statistics.",
  },
  notFound: { title: "Story not found", description: "The story doesn't exist or you don't manage it." },
  error: { title: "Couldn't load statistics", description: "Check your connection and try again.", retry: "Try again" },
  range: {
    label: "Time range",
    options: { 7: "7 days", 30: "30 days", 90: "90 days" },
  },
  totals: {
    title: "In the selected range",
    reads: "Reads",
    votes: "New likes",
    comments: "New comments",
  },
  daily: {
    title: "By day",
    chartLabel: (days: number, reads: number, votes: number, comments: number) =>
      `${days}-day chart: ${reads} read${reads === 1 ? "" : "s"}, ${votes} like${votes === 1 ? "" : "s"}, ${comments} comment${comments === 1 ? "" : "s"}`,
    note: "Daily reads are only available for the last 90 days. Days are in UTC. Touch or hover the charts to see each day; drag across a few days (or pick a day and press Zoom in) to zoom in; flags mark the days chapters were published.",
    empty: "No activity in this range yet.",
    series: { reads: "Reads", votes: "Likes", comments: "Comments" },
    seriesChart: (series: string) => `${series} by day`,
    hint: "Use ← and → to step through the days, Home and End to jump to the first and last day, Esc to clear. The three charts share one cursor. Hold Shift and press ← or → to select a range of days, then Enter to zoom in; Esc with no day picked shows every day again.",
    zoom: {
      zoomIn: "Zoom in",
      reset: "Show all",
      selection: (from: string, to: string, days: number) =>
        `Selected ${from} – ${to}, ${days} days. Release or press Enter to zoom in.`,
      zoomed: (from: string, to: string, days: number, total: number) =>
        `Showing ${from} – ${to}: ${days} of ${total} days.`,
    },
    latest: (day: string) => `Latest · ${day}`,
    average: "avg",
    showTable: "Show as table",
    hideTable: "Hide table",
    tableCaption: (days: number) => `Figures for ${days} days, in UTC`,
    dayColumn: "Day",
    publishedColumn: "Published",
    published: (numbers: readonly number[]) =>
      numbers.length === 1 ? `Chapter ${numbers[0]} published` : `Chapters ${numbers.join(", ")} published`,
    readout: (day: string, reads: number, votes: number, comments: number, published: string | null) =>
      `${day}: ${reads} read${reads === 1 ? "" : "s"}, ${votes} like${votes === 1 ? "" : "s"}, ${comments} comment${comments === 1 ? "" : "s"}${published ? `. ${published}` : ""}`,
  },
  heatmap: {
    title: "Reads over the last 90 days",
    label: "Reads per day over the last 90 days, one column per week",
    hint: "Use ↑ and ↓ to move one day, ← and → to move one week, Home and End to jump to the first and last day, Esc to clear.",
    legend: "Reads per day",
    summary: (days: number, reads: string, busiest: string, busiestReads: string) =>
      `${days} days: ${reads} read${reads === "1" ? "" : "s"}. Busiest on ${busiest} (${busiestReads} read${busiestReads === "1" ? "" : "s"}). Pick a square to see that day.`,
    empty: "No reads in the last 90 days.",
    note: "Each square is one UTC day, darker for more reads (a reader counts once per chapter per day, not as a distinct reader). Always the last 90 days, whatever range is picked above.",
    showTable: "Show reads by week as a table",
    hideTable: "Hide the weekly table",
    tableCaption: "Reads per day over the last 90 days, by week, in UTC",
    weekColumn: "Week of",
  },
  funnel: {
    title: "Read-through by chapter",
    label: "Reads of each chapter in reading order",
    note: "Each step is a chapter's all-time reads (a reader counts once per day), not the number of distinct readers. Recently published chapters have had less time to collect reads.",
    empty: "No reads yet to draw the funnel.",
    single: "Only one chapter so far: you need at least two to see where readers stop.",
    summary: (last: number, first: number, overall: string) =>
      `Chapter ${last} has ${overall} of chapter ${first}'s reads.`,
    noBasis: (first: number) => `Chapter ${first} has no reads yet, so there is nothing to compare with.`,
    biggestDrop: (number: number, change: string) =>
      `Biggest drop at chapter ${number}: ${change} compared with the chapter before.`,
    noDrop: "No chapter has fewer reads than the one before it.",
    highlight: "biggest drop",
    showAll: (count: number) => `Show all ${count} chapters`,
    showFewer: "Show fewer",
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
        `Chapter ${step.number} · ${step.title}: ${step.reads} read${step.reads === "1" ? "" : "s"}`,
        step.ofFirst && step.number !== step.first ? `${step.ofFirst} of chapter ${step.first}` : null,
        step.change && step.previous !== null ? `${step.change} compared with chapter ${step.previous}` : null,
      ]
        .filter(Boolean)
        .join(", ") + ".",
  },
  scatter: {
    title: "Chapters compared",
    metricLabel: "Vertical axis",
    metrics: { likesPer100: "Likes per 100 reads", retention: "Retention" },
    label: (metric: string) => `Chapters by reads (across) and ${metric} (up)`,
    hint: "Use the arrow keys to move between chapters, Enter to pick one, Esc to let go.",
    xAxis: "Reads →",
    yAxis: (metric: string) => `↑ ${metric}`,
    filter: (reads: string) => `Fade chapters under ${reads} reads`,
    summary: (shown: number, faded: number) =>
      `${shown} chapter${shown === 1 ? "" : "s"} plotted${faded > 0 ? `, ${faded} faded` : ""}. Press a dot to see its figures.`,
    omittedLikes: (count: number) =>
      `${count} chapter${count === 1 ? " has" : "s have"} no reads yet and ${count === 1 ? "is" : "are"} not plotted.`,
    omittedRetention: (count: number) =>
      `${count} chapter${count === 1 ? " has" : "s have"} no retention (the first chapter, or the one before had no reads) and ${count === 1 ? "is" : "are"} not plotted.`,
    empty: "No chapter can be plotted on this axis yet.",
    detail: (point: { number: number; title: string; reads: string; likes: string; metric: string; value: string }) =>
      `Chapter ${point.number} · ${point.title}: ${point.reads} read${point.reads === "1" ? "" : "s"}, ${point.likes} like${point.likes === "1" ? "" : "s"}, ${point.metric} ${point.value}.`,
    note: "Reads are each chapter's all-time reads (a reader counts once per chapter per day), not distinct readers. Likes per 100 reads = likes ÷ reads × 100; a chapter with few reads swings a lot, so those can be faded.",
  },
  custom: {
    tab: "Custom",
    open: "Pick a date range",
    applied: (from: string, to: string, days: number) => `${from} – ${to} (${days} days)`,
    calendar: {
      fromLabel: "From",
      toLabel: "To",
      placeholder: "Pick a day",
      previousMonth: "Previous month",
      nextMonth: "Next month",
      gridLabel: "Days of the month",
      apply: "Apply",
      pickStart: "Pick the first day",
      pickEnd: "Now pick the last day",
      summary: (days: number, from: string, to: string) => `${days} days · ${from} – ${to}`,
    },
    note: "Only the last 90 days can be picked (daily reads are kept for 90 days). Days are UTC days.",
  },
  cohorts: {
    title: "New readers by week",
    label: "Share of readers still reading, by starting week",
    week: (offset: number) => (offset === 0 ? "Start" : `+${offset}`),
    idle: "Pick a cell to see its share.",
    size: (readers: number) => `${readers} new readers`,
    hiddenSize: "Fewer than 5 readers, hidden",
    cell: (week: string, offset: number, percent: string, size: string) =>
      offset === 0
        ? `Started the week of ${week} (${size})`
        : `Started the week of ${week} (${size}) · ${offset} weeks later: ${percent} still reading`,
    hidden: (week: string) => `Week of ${week}: fewer than 5 readers, so hidden`,
    empty: "No readers in the last 8 weeks yet.",
    note: "Each row is the readers who first read the story that week (Monday to Sunday, UTC); each cell is the share of them still reading in a later week. A reader is an account, or a browser when not signed in. Weeks with fewer than 5 new readers are hidden so nobody's reading can be singled out. Only the last 90 days are kept.",
  },
  split: {
    title: "Signed in or guests",
    label: (days: number) => `Reads of the last ${days} days by reader type, each cell is 1%`,
    legend: "Reader type",
    signedIn: "Signed in",
    anonymous: "Guests",
    share: (label: string, percent: number, reads: string) => `${label}: ${percent}% (${reads} reads)`,
    readers: (signedIn: string, anonymous: string) => `${signedIn} accounts and ${anonymous} guest browsers read it.`,
    empty: "No reads in this range yet.",
    note: "Follows the 7, 30 or 90 days picked above (a custom range uses 90 days).",
  },
  terms: {
    title: "What readers say",
    periods: "Month",
    cloud: (month: string) => `Frequent words in comments, ${month}`,
    word: (term: string, mentions: number, change: number | null) =>
      `“${term}”: ${mentions} comments${change === null ? " · new this month" : change === 0 ? " · same as last month" : ` · ${change > 0 ? "+" : ""}${change} vs last month`}`,
    idle: "Pick a word to see how many comments mention it.",
    empty: "No word was used by at least two people this month yet.",
    note: "Words of the visible comments, split by syllable for Vietnamese; common filler words are left out. A word shows only when at least two different people wrote it, and comment text is never shown.",
  },
  sources: {
    title: "Where readers come from",
    stages: ["Readers", "Read on", "Followed"] as const,
    picker: "Source",
    all: (readers: number, followed: number) => `${readers} readers → ${followed} followed the story`,
    one: (label: string, readers: number, continued: number, followed: number, percent: string) =>
      `${label}: ${readers} readers, ${continued} read on, ${followed} followed (${percent})`,
    names: {
      story_page: "Story page",
      next_chapter: "Next chapter",
      library: "Library",
      search: "Search",
      discover: "Discover",
      ranking: "Rankings",
      notification: "Notifications",
      profile: "Author page",
      other: "Other",
      unknown: "Unknown",
    },
    hidden: (count: number) => `${count} sources had fewer than 5 readers and are hidden.`,
    empty: "Not enough readers to draw yet (each source needs at least 5).",
    note: "The source is the StoryNest screen the reader opened the story from, taken from their first read in the range; readers are never followed on other sites. “Read on” means at least two chapters in the range; “Followed” counts signed-in accounts that follow the story.",
  },
  chapters: {
    title: "By chapter",
    note: "“Retention” is the chapter's reads compared with the previous chapter.",
    empty: "No chapters have been published yet.",
    columns: {
      chapter: "Chapter",
      reads: "Reads",
      votes: "Likes",
      comments: "Comments",
      retention: "Retention",
    },
    chapterLabel: (number: number) => `Chapter ${number}`,
    noRetention: "—",
  },
};
