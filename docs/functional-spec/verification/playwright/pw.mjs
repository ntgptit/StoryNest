import fs from "node:fs";
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
export const B = "http://localhost:3000";
import os from "node:os";
export const OUT = (process.env.QA_OUT_DIR || `${os.tmpdir()}/storynest-qa`) + "/";
fs.mkdirSync(OUT + "shots", { recursive: true }); fs.mkdirSync(OUT + "state", { recursive: true });
const RES = OUT + "results.json";
export const results = fs.existsSync(RES) ? JSON.parse(fs.readFileSync(RES, "utf8")) : {};
export function save() { fs.writeFileSync(RES, JSON.stringify(results, null, 1)); }
export function record(id, status, note, extra = {}) { results[id] = { status, note, at: new Date().toISOString(), ...extra }; save(); console.log(`[${status}] ${id} — ${note}`); }
export async function browser() { return chromium.launch(); }
export async function ctxFor(b, role, size = { width: 1280, height: 900 }) {
  const st = `${OUT}state/${role}.json`;
  const ctx = await b.newContext({ viewport: size, locale: "vi-VN", ...(fs.existsSync(st) && role !== "guest" ? { storageState: st } : {}) });
  // The editor offers a first-run tour whose overlay blocks clicks; mark it seen for the test browser (same key the app writes).
  await ctx.addInitScript(() => { try { window.localStorage.setItem("storynest.editor.tour-done", "1"); } catch {} });
  if (role !== "guest" && !fs.existsSync(st)) {
    const p = await ctx.newPage();
    await p.goto(B + "/login?next=%2Fme", { waitUntil: "networkidle" });
    await p.getByLabel("Email").fill(`qa.${role}@qa.storynest.test`);
    await p.getByLabel("Mật khẩu", { exact: true }).fill(process.env.QA_PASSWORD);
    await p.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await p.waitForURL("**/me", { timeout: 30000 });
    await ctx.storageState({ path: st }); await p.close();
  }
  return ctx;
}
export async function shot(p, name) { await p.screenshot({ path: `${OUT}shots/${name}.png`, fullPage: false }); }
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Opens the schedule dialog. Since PR #60 "Hẹn giờ…" is an option of the publish split button ("Cách đăng khác"). Returns false when the menu has no schedule option. */
export async function openSchedule(p) {
  const more = p.getByRole("button", { name: "Cách đăng khác" });
  if (!(await more.count())) return false;
  await more.click();
  const item = p.getByText("Hẹn giờ…", { exact: true }).first();
  if (!(await item.isVisible().catch(() => false))) return false;
  await item.click();
  return true;
}
