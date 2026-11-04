"use client";

import { homeText } from "@/lib/strings";

/** The home page's headline. A client component so it follows the language (the server always writes Vietnamese). */
export function HomeHero() {
  return (
    <header className="flex flex-col gap-2">
      <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{homeText.heading}</h1>
      <p className="max-w-xl text-base text-muted-foreground">{homeText.intro}</p>
    </header>
  );
}
