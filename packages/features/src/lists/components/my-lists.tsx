"use client";

import { ListPlus, Lock, Link2, Globe } from "lucide-react";
import { useState, type ComponentType } from "react";
import { formatRelativeTime } from "@storynest/utils";
import type { Visibility } from "@storynest/validation";
import { Badge } from "@storynest/ui/components/badge";
import { Button } from "@storynest/ui/components/button";
import { Skeleton } from "@storynest/ui/components/skeleton";
import { EmptyState } from "@storynest/ui/widgets/empty-state";
import { ErrorState } from "@storynest/ui/widgets/error-state";
import { AppLink } from "../../_shared/platform.tsx";
import { useAppToast } from "../../_shared/toast.tsx";
import { useCreateList, useMyLists } from "../hooks/use-lists.ts";
import { listErrorMessage } from "../model/list.ts";
import { listText } from "../strings.ts";
import { ListFormDialog } from "./list-form-dialog.tsx";
import { currentLocale } from "../../_shared/i18n.ts";

const t = listText.myLists;

const VISIBILITY_ICON: Record<Visibility, ComponentType<{ className?: string; "aria-hidden"?: boolean }>> = {
  private: Lock,
  unlisted: Link2,
  public: Globe,
};

/** The reader's lists with a button to make a new one; each opens its page. Shown as a tab of the library. */
export function MyLists({ locale = currentLocale() }: { locale?: string }) {
  const lists = useMyLists();
  const create = useCreateList();
  const toast = useAppToast();
  const [creating, setCreating] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <Button type="button" size="sm" className="w-fit" onClick={() => setCreating(true)}>
        <ListPlus aria-hidden className="size-4" />
        {t.create}
      </Button>

      {lists.isError ? (
        <ErrorState
          title={t.error.title}
          description={t.error.description}
          retryLabel={t.error.retry}
          onRetry={() => void lists.refetch()}
        />
      ) : lists.isPending ? (
        <div className="flex flex-col gap-2" aria-busy>
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" aria-hidden />
          ))}
        </div>
      ) : lists.data.length === 0 ? (
        <EmptyState icon={ListPlus} title={t.empty.title} description={t.empty.description} />
      ) : (
        <ul aria-label={t.listLabel} className="flex flex-col gap-2">
          {lists.data.map((list) => {
            const Icon = VISIBILITY_ICON[list.visibility];
            return (
              <li key={list.id}>
                <AppLink
                  href={`/lists/${list.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3 text-card-foreground hover:bg-accent/40 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{list.title}</span>
                    <span className="block text-xs text-muted-foreground">
                      {t.storyCount(list.storyCount)} · {t.updated(formatRelativeTime(list.updatedAt, locale))}
                    </span>
                  </span>
                  <Badge variant="secondary" className="shrink-0 gap-1">
                    <Icon aria-hidden className="size-3" />
                    {listText.visibility[list.visibility]}
                  </Badge>
                </AppLink>
              </li>
            );
          })}
        </ul>
      )}

      {creating ? (
        <ListFormDialog
          mode="create"
          open
          onOpenChange={(open) => {
            if (!open) setCreating(false);
          }}
          onSubmit={async (values, id) => {
            try {
              await create.mutateAsync({ id, ...values });
            } catch (error) {
              throw new Error(listErrorMessage(error as Parameters<typeof listErrorMessage>[0]), { cause: error });
            }
            toast.success(listText.form.created);
          }}
        />
      ) : null}
    </div>
  );
}
