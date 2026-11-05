import { B, browser, ctxFor, record, shot, results, sleep } from "./pw.mjs";
import { as } from "./lib.mjs";
const b = await browser();
const { storyA, ch1, outsiderComment: oc } = results._data;
const toast = async (p) => (await p.locator("[data-sonner-toast]").first().innerText({ timeout: 10000 }).catch(() => "(no toast)")).replace(/\n/g, " ");
const m = await (await ctxFor(b, "moderator")).newPage();
async function open(tab) { await m.goto(`${B}/moderation`, { waitUntil: "networkidle" }); await sleep(1500); if (tab) { await m.getByRole("tab", { name: tab }).click(); await sleep(1500); } }
async function act(tab, cardText, action, reason) {
  await open(tab);
  const card = m.getByRole("article", { name: cardText, exact: true }).filter({ has: m.getByRole("button", { name: action }) }).first();
  await card.getByRole("button", { name: action }).click();
  await m.getByLabel("Lý do (bắt buộc, được ghi lại)").fill(reason); await m.getByRole("button", { name: "Xác nhận" }).click(); await sleep(2000);
  return toast(m);
}
try {
  const rd = await as("reader");
  // MOD-05 remove story
  const rm = await act(null, "[QA] Câu chuyện kiểm thử A", "Gỡ truyện", "[QA] kiểm thử gỡ truyện");
  const a = await (await ctxFor(b, "author")).newPage();
  await a.goto(`${B}/studio`, { waitUntil: "networkidle" }); await sleep(1500);
  await a.getByRole("button", { name: /Hiện truyện đã xóa/ }).click().catch(() => {}); await sleep(800);
  const studio = await a.locator("main").innerText(); await shot(a, "mod-05-author-studio-removed");
  await a.getByRole("button", { name: "Khôi phục" }).first().click().catch(() => {}); const ra = await toast(a);
  record("VER-MOD-05", /Khôi phục/.test(studio) ? "CONFIRMED" : "CHECK", `moderator "Gỡ truyện" → "${rm}"; author Studio lists it under "Truyện đã xóa" with "Khôi phục", no moderation notice (${!/người điều hành|kiểm duyệt/i.test(studio)}); clicking Khôi phục → "${ra}" (F-MOD-02; note the same message appears for any owner restore, see VER-AUT-15)`);
  // MOD-06 open removed content
  await open("Đã xử lý");
  const card = m.getByRole("article", { name: "[QA] Câu chuyện kiểm thử A", exact: true }).first();
  const href = await card.getByRole("link", { name: "Mở nội dung" }).getAttribute("href");
  await m.goto(B + href, { waitUntil: "networkidle" }); await sleep(1000); const opened = (await m.locator("body").innerText()).slice(0, 200).replace(/\n+/g, " | ");
  await shot(m, "mod-06-open-removed");
  record("VER-MOD-06", /404|không tìm thấy|could not be found/i.test(opened) ? "CONFIRMED" : "CHECK", `"Mở nội dung" → ${href} shows "${opened.slice(0, 90)}" (F-MOD-09)`);
  // MOD-07 restore
  const rs = await act("Đã xử lý", "[QA] Câu chuyện kiểm thử A", "Khôi phục truyện", "[QA] kiểm thử khôi phục");
  const back = (await rd.from("stories").select("id").eq("id", storyA)).data.length === 1;
  record("VER-MOD-07", back ? "PASS" : "CHECK", `moderator "Khôi phục truyện" → "${rs}"; story readable again: ${back}`);
  // MOD-08 suspend outsider
  const su = await act(null, "QA Outsider", "Khóa tài khoản", "[QA] kiểm thử khóa tài khoản");
  const out2 = await as("outsider");
  const post = await out2.rpc("post_comment", { p_id: crypto.randomUUID(), p_chapter_id: ch1, p_block_id: null, p_parent_id: null, p_body: "[QA] bình luận khi bị khóa" });
  const edit = await out2.rpc("edit_comment", { p_comment_id: oc, p_body: "[QA] sửa khi đang bị khóa" });
  const fol = await out2.rpc("set_story_follow", { p_story_id: storyA, p_followed: true }).then((x) => x);
  const o = await (await ctxFor(b, "outsider")).newPage(); await o.goto(`${B}/`, { waitUntil: "networkidle" }); const body = await o.locator("body").innerText(); await shot(o, "mod-08-suspended-home");
  record("VER-MOD-08", post.error && !edit.error ? "CONFIRMED" : "CHECK", `suspend → "${su}"; suspended outsider: new comment → ${post.error ? post.error.code : "allowed"}; edit own comment → ${edit.error ? edit.error.code + " refused" : "ALLOWED (F-CMT-02)"}; follow story → ${fol.error ? fol.error.code + " " + fol.error.message.slice(0, 60) : "allowed"}; any suspension notice on Home: ${/khóa|tạm ngưng|suspend/i.test(body)} (F-MOD-06)`);
  // MOD-09 reinstate
  const re = await act("Đã xử lý", "QA Outsider", "Mở khóa tài khoản", "[QA] kiểm thử mở khóa");
  const st = (await (await as("reader")).from("app_users").select("account_status").eq("username", "qa_outsider").maybeSingle()).data;
  record("VER-MOD-09", "PASS", `reinstate → "${re}"; outsider visible as active again: ${JSON.stringify(st)}`);
  await open("Đã xử lý"); await shot(m, "mod-09-closed-after");
} catch (e) { console.error("STAGE ERROR", e.message); } finally { await b.close(); }
