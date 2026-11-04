import type { Metadata } from "next";

import { requireUser } from "@/lib/auth/require-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { appText } from "@/lib/strings";

import { MeView } from "./me-view";

export const metadata: Metadata = { title: appText.pageTitle.profile, robots: { index: false } };

/** Profile view with a link to the editor. Protected twice: proxy redirect + requireUser here. */
export default async function MePage() {
  const user = await requireUser("/me");
  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("app_users")
    .select("username, display_name, bio")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <MeView
      email={user.email ?? null}
      profile={profile ? { displayName: profile.display_name, username: profile.username, bio: profile.bio } : null}
    />
  );
}
