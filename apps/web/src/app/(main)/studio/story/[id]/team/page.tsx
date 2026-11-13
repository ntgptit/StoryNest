import type { Metadata } from "next";

import { requireUser } from "@/lib/auth/require-user";
import { requireUuidParams } from "@/lib/route-params";
import { appText } from "@/lib/strings";

import { TeamView } from "./team-view";

export const metadata: Metadata = { title: appText.pageTitle.team, robots: { index: false } };

/** Collaborators and invitations of one story. The id decides the story; the screen and RLS decide who may manage it. */
export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  requireUuidParams(id);
  await requireUser(`/studio/story/${id}/team`);
  return <TeamView storyId={id} />;
}
