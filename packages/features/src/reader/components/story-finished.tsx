"use client";

import { useEffect, useRef, useState } from "react";
import { FinishCelebration } from "@storynest/ui/widgets/finish-celebration";
import { AddToListButton } from "../../lists/index.ts";
import { readerText } from "../strings.ts";

/** Share of the card that must be on screen for the celebration to play. */
const VISIBLE_SHARE = 0.6;

/**
 * "You finished the story" card under the last chapter of a completed story, with Add to list. It celebrates once,
 * when the reader scrolls it into view (never on page load, even when a short chapter shows it at once).
 */
export function StoryFinished({ storyId, title }: { storyId: string; title: string }) {
  const card = useRef<HTMLDivElement>(null);
  const [play, setPlay] = useState(0);

  useEffect(() => {
    const element = card.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    let scrolled = false;
    let visible = false;
    const fire = () => {
      if (!scrolled || !visible) return;
      setPlay(1);
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
    const onScroll = () => {
      scrolled = true;
      fire();
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = (entry?.intersectionRatio ?? 0) >= VISIBLE_SHARE;
        fire();
      },
      { threshold: VISIBLE_SHARE },
    );
    observer.observe(element);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div ref={card}>
      <FinishCelebration
        title={readerText.finished.title}
        description={readerText.finished.description(title)}
        play={play}
      >
        <AddToListButton storyId={storyId} />
      </FinishCelebration>
    </div>
  );
}
