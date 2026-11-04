export const en = {
  title: "Ranking",
  description: "The most read and most voted stories.",
  periodsLabel: "Time period",
  periods: { day: "Today", week: "This week", month: "This month", all: "All time" },
  updated: (relative: string) => `Updated ${relative}`,
  listLabel: (period: string) => `Ranking: ${period}`,
  rank: (position: number) => `Rank ${position}`,
  inPeriod: (reads: string, votes: string) => `${reads} reads · ${votes} votes`,
  loadMore: "Load more",
  endOfList: "You've reached the end of the ranking.",
  empty: { title: "No ranking yet", description: "Once people read and vote, stories will appear here." },
  error: {
    title: "Couldn't load the ranking",
    description: "Check your connection and try again.",
    retry: "Try again",
  },
};
