// English text of the settings page. Same keys as strings.ts (the completeness test compares them).
export const en = {
  title: "Settings",
  description: "Saved in your account, used on every device.",
  signIn: "Sign in to change your settings.",
  signInLink: "Sign in",
  error: {
    title: "Could not load your settings",
    description: "Check your connection and try again.",
    retry: "Try again",
  },
  saveFailed: "Could not save your settings. The previous value was restored.",
  language: {
    title: "Language",
    label: "Interface language",
    description: "Choose the interface language. Anything not translated yet is shown in Vietnamese.",
    options: { vi: "Tiếng Việt", en: "English" },
  },
  theme: {
    title: "Appearance",
    description: "Saved on this device. While a chapter is open, the background chosen in the reading settings wins.",
    label: "Theme",
    options: { system: "Follow device", light: "Light", dark: "Dark" },
    darkSwitch: "Dark theme",
  },
  reading: {
    title: "Reading",
    description: "Font size, line spacing, font and background of the reading page.",
  },
  adult: {
    title: "Adult content (18+)",
    label: "Show 18+ stories",
    description: "Hidden by default. Turning it on means you confirm you are 18 or older.",
    confirmTitle: "Show adult stories?",
    confirmDescription: "Only turn this on if you are 18 or older. 18+ stories will appear in the lists.",
    confirm: "I am 18 or older, show 18+ stories",
    cancel: "Keep hidden",
  },
  notifications: {
    title: "Notifications",
    description:
      "Choose which in-app notifications you want. Collaboration invitations sent to you are always delivered.",
    chapterPublished: { label: "New chapters", description: "A story you follow has a new chapter." },
    commentReplied: { label: "Replies to comments", description: "Someone replies to your comment." },
    collaborationAnswers: {
      label: "Answers to invitations",
      description: "Someone you invited to collaborate accepts or declines.",
    },
  },
};
