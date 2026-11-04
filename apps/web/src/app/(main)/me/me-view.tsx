"use client";

import { AppLink, shellText } from "@storynest/features";
import { Button } from "@storynest/ui/components/button";
import { PageHeader } from "@storynest/ui/widgets/page-header";

const t = shellText.me;

export interface MeProfile {
  displayName: string;
  username: string;
  bio: string | null;
}

/** The account page. A client component so its text follows the language (the page that feeds it runs on the server). */
export function MeView({ profile, email }: { profile: MeProfile | null; email: string | null }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t.title}
        description={t.description}
        actions={
          <Button asChild variant="outline" size="sm">
            <AppLink href="/me/edit">{t.edit}</AppLink>
          </Button>
        }
      />
      {profile ? (
        <dl className="grid gap-4 rounded-xl border bg-card p-5 text-card-foreground sm:grid-cols-[10rem_1fr]">
          <dt className="text-sm text-muted-foreground">{t.displayName}</dt>
          <dd>{profile.displayName}</dd>
          <dt className="text-sm text-muted-foreground">{t.username}</dt>
          <dd>@{profile.username}</dd>
          <dt className="text-sm text-muted-foreground">{t.email}</dt>
          <dd>{email ?? "—"}</dd>
          <dt className="text-sm text-muted-foreground">{t.bio}</dt>
          <dd className="whitespace-pre-wrap">{profile.bio ?? t.noBio}</dd>
        </dl>
      ) : (
        <p className="text-sm text-muted-foreground">{t.missingProfile}</p>
      )}
    </div>
  );
}
