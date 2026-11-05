import { B, browser, ctxFor, record, shot, results } from "./pw.mjs";
import { as } from "./lib.mjs";
const b = await browser();
const { storyA, ch1 } = results._data;
async function invite(p, username, roleLabel) {
  await p.getByLabel("Tên người dùng").fill(username);
  await p.getByRole("combobox", { name: "Vai trò" }).click();
  await p.getByRole("option", { name: roleLabel }).click();
  await p.getByRole("button", { name: "Gửi lời mời" }).click();
  await p.getByText("Đã gửi lời mời.").first().waitFor({ timeout: 15000 });
}
try {
  const a = await (await ctxFor(b, "author")).newPage();
  await a.goto(`${B}/studio/story/${storyA}/team`, { waitUntil: "networkidle" });
  await invite(a, "qa_coauthor", "Đồng tác giả");
  await invite(a, "qa_editor", "Biên tập viên");
  const pend = await a.locator("main").innerText();
  await shot(a, "team-01-invites");
  record("VER-TEAM-01", /qa_coauthor/.test(pend) && /qa_editor/.test(pend) ? "PASS" : "FAIL", "owner invited qa_coauthor (co-author) and qa_editor (editor); both listed as pending");
  for (const role of ["coauthor", "editor"]) {
    const p = await (await ctxFor(b, role)).newPage();
    await p.goto(`${B}/studio`, { waitUntil: "networkidle" });
    await shot(p, `team-02-inbox-${role}`);
    await p.getByRole("button", { name: "Chấp nhận" }).first().click();
    await p.getByText(/Đã chấp nhận lời mời/).waitFor({ timeout: 15000 });
    await p.reload({ waitUntil: "networkidle" });
    const ok = (await p.locator("main").innerText()).includes("[QA] Câu chuyện kiểm thử A");
    record(`VER-TEAM-02-${role}`, ok ? "PASS" : "FAIL", `${role} accepted the invitation from the Studio inbox; story listed in their Studio: ${ok}`);
  }
  // TEAM-03 editor read-only story form + chapter manager buttons
  const e = await (await ctxFor(b, "editor")).newPage();
  await e.goto(`${B}/studio/story/${storyA}`, { waitUntil: "networkidle" });
  const ef = await e.locator("main").innerText(); await shot(e, "team-03-editor-story-form");
  await e.goto(`${B}/studio/story/${storyA}/chapters`, { waitUntil: "networkidle" });
  const delBtns = await e.getByRole("button", { name: /^Xóa/ }).count(); await shot(e, "team-03-editor-chapters");
  record("VER-TEAM-03", delBtns === 0 ? "PASS" : "FAIL", `editor: story form text starts "${ef.slice(0, 80).replace(/\n/g, " | ")}…"; delete buttons in chapter manager: ${delBtns}`);
  // TEAM-04 editor edits draft & publishes
  await e.goto(`${B}/studio/story/${storyA}/chapter/${ch1}`, { waitUntil: "networkidle" });
  await e.getByRole("textbox", { name: "Nội dung chương" }).click();
  await e.keyboard.press("Control+End"); await e.keyboard.press("Enter");
  await e.keyboard.type("Đoạn thứ ba do biên tập viên thêm (QA).");
  await e.getByRole("button", { name: "Lưu nháp" }).click(); await e.waitForTimeout(2500);
  const canPublish = await e.getByRole("button", { name: /Đăng bản mới|Đăng chương/ }).count();
  let pubRes = "no publish button";
  if (canPublish) { await e.getByRole("button", { name: /Đăng bản mới|Đăng chương/ }).first().click(); pubRes = await e.getByText(/Đã đăng bản mới\.|Đã đăng chương\.|không có quyền/i).first().innerText({ timeout: 15000 }).catch(() => "no toast"); }
  await shot(e, "team-04-editor-publish");
  record("VER-TEAM-04", /Đã đăng/.test(pubRes) ? "CONFIRMED" : "CHECK", `invite hint for editor says "không đăng hay xóa", but the editor published a new version: "${pubRes}" (F-TEAM-01)`);
  // API checks TEAM-05/06/08
  const ed = await as("editor"); const co = await as("coauthor"); const ow = await as("author");
  const r5 = await ed.from("chapters").update({ deleted_at: new Date().toISOString() }).eq("id", ch1).select("id,deleted_at");
  record("VER-TEAM-05", r5.data?.length ? "CONFIRMED" : "REFUTED", `editor PATCH chapters.deleted_at via API → ${r5.error ? r5.error.code + " " + r5.error.message : r5.data.length + " row(s) updated"} (F-CHM-01)`);
  const rr5 = await ow.from("chapters").update({ deleted_at: null }).eq("id", ch1).select("id"); 
  const r6 = await co.from("stories").update({ deleted_at: new Date().toISOString() }).eq("id", storyA).select("id,deleted_at");
  record("VER-TEAM-06", r6.data?.length ? "CONFIRMED" : "REFUTED", `co-author PATCH stories.deleted_at via API → ${r6.error ? r6.error.code + " " + r6.error.message : r6.data.length + " row(s) updated"} (F-STM-01)`);
  const rr6 = await ow.from("stories").update({ deleted_at: null }).eq("id", storyA).select("id");
  console.log("restore by owner:", rr5.data?.length, rr6.data?.length, rr5.error?.message, rr6.error?.message);
  const outsiderId = (await as("outsider")).userId;
  const r8 = await co.from("story_collaborators").insert({ story_id: storyA, user_id: outsiderId, collaborator_role: "editor" });
  record("VER-TEAM-08", r8.error ? "PASS" : "FAIL", `co-author inserting a collaborator via API → ${r8.error ? r8.error.code + " " + r8.error.message : "inserted (unexpected)"}`);
  // TEAM-07 co-author team page
  const c = await (await ctxFor(b, "coauthor")).newPage();
  await c.goto(`${B}/studio/story/${storyA}/team`, { waitUntil: "networkidle" });
  const ct = await c.locator("main").innerText(); await shot(c, "team-07-coauthor-team");
  record("VER-TEAM-07", /Chỉ chủ sở hữu quản lý được/.test(ct) && !/Rời|Leave/.test(ct) ? "CONFIRMED" : "CHECK", `co-author sees "${ct.slice(0, 120).replace(/\n/g, " | ")}…": no member list, no Leave action (F-TEAM-02, U-TEAM-02)`);
} catch (e) { console.error("STAGE ERROR", e.message); } finally { await b.close(); }
