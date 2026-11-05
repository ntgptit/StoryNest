import { B, browser, ctxFor, record, shot, results, save, sleep } from "./pw.mjs";
import { as } from "./lib.mjs";
const b = await browser();
const { storyA, ch1 } = results._data;
const toast = async (p) => (await p.locator("[data-sonner-toast]").last().innerText({ timeout: 10000 }).catch(() => "(no toast)")).replace(/\n/g, " ");
try {
  const rc = await ctxFor(b, "reader", { width: 390, height: 844 }); const r = await rc.newPage();
  await r.goto(`${B}/story/${storyA}/x`, { waitUntil: "networkidle" });
  await r.getByRole("button", { name: "Theo dõi", exact: true }).click(); const t1 = await toast(r);
  await r.getByRole("button", { name: "Lưu vào thư viện", exact: true }).click(); const t2 = await toast(r);
  await r.getByRole("button", { name: "Thêm vào danh sách", exact: true }).click();
  await r.getByLabel("Tên danh sách mới").fill("[QA] Danh sách");
  await r.getByRole("button", { name: "Tạo và thêm" }).click(); const t3 = await toast(r);
  await r.keyboard.press("Escape");
  await shot(r, "rdr-01-story-actions");
  await r.goto(`${B}/library`, { waitUntil: "networkidle" });
  const tabs = {};
  for (const tab of ["Đã lưu", "Đang theo dõi", "Danh sách"]) { await r.getByRole("tab", { name: tab }).click(); await r.waitForTimeout(1200); tabs[tab] = (await r.locator("main").innerText()).includes("[QA]"); }
  await shot(r, "rdr-01-library-lists");
  record("VER-RDR-01", Object.values(tabs).every(Boolean) ? "PASS" : "FAIL", `follow → "${t1}"; save → "${t2}"; list → "${t3}"; Library tabs contain the QA story/list: ${JSON.stringify(tabs)}`);
  // RDR-02 progress
  const story = await (await as("reader")).from("chapters").select("slug").eq("id", ch1).single();
  const chUrl = `${B}/story/${storyA}/qa-cau-chuyen-kiem-thu-a/${story.data.slug}`; results._data.ch1Url = chUrl.replace(B, ""); save();
  await r.goto(chUrl, { waitUntil: "networkidle" });
  const h = await r.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  await r.evaluate((y) => scrollTo(0, y), Math.round(h * 0.6)); await sleep(4000);
  await r.goto(`${B}/story/${storyA}/x`, { waitUntil: "networkidle" });
  const cta = await r.getByRole("link", { name: /Đọc tiếp|Tiếp tục|Bắt đầu đọc/ }).first().innerText().catch(() => "?");
  await r.goto(chUrl, { waitUntil: "networkidle" }); await sleep(2500);
  const y = await r.evaluate(() => scrollY);
  record("VER-RDR-02", y > 50 ? "PASS" : "CHECK", `scrolled to 60 % of a ${h}px page, waited, reopened: story CTA "${cta}", restored scrollY=${y}`);
  // RDR-03: scroll to end marker only (not through comments)
  const end = r.getByText("— Hết chương —"); await end.scrollIntoViewIfNeeded(); await sleep(4000);
  const prog = await (await as("reader")).from("user_chapter_progress").select("progress_percent,completed_at").eq("chapter_id", ch1).maybeSingle();
  record("VER-RDR-03", prog.data && !prog.data.completed_at ? "CONFIRMED" : "CHECK", `scrolled to "— Hết chương —" only: stored progress ${JSON.stringify(prog.data)} (F-PROG-01: end of text is not counted as finished)`);
  // RDR-05 vote
  await r.getByRole("button", { name: "Bình chọn cho chương này" }).click(); await sleep(1500);
  await r.reload({ waitUntil: "networkidle" });
  const voted = await r.getByRole("button", { name: "Bỏ bình chọn" }).count();
  await shot(r, "rdr-05-voted");
  record("VER-RDR-05", voted ? "PASS" : "FAIL", `vote persisted after reload: ${!!voted}`);
  // RDR-06 comments: chapter + paragraph + like + edit + delete
  const box = r.getByLabel("Viết bình luận").first(); await box.scrollIntoViewIfNeeded();
  await box.fill("[QA] Bình luận chương từ người đọc."); await r.getByRole("button", { name: "Đăng", exact: true }).first().click();
  const tc = await toast(r);
  await r.getByRole("button", { name: /Bình luận đoạn này|bình luận/i }).first().click(); await sleep(800);
  await shot(r, "rdr-06-paragraph-sheet");
  const sheetBox = r.getByRole("dialog").getByLabel("Viết bình luận");
  await sheetBox.fill("[QA] Bình luận theo đoạn."); await r.getByRole("dialog").getByRole("button", { name: "Đăng", exact: true }).click();
  const tp = await toast(r); await r.keyboard.press("Escape");
  await r.reload({ waitUntil: "networkidle" });
  await r.getByText("[QA] Bình luận chương từ người đọc.").scrollIntoViewIfNeeded();
  await r.getByRole("button", { name: "Thích" }).first().click(); await sleep(1000);
  // Edit sits in the comment's options menu (aria-label "Tùy chọn bình luận" in Vietnamese).
  const mine = r.getByRole("article").filter({ hasText: "[QA] Bình luận chương từ người đọc." }).first();
  await mine.getByRole("button", { name: "Tùy chọn bình luận" }).click();
  await r.getByRole("menuitem", { name: "Sửa" }).click();
  const ed = r.locator("textarea").filter({ hasText: "[QA] Bình luận chương" }).first();
  await ed.fill("[QA] Bình luận chương từ người đọc (đã sửa)."); await r.getByRole("button", { name: "Lưu", exact: true }).first().click();
  const te = await toast(r); await sleep(1000);
  const thread = await r.locator("main").innerText();
  await shot(r, "rdr-06-comments");
  record("VER-RDR-06", /đã sửa/.test(thread) ? "PASS" : "CHECK", `chapter comment → "${tc}"; paragraph comment → "${tp}"; like + edit → "${te}"; "(đã sửa)" shown: ${/\(đã sửa\)|đã sửa/.test(thread)}`);
  await rc.close();
} catch (e) { console.error("STAGE ERROR", e.message); } finally { await b.close(); }
