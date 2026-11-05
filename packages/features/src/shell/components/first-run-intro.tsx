"use client";

import { BookOpen, Library, PenLine } from "lucide-react";
import { WaveIntro } from "@storynest/ui/widgets/wave-intro";
import { useState } from "react";
import { useAuth } from "../../_shared/auth.tsx";
import { isFirstRunDue, markFirstRunSeen } from "../../auth/index.ts";
import { shellText } from "../strings.ts";

/**
 * The short intro after sign-up (Lucian 383): shown once per device, the first time the new account is signed in
 * here; skipping or finishing it marks it seen. It only explains, it collects nothing.
 */
export function FirstRunIntro() {
  const auth = useAuth();
  // Read once when the frame mounts: closing it marks it seen, so a reload does not bring it back.
  const [due] = useState(isFirstRunDue);
  const [dismissed, setDismissed] = useState(false);
  if (!due || dismissed || auth.status !== "authenticated") return null;

  const t = shellText.intro;
  return (
    <WaveIntro
      open
      onOpenChange={(open) => {
        if (open) return;
        markFirstRunSeen();
        setDismissed(true);
      }}
      pages={[
        { icon: BookOpen, title: t.pages.read.title, body: t.pages.read.body },
        { icon: Library, title: t.pages.follow.title, body: t.pages.follow.body },
        { icon: PenLine, title: t.pages.write.title, body: t.pages.write.body },
      ]}
      labels={{ next: t.next, done: t.done, skip: t.skip, step: t.step }}
    />
  );
}
