// TanStack Query keys of the search feature. The term is part of every key, so a new term is a new query.
export const searchKeys = {
  all: ["search"] as const,
  stories: (term: string) => ["search", "stories", term] as const,
  authors: (term: string) => ["search", "authors", term] as const,
  tags: (term: string) => ["search", "tags", term] as const,
  suggestions: (term: string) => ["search", "suggestions", term] as const,
};
