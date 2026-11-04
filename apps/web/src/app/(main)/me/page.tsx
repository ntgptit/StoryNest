import type { Metadata } from "next";
import { shellText } from "@storynest/features";
import { PageHeader } from "@storynest/ui/widgets/page-header";

import { requireUser } from "@/lib/auth/require-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Hồ sơ", robots: { index: false } };

const t = shellText.me;

/** Minimal profile view; editing arrives with WBS WP 1.4. Protected twice: proxy redirect + requireUser here. */
export default async function MePage() {
  const user = await requireUser("/me");
  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("app_users")
    .select("username, display_name, bio")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t.title} description={t.description} />
      {profile ? (
        <dl className="grid gap-4 rounded-xl border bg-card p-5 text-card-foreground sm:grid-cols-[10rem_1fr]">
          <dt className="text-sm text-muted-foreground">{t.displayName}</dt>
          <dd>{profile.display_name}</dd>
          <dt className="text-sm text-muted-foreground">{t.username}</dt>
          <dd>@{profile.username}</dd>
          <dt className="text-sm text-muted-foreground">{t.email}</dt>
          <dd>{user.email ?? "—"}</dd>
          <dt className="text-sm text-muted-foreground">{t.bio}</dt>
          <dd className="whitespace-pre-wrap">{profile.bio ?? t.noBio}</dd>
        </dl>
      ) : (
        <p className="text-sm text-muted-foreground">{t.missingProfile}</p>
      )}
    </div>
  );
}
