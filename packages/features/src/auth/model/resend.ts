/**
 * Seconds before "Resend" unlocks after a password-reset email went out. Matches Supabase Auth's minimum gap between
 * two emails to the same address (60 s by default); asking earlier would only earn the rate-limit error
 * (over_email_send_rate_limit), which the screen still reports if the project is stricter.
 */
export const RESEND_COOLDOWN_SECONDS = 60;
