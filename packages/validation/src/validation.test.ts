import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ACCOUNT_STATUSES,
  REVIEW_STATUSES,
  REVIEW_STATUS,
  isBlurhashFormat,
  blurhashSchema,
  listToUpdateDays,
  updateDaysToList,
  updateDaysSchema,
  storyPartCreateSchema,
  requestChapterReviewArgsSchema,
  ACHIEVEMENT_CODE,
  ACHIEVEMENT_CODES,
  ACHIEVEMENT_THRESHOLDS,
  DAILY_GOAL,
  BLOCK_TYPES,
  CHAPTER_STATUSES,
  COLLABORATOR_ROLES,
  COMMENT_STATUSES,
  COMMENT_REACTIONS,
  COMMENT_REACTION,
  HIGHLIGHT_STYLES,
  HIGHLIGHT_STYLE,
  STORY_LANGUAGES,
  HIDE_SOURCES,
  MODERATION_ACTIONS,
  MODERATION_ACTION,
  MODERATION_TARGET_KINDS,
  MODERATION_TARGET_KIND,
  REPORT_REASONS,
  REPORT_REASON,
  REPORT_STATUS,
  INVITATION_STATUSES,
  DB_LIMITS,
  REPORT_STATUSES,
  RANKING_PERIODS,
  READ_SOURCES,
  STORY_ERROR,
  CHAPTER_ERROR,
  chapterFormSchema,
  chapterSlugFormSchema,
  STORY_STATUSES,
  storyFormSchema,
  DEFAULT_READER_PREFERENCES,
  READER_FONT,
  READER_FONTS,
  READER_FONT_SIZE,
  READER_FONT_SIZES,
  READER_LINE_HEIGHT,
  READER_LINE_HEIGHTS,
  READER_THEME,
  READER_THEMES,
  hasReaderPreferences,
  parseReaderPreferences,
  STORY_STATUS,
  VISIBILITY,
  CHAPTER_STATUS,
  BLOCK_TYPE,
  VISIBILITIES,
  chapterBodySchema,
  chapterDraftSaveSchema,
  chapterPublishedPayloadSchema,
  classifyRpcError,
  commentCreateSchema,
  countWords,
  publishChapterArgsSchema,
  readingListCreateSchema,
  reportCreateSchema,
  scheduleChapterArgsSchema,
  slugSchema,
  storyCreateSchema,
  usernameSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
  profileFormSchema,
  ANNOUNCEMENT_ERROR,
  ANNOUNCEMENT_KIND,
  ANNOUNCEMENT_KINDS,
  NOTIFICATION_PREFERENCE_TYPES,
  announcementFormSchema,
  isAllowedAnnouncementLink,
  toAnnouncementPayload,
} from "./index.ts";

type Contract = { enums: Record<string, string[]>; maxLengths: Record<string, number> };
const contract: Contract = JSON.parse(readFileSync(new URL("./db-contract.generated.json", import.meta.url), "utf8"));
const sorted = (xs: readonly string[]) => [...xs].sort();

