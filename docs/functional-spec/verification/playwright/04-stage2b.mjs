import { B, browser, ctxFor, record, shot, results } from "./pw.mjs";
const b = await browser();
try {
  const { storyA } = results._data;
  const a = await (await ctxFor(b, "author")).newPage();
  await a.goto(`${B}/studio`, { waitUntil: "networkidle" });
  await a.getByRole("button", { name: /Hiện truyện đã xóa/ }).click();
  await a.getByRole("button", { name: "Khôi phục" }).first().click();
  const msg = await a.locator("[data-sonner-toast]").first().innerText({ timeout: 15000 }).catch(() => "(no toast)");
  await shot(a, "stm-restore-owner-fails");
  record("VER-AUT-15", /quyền|permission/i.test(msg) ? "NEW DEFECT" : "CHECK", `owner restores the soft-deleted QA story from Studio "Truyện đã xóa" → toast "${msg.replace(/\n/g, " ")}"; DB error: permission denied for function last_moderation_action (trigger stories_guard_removal)`);
  // TEAM-01 re-check text
  await a.goto(`${B}/studio/story/${storyA}/team`, { waitUntil: "networkidle" });
  const t = await a.locator("main").innerText();
  record("VER-TEAM-01", /QA Co-author|qa_coauthor/.test(t) && /QA Editor|qa_editor/.test(t) ? "PASS" : "CHECK", `invitations sent and accepted; team page now lists: ${(t.match(/Đang cộng tác[\s\S]{0,200}/)||[""])[0].replace(/\n/g," | ")}`);
} catch (e) { console.error("STAGE ERROR", e.message); } finally { await b.close(); }
