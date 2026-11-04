import type { DataClient } from "../../_shared/client.ts";
import { unwrap } from "../../_shared/errors.ts";
import { toReaderBlocks, type BlockRow, type ReaderBlock } from "../../reader/index.ts";
import { toChapterVersions, type ChapterVersion, type VersionRow } from "../model/history.ts";

const VERSION_COLUMNS =
  "id, version_no, title, word_count, created_at, published_at, author:app_users!chapter_versions_created_by_fkey(username, display_name)";

/** Every published version of the chapter (newest first) and which one readers see now. RLS limits it to editors. */
export async function listChapterVersions(client: DataClient, chapterId: string): Promise<ChapterVersion[]> {
  const [versions, chapter] = await Promise.all([
    client
      .from("chapter_versions")
      .select(VERSION_COLUMNS)
      .eq("chapter_id", chapterId)
      .order("version_no", { ascending: false })
      .returns<VersionRow[]>(),
    client.from("chapters").select("published_version_id").eq("id", chapterId).maybeSingle(),
  ]);
  const liveId = unwrap(chapter)?.published_version_id ?? null;
  return toChapterVersions(unwrap(versions) ?? [], liveId);
}

/** The blocks of one version, in reading order. */
export async function getVersionBlocks(client: DataClient, versionId: string): Promise<ReaderBlock[]> {
  const rows =
    unwrap(
      await client
        .from("chapter_version_blocks")
        .select("block_id, sort_order, block_type, text_content, rich_text, image_storage_key")
        .eq("version_id", versionId)
        .order("sort_order", { ascending: true })
        .returns<BlockRow[]>(),
    ) ?? [];
  return toReaderBlocks(rows);
}
