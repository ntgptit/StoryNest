import { B, browser, ctxFor, record, shot, results, save } from "./pw.mjs";
const b = await browser();
try {
  const { storyA, ch1 } = results._data;
  const ctx = await ctxFor(b, "author"); const p = await ctx.newPage();
  await p.goto(`${B}/studio/story/${storyA}/chapter/${ch1}`, { waitUntil: "networkidle" });
  const persisted = await p.getByRole("textbox", { name: "Nội dung chương" }).innerText();
  record("VER-AUT-03", persisted.includes("Đoạn thứ hai") ? "PASS" : "FAIL", `typed text present after reload (autosaved). Note: the idle "saved" state shows only the word count, no "Đã lưu" label`);
  await shot(p, "aut-03-editor-after-reload");
  await p.getByLabel("Tên chương").fill("Chương thử một");
  await p.getByRole("button", { name: "Lưu nháp" }).click();
  await p.waitForTimeout(2500);
  await p.getByRole("button", { name: "Đăng chương", exact: true }).click();
  await p.getByText("Đã đăng chương.").waitFor({ timeout: 20000 });
  const panel = await p.locator("main").innerText();
  await shot(p, "aut-04-published");
  await p.goto(`${B}/studio`, { waitUntil: "networkidle" });
  const studio = await p.locator("main").innerText();
  await shot(p, "aut-04-studio-after-publish");
  const rctx = await ctxFor(b, "reader"); const r = await rctx.newPage();
  const resp = await r.goto(`${B}/story/${storyA}/x`, { waitUntil: "networkidle" });
  const txt = await r.locator("body").innerText();
  const notFound = /404|không tìm thấy|could not be found/i.test(txt);
  await shot(r, "aut-04-reader-view-private");
  const hint = (panel.match(/Đã đăng[^\n]*/) || [""])[0];
  record("VER-AUT-04", notFound ? "CONFIRMED" : "CHECK", `published chapter 1; publish panel says "${hint}"; reader sees not-found=${notFound} (HTTP ${resp.status()}) because the story is still private; Studio row: ${(studio.match(/\[QA\][^\n]*\n[^\n]*\n[^\n]*/)||[""])[0].replace(/\n/g," | ")}`);
  // AUT-05 set unlisted
  await p.goto(`${B}/studio/story/${storyA}`, { waitUntil: "networkidle" });
  await p.getByRole("combobox", { name: "Hiển thị" }).click();
  await p.getByRole("option", { name: "Chỉ người có liên kết" }).click();
  await p.getByRole("button", { name: "Lưu thay đổi" }).click();
  await p.getByText("Đã lưu thay đổi.").waitFor({ timeout: 15000 });
  const resp2 = await r.goto(`${B}/story/${storyA}/x`, { waitUntil: "networkidle" });
  const t2 = await r.locator("h1").first().innerText().catch(() => "");
  results._data.storyAUrl = r.url().replace(B, ""); save();
  record("VER-AUT-05", t2.includes("[QA]") ? "PASS" : "FAIL", `after Unlisted the reader opens the story by link (HTTP ${resp2.status()}, canonical ${r.url().replace(B, "")})`);
  await shot(r, "aut-05-reader-unlisted");
  await ctx.close(); await rctx.close();
} catch (e) { console.error("STAGE ERROR", e.message); } finally { await b.close(); }
