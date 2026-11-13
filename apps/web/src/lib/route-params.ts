import { notFound } from "next/navigation";
import { isUuid } from "@storynest/utils";

/** Answers 404 when a dynamic route segment that must be an id is not a UUID, before any query or login redirect. */
export function requireUuidParams(...ids: string[]): void {
  for (const id of ids) {
    if (!isUuid(id)) notFound();
  }
}
