"use client";

import { useRef, useState } from "react";
import { newId } from "@storynest/utils";
import { VISIBILITIES, VISIBILITY, type Visibility } from "@storynest/validation";
import { Button } from "@storynest/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@storynest/ui/components/dialog";
import { Input } from "@storynest/ui/components/input";
import { Label } from "@storynest/ui/components/label";
import { PadlockIcon } from "@storynest/ui/widgets/padlock-icon";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@storynest/ui/components/select";
import { Textarea } from "@storynest/ui/components/textarea";
import { checkListForm, asVisibility, type ListFormProblems, type ListFormValues } from "../model/list.ts";
import { listText } from "../strings.ts";

const t = listText.form;

/**
 * Create or edit a reading list. `onSubmit` gets the values and an id that stays the same while this form is being
 * sent (a retry cannot create two lists); it rejects with the message to show.
 */
export function ListFormDialog({
  mode,
  initial,
  open,
  onOpenChange,
  onSubmit,
}: {
  mode: "create" | "edit";
  initial?: ListFormValues;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ListFormValues, id: string) => Promise<void>;
}) {
  const [values, setValues] = useState<ListFormValues>(
    initial ?? { title: "", description: "", visibility: "private" },
  );
  const [problems, setProblems] = useState<ListFormProblems>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const id = useRef(newId());
  const nameId = useRef(`list-name-${newId()}`).current;
  const descriptionId = useRef(`list-description-${newId()}`).current;
  const visibilityId = useRef(`list-visibility-${newId()}`).current;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (sending) return;
    const found = checkListForm(values);
    setProblems(found);
    if (Object.keys(found).length > 0) return;
    setFailure(null);
    setSending(true);
    try {
      await onSubmit(values, id.current);
      onOpenChange(false);
    } catch (error) {
      setFailure(error instanceof Error ? error.message : listText.errors.generic);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{mode === "create" ? t.createTitle : t.editTitle}</DialogTitle>
            <DialogDescription>{listText.visibilityHints[values.visibility]}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={nameId}>{t.name}</Label>
            <Input
              id={nameId}
              value={values.title}
              aria-invalid={problems.title !== undefined}
              onChange={(event) => setValues({ ...values, title: event.target.value })}
            />
            {problems.title ? <p className="text-sm text-destructive">{problems.title}</p> : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={descriptionId}>{t.description}</Label>
            <Textarea
              id={descriptionId}
              value={values.description}
              aria-invalid={problems.description !== undefined}
              onChange={(event) => setValues({ ...values, description: event.target.value })}
            />
            <p className={problems.description ? "text-sm text-destructive" : "text-xs text-muted-foreground"}>
              {problems.description ?? t.descriptionHint}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={visibilityId}>{t.visibility}</Label>
            <Select
              value={values.visibility}
              onValueChange={(value) => setValues({ ...values, visibility: asVisibility(value) satisfies Visibility })}
            >
              <SelectTrigger id={visibilityId} className="w-full justify-start">
                {/* Closed while only the owner can see the list; the shackle lifts once others can open it. */}
                <PadlockIcon open={values.visibility !== VISIBILITY.PRIVATE} className="size-4 text-muted-foreground" />
                <SelectValue className="mr-auto" />
              </SelectTrigger>
              <SelectContent>
                {VISIBILITIES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {listText.visibility[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {failure ? (
            <p role="alert" className="text-sm text-destructive">
              {failure}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={sending}>
              {t.cancel}
            </Button>
            <Button type="submit" disabled={sending}>
              {sending ? t.submitting : mode === "create" ? t.submitCreate : t.submitSave}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
