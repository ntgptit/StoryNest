"use client";

import { ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@storynest/ui/components/button";
import { EmptyState } from "@storynest/ui/widgets/empty-state";
import { useNavigation } from "../../_shared/platform.tsx";
import { useAdultContent } from "../hooks/use-adult-content.ts";
import { adultContentText } from "../strings.ts";

const t = adultContentText.gate;

/**
 * Stands in front of an adult story (its page and its chapters), which can also be opened by a link. Shows the content
 * only when the story is not adult or the reader chose to see adult content; otherwise asks for the confirmation.
 */
export function AdultGate({ isMature, children }: { isMature: boolean; children: ReactNode }) {
  const { show, enable } = useAdultContent();
  const navigation = useNavigation();
  if (!isMature || show) return <>{children}</>;
  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <EmptyState icon={ShieldAlert} title={t.title} description={t.description} />
      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" variant="outline" onClick={() => navigation.back()}>
          {t.back}
        </Button>
        <Button type="button" onClick={enable}>
          {t.confirm}
        </Button>
      </div>
    </div>
  );
}