describe("enums match the CHECK constraints of the real schema", () => {
  const cases: [string, readonly string[]][] = [
    ["app_users.account_status", ACCOUNT_STATUSES],
    ["stories.status", STORY_STATUSES],
    ["stories.visibility", VISIBILITIES],
    ["reading_lists.visibility", VISIBILITIES],
    ["chapters.status", CHAPTER_STATUSES],
    ["chapter_version_blocks.block_type", BLOCK_TYPES],
    ["story_collaborators.collaborator_role", COLLABORATOR_ROLES],
    ["story_invitations.status", INVITATION_STATUSES],
    ["story_invitations.collaborator_role", COLLABORATOR_ROLES],
    ["comments.status", COMMENT_STATUSES],
    ["user_settings.language_code", STORY_LANGUAGES],
    ["comment_hides.source", HIDE_SOURCES],
    ["moderation_actions.action", MODERATION_ACTIONS],
    ["moderation_actions.target_kind", MODERATION_TARGET_KINDS],
    ["content_reports.status", REPORT_STATUSES],
    ["chapter_reviews.status", REVIEW_STATUSES],
    ["user_achievements.code", ACHIEVEMENT_CODES],
    ["announcements.kind", ANNOUNCEMENT_KINDS],
    ["announcements.locale", STORY_LANGUAGES],
    ["notification_preferences.event_type", NOTIFICATION_PREFERENCE_TYPES],
    ["ranking_snapshots.period", RANKING_PERIODS],
    ["chapter_read_events.source", READ_SOURCES],
    ["comment_reactions.reaction", COMMENT_REACTIONS],
    ["chapter_highlights.style", HIGHLIGHT_STYLES],
  ];
  it.each(cases)("%s", (column, values) => {
    expect(contract.enums[column], `${column} missing from contract`).toBeDefined();
    expect(sorted(values)).toEqual(contract.enums[column]);
  });
  it("every CHECK enum in the schema is covered here", () => {
    expect(Object.keys(contract.enums).sort()).toEqual(cases.map(([c]) => c).sort());
  });
});

describe("named enum constants", () => {
  it.each([
    ["STORY_STATUS", STORY_STATUS, STORY_STATUSES],
    ["VISIBILITY", VISIBILITY, VISIBILITIES],
    ["CHAPTER_STATUS", CHAPTER_STATUS, CHAPTER_STATUSES],
    ["BLOCK_TYPE", BLOCK_TYPE, BLOCK_TYPES],
    ["REPORT_STATUS", REPORT_STATUS, REPORT_STATUSES],
    ["REPORT_REASON", REPORT_REASON, REPORT_REASONS],
    ["MODERATION_ACTION", MODERATION_ACTION, MODERATION_ACTIONS],
    ["MODERATION_TARGET_KIND", MODERATION_TARGET_KIND, MODERATION_TARGET_KINDS],
    ["REVIEW_STATUS", REVIEW_STATUS, REVIEW_STATUSES],
    ["ACHIEVEMENT_CODE", ACHIEVEMENT_CODE, ACHIEVEMENT_CODES],
    ["ANNOUNCEMENT_KIND", ANNOUNCEMENT_KIND, ANNOUNCEMENT_KINDS],
    ["COMMENT_REACTION", COMMENT_REACTION, COMMENT_REACTIONS],
    ["HIGHLIGHT_STYLE", HIGHLIGHT_STYLE, HIGHLIGHT_STYLES],
  ] as const)("%s has exactly one constant per enum value", (_name, constants, values) => {
    expect(sorted(Object.values(constants))).toEqual(sorted(values));
  });
});

describe("length limits match the varchar columns", () => {
  const cases: [string, number][] = [
    ["app_users.display_name", DB_LIMITS.displayName],
    ["stories.title", DB_LIMITS.storyTitle],
    ["stories.slug", DB_LIMITS.storySlug],
    ["stories.language_code", DB_LIMITS.languageCode],
    ["chapters.slug", DB_LIMITS.chapterSlug],
    ["chapter_drafts.title", DB_LIMITS.chapterTitle],
    ["chapter_versions.title", DB_LIMITS.chapterTitle],
    ["reading_lists.title", DB_LIMITS.readingListTitle],
    ["content_reports.reason", DB_LIMITS.reportReason],
    ["story_parts.title", DB_LIMITS.storyPartTitle],
    ["chapter_reviews.request_note", DB_LIMITS.reviewNote],
    ["chapter_reviews.decision_note", DB_LIMITS.reviewNote],
    ["announcements.title", DB_LIMITS.announcementTitle],
    ["announcements.body", DB_LIMITS.announcementBody],
    ["announcements.link_url", DB_LIMITS.announcementLink],
  ];
  it.each(cases)("%s", (column, max) => expect(contract.maxLengths[column]).toBe(max));
});

