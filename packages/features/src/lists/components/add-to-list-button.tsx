"use client";

import { ListPlus } from "lucide-react";
import { useRef, useState } from "react";
import { newId } from "@storynest/utils";
import { DB_LIMITS } from "@storynest/validation";
import { Button } from "@storynest/ui/components/button";
import { Input } from "@storynest/ui/components/input";
import { Label } from "@storynest/ui/components/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@storynest/ui/components/sheet";
import { Skeleton } from "@storynest/ui/components/skeleton";
import { useAuth } from "../../_shared/auth.tsx";
import { useNavigation } from "../../_shared/platform.tsx";
import { useAppToast } from "../../_shared/toast.tsx";
import { useAddToList, useCreateList, useListMembership, useMyLists, useRemoveFromList } from "../hooks/use-lists.ts";
import { listErrorMessage, type ReadingList } from "../model/list.ts";
import { listText } from "../strings.ts";

const t = listText.addTo;

/** "Thêm vào danh sách": a button that opens a sheet with the reader's lists to put the story in or take it out of. */
export function AddToListButton({ storyId }: { storyId: string }) {
  const auth = useAuth();
  const navigation = useNavigation();
  const [open, setOpen] = useState(false);
  if (auth.status === "loading") return null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          if (auth.status !== "authenticated") {
            navigation.push(`/login?next=${encodeURIComponent(navigation.pathname)}`);
            return;
          }
          setOpen(true);
        }}
      >
        <ListPlus aria-hidden className="size-4" />
        {t.open}
      </Button>
      {auth.status === "authenticated" ? (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{t.title}</SheetTitle>
              <SheetDescription>{t.description}</SheetDescription>
            </SheetHeader>
            <ListPicker storyId={storyId} />
          </SheetContent>
        </Sheet>
      ) : null}
    </>
  );
}

function ListPicker({ storyId }: { storyId: string }) {
  const toast = useAppToast();
  const lists = useMyLists();
  const membership = useListMembership(storyId, lists.data);
  const add = useAddToList();
  const remove = useRemoveFromList();
  const create = useCreateList();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const newListId = useRef(newId());

  if (lists.isError || membership.isError) {
    return (
      <div className="px-4 pb-6">
        <p className="text-sm text-destructive">{t.error.title}</p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-2"
          onClick={() => {
            void lists.refetch();
            void membership.refetch();
          }}
        >
          {t.error.retry}
        </Button>
      </div>
    );
  }
  if (lists.isPending || membership.isPending) {
    return (
      <div className="flex flex-col gap-2 px-4 pb-6" aria-busy>
        <Skeleton className="h-10 w-full rounded-lg" aria-hidden />
        <Skeleton className="h-10 w-full rounded-lg" aria-hidden />
      </div>
    );
  }

  const inList = new Set(membership.data);
  const fail = (error: unknown) => toast.error(listErrorMessage(error as Parameters<typeof listErrorMessage>[0]));

  const toggle = (list: ReadingList) => {
    if (inList.has(list.id)) {
      remove.mutate(
        { listId: list.id, storyId },
        { onSuccess: () => toast.success(t.removed(list.title)), onError: fail },
      );
    } else {
      add.mutate({ listId: list.id, storyId }, { onSuccess: () => toast.success(t.added(list.title)), onError: fail });
    }
  };

  const createAndAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    const title = name.trim();
    if (title === "" || title.length > DB_LIMITS.readingListTitle || busy) return;
    setBusy(true);
    try {
      const id = newListId.current;
      await create.mutateAsync({ id, title, description: "", visibility: "private" });
      await add.mutateAsync({ listId: id, storyId });
      toast.success(t.added(title));
      setName("");
      newListId.current = newId();
    } catch (error) {
      fail(error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pb-6">
      {lists.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.empty}</p>
      ) : (
        <ul aria-label={t.listLabel} className="flex flex-col gap-2">
          {lists.data.map((list) => (
            <li key={list.id}>
              <Button
                type="button"
                variant={inList.has(list.id) ? "default" : "outline"}
                aria-pressed={inList.has(list.id)}
                disabled={add.isPending || remove.isPending}
                className="w-full justify-between"
                onClick={() => toggle(list)}
              >
                <span className="truncate">{list.title}</span>
                <span className="text-xs opacity-80">{listText.myLists.storyCount(list.storyCount)}</span>
              </Button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={createAndAdd} className="flex flex-col gap-2" noValidate>
        <Label htmlFor="new-list-name">{t.newName}</Label>
        <div className="flex gap-2">
          <Input id="new-list-name" value={name} onChange={(event) => setName(event.target.value)} />
          <Button type="submit" disabled={busy || name.trim() === ""}>
            {t.create}
          </Button>
        </div>
      </form>
    </div>
  );
}
