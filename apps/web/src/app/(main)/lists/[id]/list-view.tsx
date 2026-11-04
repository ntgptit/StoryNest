"use client";

import { ListScreen } from "@storynest/features";

import { getCoverUrlResolver } from "@/lib/covers";

export function ListView({ listId }: { listId: string }) {
  return <ListScreen listId={listId} coverUrlFor={getCoverUrlResolver()} />;
}