const id = (n: number) => `31000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

describe("chapter body", () => {
  const valid = [
    { block_id: id(1), type: "heading", text: "Chapter One" },
    {
      block_id: id(2),
      type: "paragraph",
      text: "The afternoon light spilled across the quiet room.",
      marks: [{ type: "bold", from: 0, to: 3 }],
    },
    { block_id: id(3), type: "image", image_storage_key: "stories/x/cover.png" },
    { block_id: id(4), type: "divider" },
  ];

  it("accepts every block type", () => expect(chapterBodySchema.parse(valid)).toHaveLength(4));
  it("counts words like the RPC (same fixture gives 10)", () => {
    expect(countWords(chapterBodySchema.parse(valid))).toBe(10);
    expect(countWords([{ block_id: id(1), type: "paragraph", text: "   " }])).toBe(0);
  });

  // The same invalid drafts supabase/tests/20_publish.test.sql proves the RPC rejects. The app schema must
  // reject them too, so the editor never lets a draft reach the server only to be refused.
  const dupe = id(9);
  const invalid: [string, unknown][] = [
    ["empty array", []],
    ["not an array", { not: "an array" }],
    ["block_id not a uuid", [{ block_id: "not-a-uuid", type: "paragraph", text: "x" }]],
    ["block_id missing", [{ type: "paragraph", text: "missing id" }]],
    [
      "duplicate block_id",
      [
        { block_id: dupe, type: "paragraph", text: "a" },
        { block_id: dupe, type: "paragraph", text: "b" },
      ],
    ],
    ["unknown type", [{ block_id: dupe, type: "video", text: "a" }]],
    ["paragraph without text", [{ block_id: dupe, type: "paragraph" }]],
    ["image without key", [{ block_id: dupe, type: "image" }]],
    ["marks not an array", [{ block_id: dupe, type: "paragraph", text: "a", marks: "bold" }]],
  ];
  it.each(invalid)("rejects: %s", (_name, body) => expect(chapterBodySchema.safeParse(body).success).toBe(false));

  it("is stricter than the RPC on purpose", () => {
    const no = (b: unknown) => expect(chapterBodySchema.safeParse(b).success).toBe(false);
    no([{ block_id: dupe, text: "type omitted" }]);
    no([{ block_id: dupe, type: "paragraph", text: "a", extra: 1 }]);
    no([{ block_id: dupe, type: "paragraph", text: "abc", marks: [{ type: "bold", from: 0, to: 9 }] }]);
    no([{ block_id: dupe, type: "paragraph", text: "abc", marks: [{ type: "bold", from: 2, to: 2 }] }]);
  });

  it("validates a whole draft payload", () => {
    const draft = { chapter_id: id(100), title: "  Chapter 1 ", body: valid, revision: 1 };
    expect(chapterDraftSaveSchema.parse(draft).title).toBe("Chapter 1");
    expect(chapterDraftSaveSchema.safeParse({ ...draft, revision: 0 }).success).toBe(false);
    expect(chapterDraftSaveSchema.safeParse({ ...draft, title: "   " }).success).toBe(false);
    expect(chapterDraftSaveSchema.safeParse({ ...draft, title: "x".repeat(201) }).success).toBe(false);
  });
});

describe("rpc args", () => {
  it("publish", () => {
    expect(publishChapterArgsSchema.parse({ p_chapter_id: id(1) })).toEqual({ p_chapter_id: id(1) });
    expect(publishChapterArgsSchema.safeParse({ p_chapter_id: "x" }).success).toBe(false);
    expect(publishChapterArgsSchema.safeParse({ p_chapter_id: id(1), p_expected_revision: 0 }).success).toBe(false);
  });
  it("schedule needs an ISO timestamp with offset", () => {
    const ok = { p_chapter_id: id(1), p_scheduled_for: "2030-01-01T09:00:00+07:00" };
    expect(scheduleChapterArgsSchema.safeParse(ok).success).toBe(true);
    expect(scheduleChapterArgsSchema.safeParse({ ...ok, p_scheduled_for: "tomorrow" }).success).toBe(false);
    expect(scheduleChapterArgsSchema.safeParse({ ...ok, p_scheduled_for: "2030-01-01T09:00:00" }).success).toBe(false);
  });
  it("classifies SQLSTATEs", () => {
    expect(classifyRpcError("PT409")).toBe("conflict");
    expect(classifyRpcError("PT404")).toBe("notFound");
    expect(classifyRpcError("42501")).toBe("forbidden");
    expect(classifyRpcError("22023")).toBe("invalid");
    expect(classifyRpcError("PT429")).toBe("rateLimited");
    expect(classifyRpcError("XX000")).toBe("unknown");
    expect(classifyRpcError(undefined)).toBe("unknown");
  });
});

describe("inputs", () => {
  it("username follows the DB check", () => {
    for (const ok of ["abc", "Reader_2", "a".repeat(30)]) expect(usernameSchema.safeParse(ok).success).toBe(true);
    for (const bad of ["ab", "a".repeat(31), "has space", "dấu", "a-b"])
      expect(usernameSchema.safeParse(bad).success).toBe(false);
  });
  it("slug", () => {
    const s = slugSchema(120);
    for (const ok of ["tale", "chapter-1", "a1-b2-c3"]) expect(s.safeParse(ok).success).toBe(true);
    for (const bad of ["", "Tale", "a--b", "-a", "a-", "a b"]) expect(s.safeParse(bad).success).toBe(false);
  });
  it("story create applies the same defaults as the table", () => {
    const s = storyCreateSchema.parse({ title: " Tale ", slug: "tale" });
    expect(s).toMatchObject({
      title: "Tale",
      synopsis: "",
      language_code: "vi",
      status: "draft",
      visibility: "private",
      is_mature: false,
    });
    expect(storyCreateSchema.safeParse({ title: "x", slug: "x", owner_id: id(1) }).success).toBe(false); // identity is not client input
    expect(storyCreateSchema.safeParse({ title: "x", slug: "x", visibility: "secret" }).success).toBe(false);
  });
  it("comment", () => {
    expect(commentCreateSchema.safeParse({ chapter_id: id(1), body: "  " }).success).toBe(false);
    expect(commentCreateSchema.safeParse({ chapter_id: id(1), body: "x".repeat(10_001) }).success).toBe(false);
    expect(commentCreateSchema.parse({ chapter_id: id(1), body: " hi " }).body).toBe("hi");
  });
  it("report needs exactly one target", () => {
    const base = { reason: "spam" };
    expect(reportCreateSchema.safeParse(base).success).toBe(false);
    expect(reportCreateSchema.safeParse({ ...base, comment_id: id(1) }).success).toBe(true);
    expect(reportCreateSchema.safeParse({ ...base, comment_id: id(1), story_id: id(2) }).success).toBe(false);
    expect(reportCreateSchema.safeParse({ comment_id: id(1), reason: "x".repeat(41) }).success).toBe(false);
  });
  it("reading list", () => {
    expect(readingListCreateSchema.parse({ title: "Faves" })).toMatchObject({ description: "", visibility: "private" });
  });
  it("notification payload matches what the outbox worker writes", () => {
    const payload = { story_title: "T", story_slug: "t", chapter_title: "C", chapter_slug: "c", chapter_sort_order: 1 };
    expect(chapterPublishedPayloadSchema.safeParse(payload).success).toBe(true);
  });
});

describe("auth schemas", () => {
  it("normalises email and accepts a valid sign-in", () => {
    expect(signInSchema.parse({ email: "  Reader@Example.COM ", password: "x" }).email).toBe("reader@example.com");
    expect(signInSchema.safeParse({ email: "nope", password: "x" }).success).toBe(false);
    expect(signInSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
  });

  it("sign-in does not apply the new-password length rule (old passwords must still work)", () => {
    expect(signInSchema.safeParse({ email: "a@b.co", password: "short" }).success).toBe(true);
  });

  it("sign-up enforces password length in bytes, not characters", () => {
    const base = { email: "a@b.co" };
    expect(signUpSchema.safeParse({ ...base, password: "1234567" }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...base, password: "12345678" }).success).toBe(true);
    expect(signUpSchema.safeParse({ ...base, password: "a".repeat(72) }).success).toBe(true);
    expect(signUpSchema.safeParse({ ...base, password: "a".repeat(73) }).success).toBe(false);
    // 25 three-byte characters = 75 bytes: short in characters, too long for bcrypt
    expect(signUpSchema.safeParse({ ...base, password: "ệ".repeat(25) }).success).toBe(false);
  });

  it("sign-up treats empty optional fields as absent and validates the rest", () => {
    const parsed = signUpSchema.parse({ email: "a@b.co", password: "12345678", username: "", display_name: "  " });
    expect(parsed.username).toBeUndefined();
    expect(parsed.display_name).toBeUndefined();
    expect(signUpSchema.parse({ email: "a@b.co", password: "12345678", username: "reader_1" }).username).toBe(
      "reader_1",
    );
    expect(signUpSchema.safeParse({ email: "a@b.co", password: "12345678", username: "no spaces" }).success).toBe(
      false,
    );
    expect(signUpSchema.safeParse({ email: "a@b.co", password: "12345678", role: "admin" }).success).toBe(false);
  });

  it("forgot and reset", () => {
    expect(forgotPasswordSchema.safeParse({ email: "a@b.co" }).success).toBe(true);
    expect(resetPasswordSchema.safeParse({ password: "12345678", confirmPassword: "12345678" }).success).toBe(true);
    const mismatch = resetPasswordSchema.safeParse({ password: "12345678", confirmPassword: "1234567x" });
    expect(mismatch.success).toBe(false);
    if (!mismatch.success) expect(mismatch.error.issues[0]?.path).toEqual(["confirmPassword"]);
  });
});

describe("auth schema error codes (the UI translates these)", () => {
  const codes = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
    result.success ? [] : (result.error?.issues.map((i) => i.message) ?? []);

  it("returns stable codes, never prose", () => {
    expect(codes(signInSchema.safeParse({ email: "nope", password: "x" }))).toEqual(["email_invalid"]);
    expect(codes(signInSchema.safeParse({ email: "a@b.co", password: "" }))).toEqual(["password_required"]);
    expect(codes(signUpSchema.safeParse({ email: "a@b.co", password: "123" }))).toEqual(["password_too_short"]);
    expect(codes(signUpSchema.safeParse({ email: "a@b.co", password: "a".repeat(80) }))).toEqual(["password_too_long"]);
    expect(codes(signUpSchema.safeParse({ email: "a@b.co", password: "12345678", username: "a b" }))).toEqual([
      "username_invalid",
    ]);
    expect(codes(resetPasswordSchema.safeParse({ password: "12345678", confirmPassword: "x" }))).toEqual([
      "confirm_mismatch",
    ]);
  });
});

describe("profileFormSchema", () => {
  const base = { username: "reader_1", display_name: "  Người Đọc  ", bio: "" };

  it("trims names and turns an empty bio into null (clears it)", () => {
    expect(profileFormSchema.parse(base)).toEqual({ username: "reader_1", display_name: "Người Đọc", bio: null });
    expect(profileFormSchema.parse({ ...base, bio: "  hi  " }).bio).toBe("hi");
    expect(profileFormSchema.parse({ ...base, bio: "   " }).bio).toBeNull();
  });

  it("returns stable codes", () => {
    const codes = (input: object) => {
      const r = profileFormSchema.safeParse(input);
      return r.success ? [] : r.error.issues.map((i) => i.message);
    };
    expect(codes({ ...base, username: "a b" })).toEqual(["username_invalid"]);
    expect(codes({ ...base, username: "ab" })).toEqual(["username_invalid"]);
    expect(codes({ ...base, display_name: "   " })).toEqual(["display_name_required"]);
    expect(codes({ ...base, display_name: "x".repeat(101) })).toEqual(["display_name_too_long"]);
    expect(codes({ ...base, bio: "x".repeat(1001) })).toEqual(["bio_too_long"]);
  });

  it("rejects fields a user must not set through this form", () => {
    expect(profileFormSchema.safeParse({ ...base, account_status: "active" }).success).toBe(false);
    expect(profileFormSchema.safeParse({ ...base, avatar_storage_key: "x" }).success).toBe(false);
  });
});

describe("reader preferences", () => {
  it("fills every missing or invalid field with its default and drops unknown keys", () => {
    expect(parseReaderPreferences(undefined)).toEqual(DEFAULT_READER_PREFERENCES);
    expect(parseReaderPreferences("nope")).toEqual(DEFAULT_READER_PREFERENCES);
    expect(parseReaderPreferences([])).toEqual(DEFAULT_READER_PREFERENCES);
    expect(parseReaderPreferences({ theme: "sepia" })).toEqual({ ...DEFAULT_READER_PREFERENCES, theme: "sepia" });
    expect(parseReaderPreferences({ theme: "neon", fontSize: "xl", extra: 1 })).toEqual({
      ...DEFAULT_READER_PREFERENCES,
      fontSize: "xl",
    });
  });

  it("round-trips every allowed value", () => {
    for (const fontSize of READER_FONT_SIZES)
      for (const lineHeight of READER_LINE_HEIGHTS)
        for (const font of READER_FONTS)
          for (const theme of READER_THEMES) {
            const value = { fontSize, lineHeight, font, theme };
            expect(parseReaderPreferences(value)).toEqual(value);
          }
  });

  it("tells a saved row from an empty one", () => {
    expect(hasReaderPreferences({})).toBe(false);
    expect(hasReaderPreferences(null)).toBe(false);
    expect(hasReaderPreferences([])).toBe(false);
    expect(hasReaderPreferences({ theme: "neon" })).toBe(false);
    expect(hasReaderPreferences({ theme: "dark" })).toBe(true);
  });

  it("has a named constant per allowed value", () => {
    expect(sorted(Object.values(READER_FONT_SIZE))).toEqual(sorted(READER_FONT_SIZES));
    expect(sorted(Object.values(READER_LINE_HEIGHT))).toEqual(sorted(READER_LINE_HEIGHTS));
    expect(sorted(Object.values(READER_FONT))).toEqual(sorted(READER_FONTS));
    expect(sorted(Object.values(READER_THEME))).toEqual(sorted(READER_THEMES));
  });
});

describe("story form schema", () => {
  const valid = {
    title: "  Rừng sương mù ",
    slug: "rung-suong-mu",
    synopsis: "",
    categoryId: "",
    languageCode: "vi",
    status: "draft",
    visibility: "private",
    isMature: false,
  };
  const codeOf = (input: unknown) => storyFormSchema.safeParse(input).error?.issues.map((i) => i.message);

  it("accepts a normal form and trims text", () => {
    const parsed = storyFormSchema.parse(valid);
    expect(parsed.title).toBe("Rừng sương mù");
  });

  it("reports stable codes the UI translates", () => {
    expect(codeOf({ ...valid, title: "   " })).toEqual([STORY_ERROR.titleRequired]);
    expect(codeOf({ ...valid, title: "a".repeat(201) })).toEqual([STORY_ERROR.titleTooLong]);
    // an empty slug also fails the pattern; the first code (shown to the user) is "required"
    expect(codeOf({ ...valid, slug: "" })?.[0]).toBe(STORY_ERROR.slugRequired);
    expect(codeOf({ ...valid, slug: "a".repeat(121) })).toEqual([STORY_ERROR.slugTooLong]);
    for (const slug of ["Has-Capitals", "two  words", "-lead", "trail-", "a--b", "đường"]) {
      expect(codeOf({ ...valid, slug }), slug).toEqual([STORY_ERROR.slugInvalid]);
    }
    expect(codeOf({ ...valid, synopsis: "a".repeat(5001) })).toEqual([STORY_ERROR.synopsisTooLong]);
    expect(codeOf({ ...valid, languageCode: "Vietnamese" })).toEqual([STORY_ERROR.languageInvalid]);
  });

  it("rejects values outside the enums and unknown fields", () => {
    expect(storyFormSchema.safeParse({ ...valid, status: "archived" }).success).toBe(false);
    expect(storyFormSchema.safeParse({ ...valid, visibility: "friends" }).success).toBe(false);
    expect(storyFormSchema.safeParse({ ...valid, categoryId: "abc" }).success).toBe(false);
    expect(storyFormSchema.safeParse({ ...valid, owner_id: "x" }).success).toBe(false);
  });
});

describe("chapter form schemas", () => {
  const codeOf = (
    schema: { safeParse: (v: unknown) => { error?: { issues: { message: string }[] } } },
    input: unknown,
  ) => schema.safeParse(input).error?.issues.map((i) => i.message);

  it("accepts a title and slug, trimming both", () => {
    expect(chapterFormSchema.parse({ title: "  Chương 1 ", slug: " chuong-1 " })).toEqual({
      title: "Chương 1",
      slug: "chuong-1",
    });
  });

  it("reports stable codes", () => {
    expect(codeOf(chapterFormSchema, { title: "  ", slug: "a" })).toEqual([CHAPTER_ERROR.titleRequired]);
    expect(codeOf(chapterFormSchema, { title: "a".repeat(201), slug: "a" })).toEqual([CHAPTER_ERROR.titleTooLong]);
    expect(codeOf(chapterFormSchema, { title: "a", slug: "" })?.[0]).toBe(CHAPTER_ERROR.slugRequired);
    expect(codeOf(chapterFormSchema, { title: "a", slug: "a".repeat(121) })).toEqual([CHAPTER_ERROR.slugTooLong]);
    for (const slug of ["Cap", "a b", "-a", "a-", "a--b", "đ"]) {
      expect(codeOf(chapterFormSchema, { title: "a", slug }), slug).toEqual([CHAPTER_ERROR.slugInvalid]);
    }
    expect(codeOf(chapterSlugFormSchema, { slug: "Bad" })).toEqual([CHAPTER_ERROR.slugInvalid]);
  });

  it("rejects unknown fields", () => {
    expect(chapterFormSchema.safeParse({ title: "a", slug: "a", sort_order: 1 }).success).toBe(false);
  });
});

describe("reading habits match the migration", () => {
  const sql = readFileSync(
    new URL("../../../supabase/migrations/20261106020000_reading_habits.sql", import.meta.url),
    "utf8",
  );
  it("daily goal bounds and default", () => {
    expect(sql).toContain(
      `daily_chapter_goal smallint NOT NULL DEFAULT ${DAILY_GOAL.default} CHECK (daily_chapter_goal BETWEEN ${DAILY_GOAL.min} AND ${DAILY_GOAL.max})`,
    );
    expect(sql).toContain(`c_default_goal constant integer := ${DAILY_GOAL.default};`);
  });
  it("badge thresholds", () => {
    expect(sql).toContain(`c_streak_7 constant integer := ${ACHIEVEMENT_THRESHOLDS.streak_7.target};`);
    expect(sql).toContain(`c_streak_30 constant integer := ${ACHIEVEMENT_THRESHOLDS.streak_30.target};`);
    expect(sql).toContain(`c_stories_10 constant integer := ${ACHIEVEMENT_THRESHOLDS.stories_10.target};`);
    expect(sql).toContain(`('first_chapter', v_finished >= ${ACHIEVEMENT_THRESHOLDS.first_chapter.target})`);
    expect(sql).toContain(`('first_story', v_stories >= ${ACHIEVEMENT_THRESHOLDS.first_story.target})`);
  });
});

describe("announcement form", () => {
  const valid = {
    kind: "banner",
    title: "  Writing contest  ",
    body: "",
    link: "/ranking",
    locale: "",
    startsAt: "2026-11-05T10:00:00.000Z",
    endsAt: "2026-11-12T10:00:00.000Z",
  } as const;
  const codes = (input: unknown) => {
    const result = announcementFormSchema.safeParse(input);
    return result.success ? [] : result.error.issues.map((issue) => issue.message);
  };

  it("turns a valid form into the row payload (empty fields are NULL)", () => {
    expect(toAnnouncementPayload(announcementFormSchema.parse(valid))).toEqual({
      kind: "banner",
      title: "Writing contest",
      body: null,
      link_url: "/ranking",
      locale: null,
      starts_at: "2026-11-05T10:00:00.000Z",
      ends_at: "2026-11-12T10:00:00.000Z",
    });
  });

  it("applies the same rules as the CHECK constraints", () => {
    expect(codes({ ...valid, title: "   " })).toEqual([ANNOUNCEMENT_ERROR.titleRequired]);
    expect(codes({ ...valid, title: "a".repeat(81) })).toEqual([ANNOUNCEMENT_ERROR.titleTooLong]);
    expect(codes({ ...valid, body: "a".repeat(281) })).toEqual([ANNOUNCEMENT_ERROR.bodyTooLong]);
    expect(codes({ ...valid, endsAt: valid.startsAt })).toEqual([ANNOUNCEMENT_ERROR.endBeforeStart]);
    expect(codes({ ...valid, startsAt: "soon" })).toEqual([ANNOUNCEMENT_ERROR.startInvalid]);
    expect(codes({ ...valid, locale: "fr" })).toHaveLength(1);
    for (const link of ["//evil.example", "/\\evil", "javascript:alert(1)", "http://example.com", "ranking"]) {
      expect(isAllowedAnnouncementLink(link), link).toBe(false);
      expect(codes({ ...valid, link }), link).toEqual([ANNOUNCEMENT_ERROR.linkInvalid]);
    }
    for (const link of ["/", "/ranking", "/story/abc?x=1", "https://example.com/contest"]) {
      expect(isAllowedAnnouncementLink(link), link).toBe(true);
    }
  });
});

describe("authoring4 inputs", () => {
  it("update days round-trip through the bit mask (Monday = bit 0)", () => {
    expect(listToUpdateDays(["mon", "thu"])).toBe(9);
    expect(updateDaysToList(9)).toEqual(["mon", "thu"]);
    expect(updateDaysToList(127)).toHaveLength(7);
    expect(updateDaysSchema.safeParse(128).success).toBe(false);
    expect(updateDaysSchema.safeParse(-1).success).toBe(false);
  });

  it("checks a BlurHash like chk_story_cover_blurhash", () => {
    expect(isBlurhashFormat("LEHV6nWB2yk8pyo0adR*.7kCMdnj")).toBe(true);
    expect(isBlurhashFormat("00TI:j")).toBe(true);
    expect(isBlurhashFormat("LEHV6nWB2yk8pyo0adR*.7kCMdn")).toBe(false);
    expect(isBlurhashFormat('LEHV6nWB2yk8pyo0adR*.7kCMd"j')).toBe(false);
    expect(isBlurhashFormat("~" + "0".repeat(43))).toBe(false);
    expect(isBlurhashFormat("00000")).toBe(false);
    expect(blurhashSchema.safeParse("nope").success).toBe(false);
  });

  it("story payloads accept the schedule and the hash", () => {
    const parsed = storyCreateSchema.parse({ title: "T", slug: "t", update_days: 9, cover_blurhash: "00TI:j" });
    expect(parsed.update_days).toBe(9);
    expect(storyCreateSchema.safeParse({ title: "T", slug: "t", cover_blurhash: "bad" }).success).toBe(false);
  });

  it("parts and review notes follow the column lengths", () => {
    const story = "31000000-0000-4000-8000-000000000001";
    expect(storyPartCreateSchema.safeParse({ story_id: story, title: "  Book one " }).success).toBe(true);
    expect(storyPartCreateSchema.safeParse({ story_id: story, title: "   " }).success).toBe(false);
    expect(storyPartCreateSchema.safeParse({ story_id: story, title: "a".repeat(121) }).success).toBe(false);
    expect(
      requestChapterReviewArgsSchema.safeParse({ p_chapter_id: story, p_expected_revision: 1, p_note: "n".repeat(501) })
        .success,
    ).toBe(false);
    expect(REVIEW_STATUS.CHANGES_REQUESTED).toBe("changes_requested");
    expect(REVIEW_STATUSES).toContain("approved");
  });
});
