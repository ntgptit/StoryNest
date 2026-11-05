// Chapter 2: add, write, publish; the follower gets a notification (VER-RDR-07); author reply (VER-RDR-08). Run between 06 and 07.
import { B, browser, ctxFor, record, shot, results, save, sleep } from "./pw.mjs";
import { as } from "./lib.mjs";
const b = await browser();
const { storyA } = results._data;
const toast = async (p) => (await p.locator("[data-sonner-toast]").first().innerText({ timeout: 10000 }).catch(() => "(no toast)")).replace(/\n/g, " ");
async function addChapter(p, title) {
  await p.goto(`${B}/studio/story/${storyA}/chapters`, { waitUntil: "networkidle" });
  await p.getByLabel("Tên chương").fill(title);
  await p.getByRole("button", { name: "Thêm chương" }).last().click();
  await p.getByText("Đã thêm chương.").first().waitFor({ timeout: 15000 });
  await p.waitForTimeout(800);
}
async function openEditor(p, title) {
  await p.goto(`${B}/studio/story/${storyA}/chapters`, { waitUntil: "networkidle" });
  const row = p.getByRole("listitem").filter({ hasText: title }).first();
  await row.getByRole("link", { name: /Soạn nội dung/ }).click();
  await p.waitForURL(/\/chapter\/[0-9a-f-]{36}$/); return p.url().split("/").pop();
}
async function write(p, text) {
  await p.getByRole("textbox", { name: "Nội dung chương" }).click(); await p.keyboard.type(text);
  await p.getByRole("button", { name: "Lưu nháp" }).click(); await p.waitForTimeout(2500);
}
try {
  const a = await (await ctxFor(b, "author")).newPage();
  // chapter 2 → publish → follower notification
  await addChapter(a, "Chương thử hai");
  const ch2 = await openEditor(a, "Chương thử hai"); results._data.ch2 = ch2; save();
  await write(a, "Nội dung chương hai (QA).");
  await a.getByRole("button", { name: "Đăng chương", exact: true }).click(); await a.getByText("Đã đăng chương.").first().waitFor({ timeout: 20000 });
  const t0 = Date.now();
  const rd = await as("reader"); let n = null;
  for (let i = 0; i < 30 && !n; i++) { await sleep(10000); const q = await rd.from("notifications").select("type,payload,read_at,created_at").eq("type", "chapter_published").order("created_at", { ascending: false }).limit(1); if (q.data?.[0] && q.data[0].payload?.chapter_title === "Chương thử hai") n = q.data[0]; }
  const secs = Math.round((Date.now() - t0) / 1000);
  const r = await (await ctxFor(b, "reader", { width: 390, height: 844 })).newPage();
  await r.goto(`${B}/`, { waitUntil: "networkidle" }); await shot(r, "rdr-07-bell");
  const bell = await r.getByRole("link", { name: /Thông báo/ }).first().getAttribute("aria-label").catch(() => "?");
  await r.goto(`${B}/notifications`, { waitUntil: "networkidle" }); await shot(r, "rdr-07-notifications");
  let opened = "not clicked";
  const item = r.getByRole("link").filter({ hasText: "Chương thử hai" }).first();
  if (await item.count()) { await item.click(); await r.waitForLoadState("networkidle"); opened = r.url().replace(B, "") + " h1=" + (await r.locator("h1").first().innerText().catch(() => "")); }
  record("VER-RDR-07", n && /Chương thử hai/.test(opened) ? "PASS" : "CHECK", `chapter 2 published → follower notification after ~${secs}s: ${!!n}; bell label "${bell}"; clicking it opened ${opened}`);
  // RDR-08 author replies to reader comment
  const cr = await as("reader"); const cm = await cr.from("comments").select("id,chapter_id").eq("chapter_id", results._data.ch1).ilike("body", "%Bình luận chương từ người đọc%").limit(1).single();
  const au = await as("author");
  const rep = await au.rpc("post_comment", { p_id: crypto.randomUUID(), p_chapter_id: cm.data.chapter_id, p_body: "[QA] Tác giả trả lời bình luận.", p_parent_id: cm.data.id, p_block_id: null }).then((x) => x, (e) => ({ error: e }));
  let replyNote = rep.error ? `RPC error ${rep.error.message}` : "reply via RPC";
  if (rep.error) { // fall back to UI
    const ap = await (await ctxFor(b, "author", { width: 390, height: 844 })).newPage();
    await ap.goto(B + results._data.ch1Url, { waitUntil: "networkidle" });
    const art = ap.getByRole("article").filter({ hasText: "Bình luận chương từ người đọc" }).first(); await art.scrollIntoViewIfNeeded();
    await art.getByRole("button", { name: "Trả lời", exact: true }).click();
    await ap.getByLabel("Viết trả lời").fill("[QA] Tác giả trả lời bình luận.");
    await ap.getByRole("button", { name: "Đăng", exact: true }).last().click(); await sleep(2000); replyNote = "reply via UI";
  }
  let rn = null; for (let i = 0; i < 30 && !rn; i++) { await sleep(10000); const q = await rd.from("notifications").select("type,payload").eq("type", "comment_reply").limit(1); rn = q.data?.[0]; }
  await r.goto(`${B}/notifications`, { waitUntil: "networkidle" }); await shot(r, "rdr-08-reply-notification");
  let opened2 = "not clicked"; const it2 = r.getByRole("link").filter({ hasText: /trả lời/i }).first();
  if (await it2.count()) { await it2.click(); await r.waitForLoadState("networkidle"); await sleep(1500); opened2 = r.url().replace(B, ""); await shot(r, "rdr-08-reply-opened"); }
  const sheetOpen = await r.getByRole("dialog").count();
  record("VER-RDR-08", rn ? "PASS" : "FAIL", `${replyNote}; reader got comment_reply: ${!!rn} (excerpt "${rn?.payload?.excerpt ?? ""}"); opening it went to ${opened2}; comment sheet/dialog open: ${sheetOpen > 0} (U-NOTI-01)`);
} catch (e) { console.error("STAGE ERROR", e.message); } finally { await b.close(); }
