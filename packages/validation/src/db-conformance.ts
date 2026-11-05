// Compile-time checks only (never imported at runtime): if a migration changes a column or RPC signature and the
// regenerated Database type no longer accepts what these schemas produce, `pnpm typecheck` fails here.
import type { Database, TablesInsert, TablesUpdate } from "@storynest/database";
import type {
  ChapterCreate,
  ChapterDraftSave,
  CommentCreate,
  PublishChapterArgs,
  ReadingListCreate,
  ReportCreate,
  ScheduleChapterArgs,
  StoryCreate,
  StoryUpdate,
  UnpublishChapterArgs,
  toAnnouncementPayload,
  StoryPartCreate,
  RequestChapterReviewArgs,
  DecideChapterReviewArgs,
  RestoreChapterVersionArgs,
} from "./index.ts";

type Fn = Database["public"]["Functions"];
const uid = "00000000-0000-0000-0000-000000000000";

export const rpcArgs = {
  publish: {} as PublishChapterArgs satisfies Fn["publish_chapter"]["Args"],
  schedule: {} as ScheduleChapterArgs satisfies Fn["schedule_chapter"]["Args"],
  unpublish: {} as UnpublishChapterArgs satisfies Fn["unpublish_chapter"]["Args"],
  requestReview: {} as RequestChapterReviewArgs satisfies Fn["request_chapter_review"]["Args"],
  decideReview: {} as DecideChapterReviewArgs satisfies Fn["decide_chapter_review"]["Args"],
  restoreVersion: {} as RestoreChapterVersionArgs satisfies Fn["restore_chapter_version"]["Args"],
};

export const inserts = {
  story: { ...({} as StoryCreate), owner_id: uid } satisfies TablesInsert<"stories">,
  chapter: {} as ChapterCreate satisfies TablesInsert<"chapters">,
  draft: { ...({} as ChapterDraftSave), updated_by: uid } satisfies Omit<TablesInsert<"chapter_drafts">, "body"> & {
    body: unknown;
  },
  comment: { ...({} as CommentCreate), author_id: uid } satisfies TablesInsert<"comments">,
  readingList: { ...({} as ReadingListCreate), owner_id: uid } satisfies TablesInsert<"reading_lists">,
  report: { ...({} as ReportCreate), reporter_id: uid } satisfies TablesInsert<"content_reports">,
  announcement: {} as ReturnType<typeof toAnnouncementPayload> satisfies TablesInsert<"announcements">,
  storyPart: {} as StoryPartCreate satisfies TablesInsert<"story_parts">,
};

export const updates = { story: {} as StoryUpdate satisfies TablesUpdate<"stories"> };
