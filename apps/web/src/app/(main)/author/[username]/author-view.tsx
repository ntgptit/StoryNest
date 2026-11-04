"use client";

import { AuthorScreen } from "@storynest/features";

import { getCoverUrlResolver } from "@/lib/covers";

export function AuthorView({ username }: { username: string }) {
  return <AuthorScreen username={username} coverUrlFor={getCoverUrlResolver()} />;
}
