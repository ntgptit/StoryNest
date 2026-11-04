"use client";

import { FollowingScreen } from "@storynest/features";

import { getCoverUrlResolver } from "@/lib/covers";

export function FollowingView() {
  return <FollowingScreen coverUrlFor={getCoverUrlResolver()} />;
}
