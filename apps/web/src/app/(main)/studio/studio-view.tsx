"use client";

import { StudioScreen } from "@storynest/features";

import { getCoverUrlResolver } from "@/lib/covers";

export function StudioView() {
  return <StudioScreen coverUrlFor={getCoverUrlResolver()} />;
}
