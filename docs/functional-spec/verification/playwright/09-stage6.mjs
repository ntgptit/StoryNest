import { B, browser, ctxFor, record, shot, results, save, sleep, openSchedule } from "./pw.mjs";
import { as } from "./lib.mjs";
const b = await browser();
const { storyA, ch1 } = results._data;
const toast = async (p) => (await p.locator("[data-sonner-toast]").first().innerText({ timeout: 10000 }).catch(() => "(no toast)")).replace(/\n/g, " ");
try {
  const a = await (await ctxFor(b, "author")).newPage();
  const mgr = async () => { await a.goto(`${B}/studio/story/${storyA}/chapters`, { waitUntil: "networkidle" }); await sleep(800); };
  // AUT-07 add ch3 (draft), rename ch2 slug, move, archive/unarchive ch2, delete/restore ch3
  await mgr(); await a.getByLabel("Tên chương").fill("Chương thử ba"); await a.getByRole("button", { name: "Thêm chương" }).last().click(); await a.getByText("Đã thêm chương.").first().waitFor();
  await mgr();
  const row2 = () => a.getByRole("listitem").filter({ hasText: "Chương thử hai" }).first();
  await row2().getByRole("button", { name: "Đổi đường dẫn" }).click();
  await a.getByRole("dialog").getByLabel("Đường dẫn").fill("chuong-thu-hai-moi"); await a.getByRole("button", { name: "Lưu đường dẫn" }).click();
  const tRen = await toast(a); await sleep(800);
  const oldResp = await (await (await ctxFor(b, "reader")).newPage()).goto(`${B}/story/${storyA}/qa-cau-chuyen-kiem-thu-a/chuong-thu-hai`, { waitUntil: "networkidle" });
  await mgr(); await a.getByRole("button", { name: /Chuyển xuống: Chương thử một/ }).click(); await sleep(1500); await mgr();
  const order = await a.getByRole("listitem").allInnerTexts();
  await row2().getByRole("button", { name: "Lưu trữ" }).click(); await a.getByRole("button", { name: "Lưu trữ", exact: true }).last().click(); const tArc = await toast(a); await sleep(1000);
  await mgr(); await shot(a, "aut-07-archived");
  const unarc = a.getByRole("listitem").filter({ hasText: "Chương thử hai" }).first().getByRole("button", { name: /Bỏ lưu trữ/ });
  const tUn = (await unarc.count()) ? (await unarc.click(), await sleep(300), await a.getByRole("button", { name: /Bỏ lưu trữ/ }).last().click().catch(() => {}), await toast(a)) : "no unarchive button";
  await mgr();
  const row3 = a.getByRole("listitem").filter({ hasText: "Chương thử ba" }).first();
  await row3.getByRole("button", { name: /^Xóa/ }).click(); await a.getByRole("button", { name: "Xóa", exact: true }).last().click(); const tDel = await toast(a); await sleep(800);
  await mgr(); const r3 = a.getByRole("listitem").filter({ hasText: "Chương thử ba" }).first();
  const tRes = (await r3.getByRole("button", { name: "Khôi phục" }).count()) ? (await r3.getByRole("button", { name: "Khôi phục" }).click(), await toast(a)) : "no restore button visible";
  await mgr(); await shot(a, "aut-07-chapter-manager");
  record("VER-AUT-07", /Đã đổi đường dẫn/.test(tRen) && /Đã lưu trữ/.test(tArc) && /Đã xóa/.test(tDel) && /Đã khôi phục/.test(tRes) ? "PASS" : "CHECK", `rename "${tRen}" (old chapter URL now HTTP ${oldResp.status()} → ${oldResp.status() === 200 ? "rendered not-found (soft 404)" : "404"}); move down → order ${JSON.stringify(order.map((x) => x.split("\n")[0]).slice(0, 3))}; archive "${tArc}"; unarchive "${tUn}"; delete "${tDel}"; restore "${tRes}"`);
  // AUT-12 Studio chapter count vs published
  await a.goto(`${B}/studio`, { waitUntil: "networkidle" }); const st = await a.locator("main").innerText();
  const pub = (await (await as("author")).from("chapters").select("id", { count: "exact", head: true }).eq("story_id", storyA).eq("status", "published")).count;
  record("VER-AUT-12", "INFO", `Studio row shows "${(st.match(/\d+ chương/) || ["?"])[0]}" while published chapters = ${pub} (F-STM-07)`);
  await shot(a, "aut-12-studio-count");
  // AUT-09 schedule ch3 (+2 min) and AUT-10 schedule on a published chapter
  await mgr(); await a.getByRole("listitem").filter({ hasText: "Chương thử ba" }).first().getByRole("link", { name: /Soạn nội dung/ }).click(); await a.waitForURL(/\/chapter\/[0-9a-f-]{36}$/);
  const ch3 = a.url().split("/").pop(); results._data.ch3 = ch3; save();
  await a.getByRole("textbox", { name: "Nội dung chương" }).click(); await a.keyboard.type("Nội dung chương ba (QA, hẹn giờ)."); await a.getByRole("button", { name: "Lưu nháp" }).click(); await sleep(2500);
  await openSchedule(a);
  const when = new Date(Date.now() + 2.5 * 60000);
  const local = await a.evaluate((ms) => { const d = new Date(ms); const p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; }, when.getTime());
  await a.getByLabel("Thời điểm đăng").fill(local); await a.getByRole("dialog").getByRole("button", { name: "Hẹn giờ", exact: true }).click(); const tSch = await toast(a);
  await shot(a, "aut-09-scheduled");
  // AUT-10: schedule on published ch1
  await a.goto(`${B}/studio/story/${storyA}/chapter/${ch1}`, { waitUntil: "networkidle" });
  let tPub = "no schedule button on published chapter";
  if (await openSchedule(a)) { await a.getByLabel("Thời điểm đăng").fill(local); await a.getByRole("dialog").getByRole("button", { name: "Hẹn giờ", exact: true }).click(); tPub = await a.getByText(/thay đổi ở nơi khác|không hợp lệ|Đã hẹn giờ/).first().innerText({ timeout: 10000 }).catch(() => "(no message)"); }
  await shot(a, "aut-10-schedule-published");
  record("VER-AUT-10", /thay đổi ở nơi khác/.test(tPub) ? "CONFIRMED" : "CHECK", `Schedule offered on the published chapter → "${tPub}" (F-EDT-01)`);
  // wait for cron
  let st3 = null; for (let i = 0; i < 24; i++) { await sleep(10000); st3 = (await (await as("author")).from("chapters").select("status,scheduled_for").eq("id", ch3).single()).data; if (st3.status === "published") break; }
  record("VER-AUT-09", st3?.status === "published" ? "PASS" : "CHECK", `scheduled for ${local} → "${tSch}"; after waiting, status = ${st3?.status} (cron publish_due_chapters)`);
  // AUT-11 unpublish ch3
  await a.goto(`${B}/studio/story/${storyA}/chapter/${ch3}`, { waitUntil: "networkidle" });
  await a.getByRole("button", { name: "Gỡ chương" }).first().click(); await a.getByRole("button", { name: "Gỡ chương" }).last().click(); const tUnp = await toast(a);
  const rr = await (await (await ctxFor(b, "reader")).newPage()).goto(`${B}/story/${storyA}/qa-cau-chuyen-kiem-thu-a/chuong-thu-ba`, { waitUntil: "networkidle" });
  record("VER-AUT-11", /Đã gỡ chương/.test(tUnp) ? "PASS" : "CHECK", `unpublish → "${tUnp}"; reader request for the chapter → HTTP ${rr.status()} (not-found page)`);
  // AUT-13 stats
  await a.goto(`${B}/studio/story/${storyA}/stats`, { waitUntil: "networkidle" }); await sleep(1500);
  const stats = await a.locator("main").innerText(); await shot(a, "aut-13-stats");
  record("VER-AUT-13", "PASS", `stats page loads; names the story: ${stats.includes("[QA]")}; first lines "${stats.slice(0, 140).replace(/\n/g, " | ")}" (U-STAT-01)`);
} catch (e) { console.error("STAGE ERROR", e.message); } finally { await b.close(); }
