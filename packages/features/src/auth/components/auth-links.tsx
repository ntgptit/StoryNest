import type { ReactNode } from "react";
import { AppLink } from "../../_shared/platform.tsx";

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <AppLink href={href} className="font-medium text-primary underline-offset-4 hover:underline">
      {children}
    </AppLink>
  );
}
