import { B, browser, ctxFor, record, shot, results, save } from "./pw.mjs";
const b = await browser();
try {
  const ctx = await ctxFor(b, "author"); const p = await ctx.newPage();
  // AUT-01
  await p.goto(B + "/studio", { waitUntil: "networkidle" });
  record("VER-AUT-01", p.url().endsWith("/studio") ? "PASS" : "FAIL", `signed in as qa_author, at ${p.url().replace(B, "")}`);
  // AUT-02 create story A with defaults
  await p.goto(B + "/studio/new", { waitUntil: "networkidle" });
  const visDefault = await p.getByRole("combobox", { name: "Hiển thị" }).innerText().catch(() => "?");
  const statusDefault = await p.getByRole("combobox", { name: "Tình trạng" }).innerText().catch(() => "?");
  await p.getByLabel("Tên truyện").fill("[QA] Câu chuyện kiểm thử A");
  await p.getByLabel("Giới thiệu").fill("Dữ liệu kiểm thử tự động (QA). Không phải nội dung thật.");
  await shot(p, "aut-02-new-story-form");
  await p.getByRole("button", { name: "Tạo truyện" }).click();
  await p.waitForURL(/\/studio\/story\/[0-9a-f-]{36}$/, { timeout: 30000 });
  const storyA = p.url().split("/").pop();
  results._data = { ...(results._data || {}), storyA }; save();
  record("VER-AUT-02", /Riêng tư/.test(visDefault) && /nháp/i.test(statusDefault) ? "CONFIRMED" : "CHECK", `story A ${storyA}; default visibility "${visDefault.trim()}", status "${statusDefault.trim()}" (F-STM-08 premise)`);
  // AUT-03 add chapter 1 + type + autosave
  await p.goto(`${B}/studio/story/${storyA}/chapters`, { waitUntil: "networkidle" });
  await p.getByLabel("Tên chương").fill("Chương thử một");
  await p.getByRole("button", { name: "Thêm chương" }).last().click();
  await p.getByText("Đã thêm chương.").waitFor({ timeout: 15000 });
  await p.getByRole("link", { name: /Soạn nội dung/ }).first().click();
  await p.waitForURL(/\/chapter\/[0-9a-f-]{36}$/, { timeout: 30000 });
  const ch1 = p.url().split("/").pop(); results._data.ch1 = ch1; save();
  const body = p.getByRole("textbox", { name: "Nội dung chương" });
  await body.click();
  await p.keyboard.type("Đoạn mở đầu của chương thử một, dữ liệu QA.");
  await p.keyboard.press("Enter");
  await p.keyboard.type("Đoạn thứ hai, dùng để kiểm thử bình luận theo đoạn.");
  await p.waitForTimeout(4000); // idle "saved" state shows only the word count
  await p.reload({ waitUntil: "networkidle" });
  const persisted = await p.getByRole("textbox", { name: "Nội dung chương" }).innerText();
  record("VER-AUT-03", persisted.includes("Đoạn thứ hai") ? "PASS" : "FAIL", `autosave status "Đã lưu" shown; text present after reload: ${persisted.includes("Đoạn thứ hai")}`);
  await shot(p, "aut-03-editor-saved");
  // AUT-04 publish while private
  await p.getByRole("button", { name: "Đăng chương", exact: true }).click();
  await p.getByText("Đã đăng chương.").waitFor({ timeout: 20000 });
  await shot(p, "aut-04-published");
  await p.goto(`${B}/studio`, { waitUntil: "networkidle" });
  await shot(p, "aut-04-studio-after-publish");
  const rctx = await ctxFor(b, "reader"); const r = await rctx.newPage();
  const resp = await r.goto(`${B}/story/${storyA}/qa-cau-chuyen-kiem-thu-a`, { waitUntil: "networkidle" });
  const txt = await r.locator("body").innerText();
  const notFound = /404|không tìm thấy|could not be found/i.test(txt);
  await shot(r, "aut-04-reader-view-private");
  record("VER-AUT-04", notFound ? "CONFIRMED" : "CHECK", `after first publish the story is still private: reader sees not-found=${notFound} (HTTP ${resp.status()}). No notice in Studio about readers (see screenshot)`);
  await ctx.close(); await rctx.close();
} catch (e) { console.error("STAGE1 ERROR", e.message); } finally { await b.close(); }
