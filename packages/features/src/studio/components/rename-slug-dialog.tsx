"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { chapterSlugFormSchema, type ChapterSlugForm } from "@storynest/validation";
import { Button } from "@storynest/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@storynest/ui/components/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@storynest/ui/components/form";
import { Input } from "@storynest/ui/components/input";
import { translateErrors } from "../../_shared/form-resolver.ts";
import { useAppToast } from "../../_shared/toast.tsx";
import { useRenameChapterSlug } from "../hooks/use-chapter-management.ts";
import { chapterErrorMessage, chapterValidationMessage, isChapterSlugTaken } from "../model/studio-chapter.ts";
import { studioText } from "../strings.ts";

const t = studioText.chapters;

/** Changes the URL slug of one chapter. A slug already used in the story is shown on the field. */
export function RenameSlugDialog({
  storyId,
  chapterId,
  currentSlug,
  open,
  onOpenChange,
}: {
  storyId: string;
  chapterId: string;
  currentSlug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const toast = useAppToast();
  const rename = useRenameChapterSlug(storyId);
  const form = useForm<ChapterSlugForm>({
    resolver: translateErrors(zodResolver(chapterSlugFormSchema), chapterValidationMessage),
    defaultValues: { slug: currentSlug },
  });

  const submit = form.handleSubmit(({ slug }) => {
    if (slug === currentSlug) {
      onOpenChange(false);
      return;
    }
    rename.mutate(
      { chapterId, slug },
      {
        onSuccess: () => {
          toast.success(t.renamed);
          onOpenChange(false);
        },
        onError: (error) => {
          if (isChapterSlugTaken(error)) form.setError("slug", { type: "server", message: t.errors.slugTaken });
          else toast.error(chapterErrorMessage(error));
        },
      },
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <Form {...form}>
          <form onSubmit={submit} noValidate className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>{t.renameTitle}</DialogTitle>
              <DialogDescription>{t.renameDescription}</DialogDescription>
            </DialogHeader>
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.add.slug}</FormLabel>
                  <FormControl>
                    <Input autoCapitalize="none" spellCheck={false} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                {t.cancel}
              </Button>
              <Button type="submit" disabled={rename.isPending}>
                {t.renameSubmit}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
