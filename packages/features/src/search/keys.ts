// TanStack Query keys of the search feature. The term is part of every key, so a new term is a new query; so is the
// reader's choice about adult stories (a different choice is a different list).
export const searchKeys = {
  all: ["search"] as const,
  stories: (term: string, mature: boolean) => ["search", "stories", term, mature] as const,
  authors: (term: string, mature: boolean) => ["search", "authors", term, mature] as const,
  tags: (term: string) => ["search", "tags", term] as const,
  suggestions: (term: string, mature: boolean) => ["search", "suggestions", term, mature] as const,
  trending: () => ["search", "trending"] as const,
};
