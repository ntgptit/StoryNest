"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@storynest/ui/components/avatar";
import { useContext, type ComponentProps } from "react";
import { DataContext } from "./data.tsx";

export const AVATAR_BUCKET = "avatars";

/**
 * Public address of an avatar object, or null when there is none to show (no key, or no Supabase client). The avatars
 * bucket is public, so this needs no request: the client only builds the address.
 */
export function useAvatarUrl(storageKey: string | null | undefined): string | null {
  return usePublicUrl(AVATAR_BUCKET, storageKey);
}

/** Public address of an object in a PUBLIC bucket, or null without a key or a client. Builds the address only. */
export function usePublicUrl(bucket: string, storageKey: string | null | undefined): string | null {
  const client = useContext(DataContext)?.client ?? null;
  if (client === null || storageKey === null || storageKey === undefined || storageKey === "") return null;
  return client.storage.from(bucket).getPublicUrl(storageKey).data.publicUrl;
}

/** The first letter of a name, for the fallback circle ("?" when there is none). */
export function firstLetter(name: string): string {
  return Array.from(name.trim())[0]?.toLocaleUpperCase() ?? "?";
}

/** A person's picture, or their initial while there is none (or it fails to load). */
export function UserAvatar({
  storageKey,
  fallback,
  ...props
}: { storageKey: string | null | undefined; fallback: string } & Omit<ComponentProps<typeof Avatar>, "children">) {
  const url = useAvatarUrl(storageKey);
  return (
    <Avatar {...props}>
      {url === null ? null : <AvatarImage src={url} alt="" />}
      <AvatarFallback>{fallback}</AvatarFallback>
    </Avatar>
  );
}
