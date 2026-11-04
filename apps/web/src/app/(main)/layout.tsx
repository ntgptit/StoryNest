import { MainShell } from "@storynest/features";
import type { ReactNode } from "react";

/** Regular pages share one frame: header with the account menu and mobile bottom navigation. */
export default function MainLayout({ children }: { children: ReactNode }) {
  return <MainShell>{children}</MainShell>;
}
