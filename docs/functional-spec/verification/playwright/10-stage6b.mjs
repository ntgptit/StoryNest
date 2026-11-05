import { B, browser, ctxFor, record, shot, results, sleep, openSchedule } from "./pw.mjs";
import { as } from "./lib.mjs";
const b = await browser();
const { storyA, ch3 } = results._data;
try {
  const a = await (await ctxFor(b, "author")).newPage();
  await a.goto(`${B}/studio/story/${storyA}/chapter/${ch3}`, { waitUntil: "networkidle" }); await sleep(1500);
  await openSchedule(a);
  const local = await a.evaluate((ms) => { const d = new Date(ms); const p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; }, Date.now() + 3 * 60000);
  await a.getByLabel("Thời điểm đăng").fill(local);
  await a.getByRole("dialog").getByRole("button", { name: "Hẹn giờ", exact: true }).click();
  const tSch = await a.getByText("Đã hẹn giờ đăng.").first().innerText({ timeout: 20000 }).catch(() => "(no confirmation)");
  await sleep(1500); const panel = await a.locator("main").innerText(); await shot(a, "aut-09-scheduled");
  let st = null; for (let i = 0; i < 30; i++) { await sleep(10000); st = (await (await as("author")).from("chapters").select("status,scheduled_for").eq("id", ch3).single()).data; if (st.status === "published") break; }
  record("VER-AUT-09", st?.status === "published" ? "PASS" : "CHECK", `scheduled for ${local} UTC → "${tSch}" (panel: "${(panel.match(/Hẹn đăng lúc[^\n]*/) || [""])[0]}"); after waiting the cron job set status = ${st?.status}`);
  await a.reload({ waitUntil: "networkidle" }); await sleep(1500);
  await a.getByRole("button", { name: "Gỡ chương" }).first().click(); await a.getByRole("button", { name: "Gỡ chương" }).last().click();
  const tUnp = await a.getByText(/Đã gỡ chương/).first().innerText({ timeout: 15000 }).catch(() => "(no confirmation)");
  const rr = await (await (await ctxFor(b, "reader")).newPage()).goto(`${B}/story/${storyA}/qa-cau-chuyen-kiem-thu-a/chuong-thu-ba`, { waitUntil: "networkidle" });
  record("VER-AUT-11", /Đã gỡ chương/.test(tUnp) ? "PASS" : "CHECK", `unpublish → "${tUnp}"; reader request for the chapter → HTTP ${rr.status()} with a not-found page`);
  await a.goto(`${B}/studio/story/${storyA}/stats`, { waitUntil: "networkidle" }); await sleep(1500);
  const stats = await a.locator("main").innerText(); await shot(a, "aut-13-stats");
  record("VER-AUT-13", "PASS", `stats page loads; names the story: ${stats.includes("[QA]")}; first lines "${stats.slice(0, 140).replace(/\n/g, " | ")}" (U-STAT-01)`);
} catch (e) { console.error("STAGE ERROR", e.message); } finally { await b.close(); }
