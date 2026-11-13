import type { ReactNode } from "react";

import { WorkspaceNav } from "./workspace-nav";

/**
 * Shared bar (role, public page, tabs by role) of a story's workspace pages. The editor, history and preview pages sit
 * outside this group on purpose, and every URL is unchanged. Each page still checks the session itself.
 */
export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <>
      <WorkspaceNav storyId={id} />
      {children}
    </>
  );
}
