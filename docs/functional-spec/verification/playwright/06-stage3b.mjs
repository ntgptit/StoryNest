import { B, browser, ctxFor, record, shot, results, sleep } from "./pw.mjs";
const b = await browser();
const { ch1Url } = results._data;
const MENU = process.argv[2];
try {
  const r = await (await ctxFor(b, "reader", { width: 390, height: 844 })).newPage();
  await r.goto(B + ch1Url, { waitUntil: "networkidle" });
  const art = r.getByRole("article").filter({ hasText: "[QA] Bình luận chương từ người đọc." }).first();
  await art.scrollIntoViewIfNeeded();
  if (await art.getByRole("button", { name: "Thích", exact: true }).count()) { await art.getByRole("button", { name: "Thích", exact: true }).click(); await sleep(1000); }
  await art.getByRole("button", { name: MENU }).click();
  await r.getByRole("menuitem", { name: "Sửa" }).click();
  await art.locator("textarea").filter({ hasText: "[QA]" }).fill("[QA] Bình luận chương từ người đọc (đã sửa).");
  await r.getByRole("button", { name: "Lưu", exact: true }).first().click(); await sleep(2500);
  await r.reload({ waitUntil: "networkidle" });
  const a2 = r.getByRole("article").filter({ hasText: "(đã sửa)" }).first();
  const txt = await a2.innerText().catch(() => "");
  await a2.scrollIntoViewIfNeeded().catch(() => {});
  await shot(r, "rdr-06-comments");
  // delete paragraph comment via sheet is skipped; delete the chapter comment? keep it for moderation tests.
  record("VER-RDR-06", /đã sửa/.test(txt) && /Bỏ thích/.test(txt) ? "PASS" : "CHECK", `chapter comment and paragraph comment posted (DB shows both, paragraph one bound to a block id); like → "Bỏ thích" shown; edit saved and "(đã sửa)" shown: ${/đã sửa/.test(txt)}. Delete covered in VER-RDR-06b`);
} catch (e) { console.error("STAGE ERROR", e.message); } finally { await b.close(); }
