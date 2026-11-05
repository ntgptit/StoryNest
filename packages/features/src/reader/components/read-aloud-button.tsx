"use client";

import { useMemo } from "react";
import { PlayPauseButton } from "@storynest/ui/widgets/play-pause-button";
import { currentLocale } from "../../_shared/i18n.ts";
import { useReadAloud, useSpeechAvailable } from "../hooks/use-read-aloud.ts";
import type { ReaderBlock } from "../model/chapter.ts";
import { readAloudQueue, speechLang } from "../model/read-aloud.ts";
import { readerText } from "../strings.ts";

/**
 * Reader toolbar button that reads the chapter aloud with the device's speech engine; its ring shows how much has been
 * read. Not shown where the browser cannot speak, or when the chapter has no text. Key it by chapter.
 */
export function ReadAloudButton({ blocks }: { blocks: readonly ReaderBlock[] }) {
  const available = useSpeechAvailable();
  const queue = useMemo(() => readAloudQueue(blocks), [blocks]);
  if (!available || queue.length === 0) return null;
  return <ReadAloud queue={queue} />;
}

function ReadAloud({ queue }: { queue: ReturnType<typeof readAloudQueue> }) {
  const { playing, progress, toggle } = useReadAloud(queue, speechLang(currentLocale()));
  return (
    <PlayPauseButton
      playing={playing}
      progress={progress}
      onToggle={toggle}
      playLabel={readerText.readAloud.play}
      pauseLabel={readerText.readAloud.pause}
    />
  );
}
