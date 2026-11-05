import { B, browser, ctxFor, record, shot, results, save, sleep } from "./pw.mjs";
import { as, anon } from "./lib.mjs";
const b = await browser();
const { storyA, ch1 } = results._data;
try {
  // RDR-09 switch off "Chương mới"
  const r = await (await ctxFor(b, "reader")).newPage();
  await r.goto(`${B}/settings`, { waitUntil: "networkidle" }); await sleep(1500);
  const sw = r.getByRole("switch", { name: /Chương mới/ });
  const was = await sw.getAttribute("aria-checked"); if (was === "true") { await sw.click(); await sleep(2000); }
  await shot(r, "rdr-09-settings-off");
  const a = await (await ctxFor(b, "author")).newPage();
  await a.goto(`${B}/studio/story/${storyA}/chapters`, { waitUntil: "networkidle" });
  await a.getByLabel("Tên chương").fill("Chương thử bốn"); await a.getByRole("button", { name: "Thêm chương" }).last().click(); await a.getByText("Đã thêm chương.").first().waitFor();
  await a.reload({ waitUntil: "networkidle" });
  await a.getByRole("listitem").filter({ hasText: "Chương thử bốn" }).first().getByRole("link", { name: /Soạn nội dung/ }).click(); await a.waitForURL(/\/chapter\/[0-9a-f-]{36}$/);
  const ch4 = a.url().split("/").pop(); results._data.ch4 = ch4; save();
  await a.getByRole("textbox", { name: "Nội dung chương" }).click(); await a.keyboard.type("Nội dung chương bốn (QA)."); await a.getByRole("button", { name: "Lưu nháp" }).click(); await sleep(2500);
  await a.getByRole("button", { name: "Đăng chương", exact: true }).click(); await a.getByText("Đã đăng chương.").first().waitFor({ timeout: 20000 });
  await sleep(100000);
  const rd = await as("reader");
  const got = await rd.from("notifications").select("id").eq("chapter_id", ch4);
  record("VER-RDR-09", got.data?.length === 0 ? "PASS" : "FAIL", `reader switched off "Chương mới" (was ${was}); author published chapter 4; after 100 s the reader has ${got.data?.length} notification(s) for it (BR-SET-006)`);
  await r.goto(`${B}/settings`, { waitUntil: "networkidle" }); await sleep(1000);
  if ((await r.getByRole("switch", { name: /Chương mới/ }).getAttribute("aria-checked")) === "false") { await r.getByRole("switch", { name: /Chương mới/ }).click(); await sleep(1500); }
  // RDR-10 continue: story page vs library
  await r.goto(`${B}/story/${storyA}/x`, { waitUntil: "networkidle" }); await sleep(1000);
  const cta = await r.getByRole("link", { name: /Đọc tiếp|Bắt đầu đọc|Chương/ }).first().innerText().catch(() => "?");
  await r.goto(`${B}/library`, { waitUntil: "networkidle" }); await sleep(1500);
  const libRow = (await r.locator("main").innerText()).match(/\[QA\][^\n]*\n[\s\S]{0,160}/)?.[0]?.replace(/\n/g, " | ") ?? "?";
  const libLink = await r.locator("main a").filter({ hasText: /Đọc tiếp|chương/i }).first().getAttribute("href").catch(() => "?");
  await shot(r, "rdr-10-library");
  record("VER-RDR-10", "INFO", `after finishing chapter 1 (completed_at set): story page CTA "${cta}"; library "Reading" row "${libRow}" → ${libLink} (F-PROG-02)`);
  // RDR-11 guest header sign-in from a chapter
  const g = await (await ctxFor(b, "guest")).newPage();
  await g.goto(B + results._data.ch1Url, { waitUntil: "networkidle" });
  const href = await g.getByRole("link", { name: "Đăng nhập", exact: true }).first().getAttribute("href");
  record("VER-RDR-11", href === "/login" ? "CONFIRMED" : "REFUTED", `header "Đăng nhập" on a chapter page links to "${href}" (no next → user lands on /me or home after sign-in) (U-SHELL-04)`);
  // X-01 guest
  await g.goto(`${B}/studio/story/${storyA}`, { waitUntil: "networkidle" });
  record("VER-X-01", /\/login\?next=/.test(g.url()) ? "PASS" : "FAIL", `guest /studio/story/<A> → ${g.url().replace(B, "")}`);
  // X-02..04 API negatives
  const out = await as("outsider");
  const x2 = await out.from("stories").update({ title: "[QA] hijack" }).eq("id", storyA).select("id");
  record("VER-X-02", !x2.error && x2.data.length === 0 ? "PASS" : x2.error ? "PASS" : "FAIL", `outsider updating story A title → ${x2.error ? x2.error.code : x2.data.length + " rows"}`);
  const x3 = await out.from("chapter_drafts").select("chapter_id").eq("chapter_id", ch1);
  record("VER-X-03", (x3.data?.length ?? 0) === 0 ? "PASS" : "FAIL", `outsider reading drafts of story A → ${x3.error ? x3.error.code : x3.data.length + " rows"}`);
  const x4 = await rd.from("notifications").select("id,recipient_id").neq("recipient_id", rd.userId);
  record("VER-X-04", (x4.data?.length ?? 0) === 0 ? "PASS" : "FAIL", `reader selecting other users' notifications → ${x4.error ? x4.error.code : x4.data.length + " rows"}`);
  const an = anon(); const x4b = await an.from("chapter_drafts").select("chapter_id").limit(5);
  record("VER-X-04b", (x4b.data?.length ?? 0) === 0 ? "PASS" : "FAIL", `anonymous client reading chapter_drafts → ${x4b.error ? x4b.error.code : x4b.data.length + " rows"}`);
  // X-05 reader opens studio of A
  await r.goto(`${B}/studio/story/${storyA}`, { waitUntil: "networkidle" }); await sleep(1500);
  const x5 = await r.locator("main").innerText(); await shot(r, "x-05-reader-studio");
  record("VER-X-05", !/Lưu thay đổi/.test(x5) ? "PASS" : "FAIL", `reader opening /studio/story/<A> sees "${x5.slice(0, 100).replace(/\n/g, " | ")}"`);
  // X-06 malformed id
  await a.goto(`${B}/studio/story/not-a-uuid`, { waitUntil: "networkidle" }); await sleep(1500);
  const x6 = await a.locator("main").innerText(); await shot(a, "x-06-malformed-id");
  record("VER-X-06", /kết nối|Thử lại/.test(x6) ? "CONFIRMED" : "CHECK", `/studio/story/not-a-uuid shows "${x6.slice(0, 120).replace(/\n/g, " | ")}" (F-STM-06)`);
} catch (e) { console.error("STAGE ERROR", e.message); } finally { await b.close(); }
