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
  history: {
    title: "Ranks over the last 7 days",
    race: "Race",
    slope: "Ups and downs",
    views: "View",
    raceLabel: "Ranks by day",
    play: "Play",
    pause: "Pause",
    scrubber: "Day",
    bar: (rank: number, title: string, score: string) => `${rank}. ${title}, ${score} points`,
    fromLabel: "7 days ago",
    toLabel: "Today",
    slopeLabel: "Today's ranks against the first day of the range",
    modes: "Axis",
    rank: "Rank",
    score: "Score",
    move: (title: string, from: number | null, to: number) =>
      from === null
        ? `${title}: new, now #${to}`
        : from === to
          ? `${title}: stays #${to}`
          : `${title}: #${from} → #${to}`,
    idle: "Pick a story to see how far it moved.",
    untitled: "Story",
    building: "The ranking history is recorded once a day; it needs at least two days to compare.",
    note: "The ranking is captured once a day; score = reads + 5 × votes within the period picked.",
  },
  featured: {
    title: "Featured this week",
    seeAll: "See the ranking",
    pause: "Pause auto-advance",
    play: "Resume auto-advance",
    dots: "Choose a featured story",
    slide: (position: number, count: number, title: string) => `Story ${position} of ${count}: ${title}`,
  },
};
