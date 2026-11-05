import { createRequire } from "node:module";
const require = createRequire(new URL("../../../../apps/web/package.json", import.meta.url));
const { createClient } = require("@supabase/supabase-js");
export const URL = process.env.QA_SUPABASE_URL;
export const KEY = process.env.QA_SUPABASE_KEY;
export const PW = process.env.QA_PASSWORD;
export const email = (role) => `qa.${role}@qa.storynest.test`;
export async function as(role) {
  const c = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await c.auth.signInWithPassword({ email: email(role), password: PW });
  if (error) throw new Error(`${role}: ${error.message}`);
  c.userId = data.user.id; c.claims = data.session.access_token.split(".")[1];
  return c;
}
export const anon = () => createClient(URL, KEY, { auth: { persistSession: false } });
