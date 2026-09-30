// Send a Live forecast's SMS message by text (Twilio). Off until configured.
// GET  → { configured, recipients }                     (signed-in users)
// POST { forecastId } → { sent, total, failed, sentAt }  (signed-in users)
// Netlify environment variables (never in the repo):
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM (+1… number or messaging service SID MG…)
//   SMS_RECIPIENTS  comma-separated numbers; append ":fr" for French, e.g. "+14035550101,+14035550102:fr"
import { openStore, currentUser, unauthorized, json } from "../lib/auth.mjs";

const env = (k) => (process.env[k] || "").trim();
const recipients = () => env("SMS_RECIPIENTS").split(/[,;\s]+/).filter(Boolean).map((r) => { const [to, lang] = r.split(":"); return { to, lang: lang === "fr" ? "fr" : "en" }; }).filter((r) => /^\+\d{8,15}$/.test(r.to));
const configured = () => !!(env("TWILIO_ACCOUNT_SID") && env("TWILIO_AUTH_TOKEN") && env("TWILIO_FROM") && recipients().length);
const plain = (html) => String(html || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

export default async (req) => {
  try {
    const store = openStore();
    const me = await currentUser(req, store);
    if (!me) return unauthorized();
    if (req.method === "GET") return json({ configured: configured(), recipients: recipients().length });
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
    if (!configured()) return json({ error: "Texting isn't configured on this site." }, 501);
    let body;
    try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
    const doc = await store.get("state", { type: "json" });
    const f = doc?.state?.forecasts?.find((x) => x.id === body?.forecastId);
    if (!f) return json({ error: "Forecast not found in the shared document (wait a moment for it to save)." }, 404);
    if (f.status !== "live") return json({ error: "Only a Live forecast can be texted." }, 400);
    const logKey = `sms/log/${f.id}`;
    const last = await store.get(logKey, { type: "json" });
    if (last && Date.now() - Date.parse(last.sentAt) < 2 * 60 * 1000) return json({ error: "This forecast was texted less than two minutes ago." }, 429);

    const sid = env("TWILIO_ACCOUNT_SID"), from = env("TWILIO_FROM");
    const auth = "Basic " + Buffer.from(`${sid}:${env("TWILIO_AUTH_TOKEN")}`).toString("base64");
    const list = recipients();
    const failed = [];
    let sent = 0;
    for (const r of list) {
      const text = plain(r.lang === "fr" ? f.comms?.sms?.fr || f.comms?.sms?.en : f.comms?.sms?.en);
      if (!text) { failed.push(`${r.to} (no ${r.lang} text)`); continue; }
      const form = new URLSearchParams({ To: r.to, Body: text.slice(0, 320) });
      form.set(from.startsWith("MG") ? "MessagingServiceSid" : "From", from);
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, { method: "POST", headers: { authorization: auth, "content-type": "application/x-www-form-urlencoded" }, body: form });
      if (res.ok) sent++; else failed.push(`${r.to.slice(0, -4)}**** (${res.status})`);
    }
    const sentAt = new Date().toISOString();
    await store.setJSON(logKey, { sentAt, by: me.name, sent, total: list.length });
    return json({ sent, total: list.length, failed, sentAt });
  } catch (e) {
    return json({ error: String(e && e.message ? e.message : e) }, 500);
  }
};
