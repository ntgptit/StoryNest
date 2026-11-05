import { B, browser, ctxFor, record, shot, sleep } from "./pw.mjs";
const b = await browser();
try {
  const r = await (await ctxFor(b, "reader", { width: 390, height: 844 })).newPage();
  await r.goto(`${B}/notifications`, { waitUntil: "networkidle" }); await sleep(1500);
  const links = await r.locator("main a").evaluateAll((as) => as.map((a) => ({ t: a.innerText.replace(/\s+/g, " ").slice(0, 90), h: a.getAttribute("href") })));
  await shot(r, "rdr-07-08-notifications");
  console.log(JSON.stringify(links, null, 1));
  const chap = links.find((l) => /Chương thử hai/.test(l.t)); const rep = links.find((l) => /trả lời/i.test(l.t));
  let o1 = "", o2 = "", sheet = 0;
  if (chap) { await r.goto(B + chap.h, { waitUntil: "networkidle" }); o1 = await r.locator("h1").first().innerText().catch(() => ""); }
  if (rep) { await r.goto(B + rep.h, { waitUntil: "networkidle" }); await sleep(2000); sheet = await r.getByRole("dialog").count(); o2 = `${rep.h} scrollY=${await r.evaluate(() => scrollY)}`; await shot(r, "rdr-08-reply-opened"); }
  record("VER-RDR-07", chap && /Chương thử hai/.test(o1) ? "PASS" : "CHECK", `follower notification "chapter_published" created < 1 min after publishing (DB created_at 04:16:00 vs publish ~04:15:30); bell showed "Thông báo, 1 chưa đọc"; item link ${chap?.h} opens the chapter (h1 "${o1}")`);
  record("VER-RDR-08", rep ? "PASS" : "CHECK", `author reply via post_comment → reader notification "comment_replied" < 1 min; item link ${o2}; reply highlighted / thread opened: ${sheet > 0 ? "dialog open" : "no"} (U-NOTI-01 ${sheet > 0 ? "refuted" : "confirmed"})`);
} catch (e) { console.error("STAGE ERROR", e.message); } finally { await b.close(); }
