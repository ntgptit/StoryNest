import { B, browser, ctxFor, record, shot, results, save, sleep } from "./pw.mjs";
import { as } from "./lib.mjs";
const b = await browser();
const { storyA, ch1 } = results._data;
const toast = async (p) => (await p.locator("[data-sonner-toast]").first().innerText({ timeout: 10000 }).catch(() => "(no toast)")).replace(/\n/g, " ");
const draftOf = async (id) => (await (await as("author")).from("chapter_drafts").select("body,revision").eq("chapter_id", id).single()).data;
try {
  const a = await (await ctxFor(b, "author")).newPage();
  // AUT-06: type then immediately follow in-app link "Xem trước"
  await a.goto(`${B}/studio/story/${storyA}/chapter/${ch1}`, { waitUntil: "networkidle" });
  const before = await draftOf(ch1);
  await a.getByRole("textbox", { name: "Nội dung chương" }).click(); await a.keyboard.press("Control+End"); await a.keyboard.press("Enter");
  await a.keyboard.type("CÂU-MỚI-CHƯA-LƯU (QA)");
  let dialogSeen = false; a.once("dialog", async (d) => { dialogSeen = true; await d.dismiss(); });
  await a.getByRole("link", { name: "Xem trước" }).click(); await a.waitForURL(/\/preview$/, { timeout: 15000 }); await sleep(1500);
  const prev = await a.locator("main").innerText();
  const after = await draftOf(ch1);
  await shot(a, "aut-06-preview-after-leave");
  const savedToServer = JSON.stringify(after.body).includes("CÂU-MỚI-CHƯA-LƯU");
  const backup = await a.evaluate(() => Object.keys(localStorage).filter((k) => /draft|backup/i.test(k)).length);
  record("VER-AUT-06", !savedToServer && !/CÂU-MỚI-CHƯA-LƯU/.test(prev) ? "CONFIRMED" : "REFUTED", `typed then clicked "Xem trước": warning dialog=${dialogSeen}; server draft contains new text=${savedToServer} (revision ${before.revision}→${after.revision}); preview shows new text=${/CÂU-MỚI-CHƯA-LƯU/.test(prev)}; device backup keys=${backup} (F-EDT-02)`);
  // AUT-14 preview sticky bar after scroll
  await a.setViewportSize({ width: 390, height: 500 }); await a.mouse.wheel(0, 600); await sleep(600);
  const cov = await a.evaluate(() => { const l = [...document.querySelectorAll("a")].find((x) => /Về trình soạn|trình soạn/.test(x.textContent)); if (!l) return "no back link"; const r = l.getBoundingClientRect(); const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return l.contains(top) ? "visible" : "covered by " + (top?.tagName || "?"); });
  await shot(a, "aut-14-preview-scrolled"); await a.setViewportSize({ width: 1280, height: 900 });
  record("VER-AUT-14", /covered/.test(cov) ? "CONFIRMED" : "CHECK", `preview at 390px after scrolling: "Về trình soạn" ${cov} (F-HIST-03)`);
  // go back to editor: backup offered?
  await a.goto(`${B}/studio/story/${storyA}/chapter/${ch1}`, { waitUntil: "networkidle" }); await sleep(1500);
  const offer = await a.getByText("Có bản chưa lưu trên thiết bị này").count();
  await shot(a, "aut-06-backup-offer");
  results._data.backupOffered = offer > 0; save();
  // AUT-08 history: there are 2 versions of ch1 (author + editor). Compare and restore v1 while the device backup exists
  await a.goto(`${B}/studio/story/${storyA}/chapter/${ch1}/history`, { waitUntil: "networkidle" }); await sleep(1500);
  const hist = await a.locator("main").innerText(); await shot(a, "aut-08-history");
  await a.getByRole("button", { name: /Phiên bản 1/ }).first().click().catch(() => {});
  await a.getByRole("tab", { name: "So sánh" }).click().catch(() => {}); await sleep(1000);
  const cmp = await a.locator("main").innerText(); await shot(a, "aut-08-compare");
  await a.getByRole("button", { name: "Khôi phục vào bản nháp" }).first().click(); await a.getByRole("button", { name: "Khôi phục", exact: true }).click();
  const tr = await toast(a); await sleep(1000);
  const restored = await draftOf(ch1);
  await a.goto(`${B}/studio/story/${storyA}/chapter/${ch1}`, { waitUntil: "networkidle" }); await sleep(1500);
  const offer2 = await a.getByText("Có bản chưa lưu trên thiết bị này").count();
  record("VER-AUT-08", /Đã khôi phục/.test(tr) ? "PASS" : "CHECK", `history lists ${(hist.match(/Phiên bản \d/g) || []).length} versions; compare summary "${(cmp.match(/\d+ đoạn thêm[^\n]*/) || [""])[0]}"; restore → "${tr}" (revision ${after.revision}→${restored.revision}); unsaved device text offered before restore=${offer > 0}, after restore=${offer2 > 0} (F-HIST-01: backup removed, no undo)`);
} catch (e) { console.error("STAGE ERROR", e.message); } finally { await b.close(); }
