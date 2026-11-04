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
    barTitle: (day: string, reads: string) => `${day}: ${reads} reads`,
    note: "Daily reads are only available for the last 90 days. Days are in UTC.",
    empty: "No activity in this range yet.",
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
