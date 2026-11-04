import {
  DB_LIMITS,
  DEFAULT_STORY_LANGUAGE,
  STORY_ERROR,
  STORY_STATUS,
  VISIBILITY,
  storyCreateSchema,
  storyUpdateSchema,
  type StoryCreate,
  type StoryForm,
  type StoryUpdate,
} from "@storynest/validation";
import { slugify } from "@storynest/utils";
import type { AppError } from "../../_shared/errors.ts";
import type { Category } from "../../discovery/index.ts";
import { studioText } from "../strings.ts";

/** Select value standing for "no category" (a Radix Select item cannot have an empty value). */
export const NO_CATEGORY = "none";

export function emptyStoryForm(): StoryForm {
  return {
    title: "",
    slug: "",
    synopsis: "",
    categoryId: "",
    languageCode: DEFAULT_STORY_LANGUAGE,
    status: STORY_STATUS.DRAFT,
    visibility: VISIBILITY.PRIVATE,
    isMature: false,
  };
}

/** The slug proposed for a title: lowercase ascii words ("Đừng Bỏ Cuộc!" -> "dung-bo-cuoc"). */
export function slugFromTitle(title: string): string {
  return slugify(title, { maxLength: DB_LIMITS.storySlug });
}

/** Form values -> the payload the database accepts (storyCreateSchema is the contract, so a drift fails loudly). */
export function toStoryPayload(form: StoryForm): Omit<StoryCreate, "id"> {
  const { id: _id, ...payload } = storyCreateSchema.parse(toColumns(form));
  return payload;
}

/** Same columns for an update; every field is sent because the form always holds the full state. */
export function toStoryUpdate(form: StoryForm): StoryUpdate {
  return storyUpdateSchema.parse(toColumns(form));
}

function toColumns(form: StoryForm) {
  return {
    title: form.title,
    slug: form.slug,
    synopsis: form.synopsis,
    category_id: form.categoryId === "" ? null : Number(form.categoryId),
    language_code: form.languageCode,
    status: form.status,
    visibility: form.visibility,
    is_mature: form.isMature,
  };
}

export interface CategoryOption {
  id: number;
  label: string;
}

/** Categories as a flat, ordered list for a select: each root followed by its children ("Parent › Child"). */
export function categoryOptions(categories: readonly Category[]): CategoryOption[] {
  const byOrder = (a: Category, b: Category) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);
  return categories
    .filter((c) => c.parentId === null)
    .sort(byOrder)
    .flatMap((root) => [
      { id: root.id, label: root.name },
      ...categories
        .filter((c) => c.parentId === root.id)
        .sort(byOrder)
        .map((child) => ({ id: child.id, label: `${root.name} › ${child.name}` })),
    ]);
}

// A function, not a constant: the text is read when it is needed, so it follows the language.
const VALIDATION_TEXT = (): Record<string, string> => ({
  [STORY_ERROR.titleRequired]: studioText.validation.titleRequired,
  [STORY_ERROR.titleTooLong]: studioText.validation.titleTooLong,
  [STORY_ERROR.slugRequired]: studioText.validation.slugRequired,
  [STORY_ERROR.slugTooLong]: studioText.validation.slugTooLong,
  [STORY_ERROR.slugInvalid]: studioText.validation.slugInvalid,
  [STORY_ERROR.synopsisTooLong]: studioText.validation.synopsisTooLong,
  [STORY_ERROR.languageInvalid]: studioText.validation.languageInvalid,
});

export function validationMessage(code: string | undefined): string | undefined {
  if (code === undefined) return undefined;
  return VALIDATION_TEXT()[code] ?? studioText.errors.generic;
}

/** PostgreSQL unique_violation: the only unique key a story write can hit is (owner_id, slug). */
const UNIQUE_VIOLATION = "23505";

export function isSlugTaken(error: AppError): boolean {
  return error.kind === "conflict" && error.code === UNIQUE_VIOLATION;
}

/** Banner text for a failed save or delete (a taken slug is shown on the slug field instead). */
export function storyErrorMessage(error: AppError): string {
  switch (error.kind) {
    case "forbidden":
      return studioText.errors.forbidden;
    case "notFound":
      return studioText.errors.notFound;
    case "network":
      return studioText.errors.network;
    default:
      return studioText.errors.generic;
  }
}
