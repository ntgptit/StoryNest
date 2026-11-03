import Link from "next/link";
import type { ReactNode } from "react";

/** Centred layout for the credential screens: brand on top, card below, safe areas respected. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center gap-8 px-4 py-10 pt-safe pb-safe sm:justify-center">
      <Link href="/" className="text-lg font-semibold tracking-tight">
        StoryNest
      </Link>
      <div className="w-full">{children}</div>
    </div>
  );
}
