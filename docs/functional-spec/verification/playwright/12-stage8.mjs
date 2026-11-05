// VER-MOD-01…03: reports from qa_reader on QA data only, non-moderator access, moderator queue.
import { B, browser, ctxFor, record, shot, results, save, sleep } from "./pw.mjs";
import { as } from "./lib.mjs";
const b = await browser();
const { storyA, ch1Url, ch1 } = results._data;
const toast = async (p) =>
  (await p.locator("[data-sonner-toast]").first().innerText({ timeout: 10000 }).catch(() => "(no toast)")).replace(/\n/g, " ");
async function submitReport(p, reason, details) {
  await p.getByRole("combobox", { name: "Lý do" }).click();
  await p.getByRole("option", { name: reason }).click();
  if (details) await p.getByLabel("Chi tiết (không bắt buộc)").fill(details);
  await p.getByRole("button", { name: "Gửi báo cáo" }).click();
  return toast(p);
}
try {
  // the outsider writes a comment that is reported and, later, edited while suspended (stage 13)
  const out = await as("outsider");
  let oc = results._data.outsiderComment;
  if (!oc) {
    oc = crypto.randomUUID();
    await out.rpc("post_comment", { p_id: oc, p_chapter_id: ch1, p_block_id: null, p_parent_id: null, p_body: "[QA] Bình luận của người ngoài." });
    results._data.outsiderComment = oc;
    save();
  }
  const r = await (await ctxFor(b, "reader")).newPage();
  await r.goto(`${B}/story/${storyA}/x`, { waitUntil: "networkidle" });
  await r.getByRole("button", { name: "Báo cáo truyện" }).first().click();
  const t1 = await submitReport(r, "Spam hoặc quảng cáo", "[QA] báo cáo thử nghiệm truyện");
  await r.goto(B + ch1Url, { waitUntil: "networkidle" });
  const art = r.getByRole("article", { name: "QA Outsider" }).first();
  await art.scrollIntoViewIfNeeded();
  await art.getByRole("button", { name: /Báo cáo/ }).click();
  const t2 = await submitReport(r, "Quấy rối, xúc phạm");
  await r.goto(`${B}/author/qa_outsider`, { waitUntil: "networkidle" });
  await r.getByRole("button", { name: "Báo cáo người dùng" }).first().click();
  const t3 = await submitReport(r, "Spam hoặc quảng cáo", "[QA] báo cáo thử nghiệm tài khoản");
  record("VER-MOD-01", [t1, t2, t3].every((t) => /Đã gửi báo cáo/.test(t)) ? "PASS" : "CHECK", `story → "${t1}"; comment → "${t2}"; account → "${t3}"`);
  const resp = await r.goto(`${B}/moderation`, { waitUntil: "networkidle" });
  const nf = /404|không tìm thấy|could not be found/i.test(await r.locator("body").innerText());
  record("VER-MOD-02", nf ? "PASS" : "FAIL", `reader /moderation → HTTP ${resp.status()} not-found page`);
  const m = await (await ctxFor(b, "moderator")).newPage();
  await m.goto(`${B}/moderation`, { waitUntil: "networkidle" });
  await sleep(2000);
  const q = await m.locator("main").innerText();
  await shot(m, "mod-03-queue");
  record("VER-MOD-03", /\[QA\]/.test(q) ? "PASS" : "FAIL", `moderator queue lists the QA reports: ${(q.match(/\[QA\][^\n]*/g) || []).slice(0, 4).join(" · ")}`);
} catch (e) {
  console.error("STAGE ERROR", e.message);
} finally {
  await b.close();
}
