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
    note: "Daily reads are only available for the last 90 days. Days are in UTC. Touch or hover the charts to see each day; flags mark the days chapters were published.",
    empty: "No activity in this range yet.",
    series: { reads: "Reads", votes: "Likes", comments: "Comments" },
    seriesChart: (series: string) => `${series} by day`,
    hint: "Use ← and → to step through the days, Home and End to jump to the first and last day, Esc to clear. The three charts share one cursor.",
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
