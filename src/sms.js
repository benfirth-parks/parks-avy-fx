// Client for netlify/functions/sms.mjs (texting a Live forecast's SMS message).
const API = "/.netlify/functions/sms";
async function call(method, body) {
  const r = await fetch(API, { method, credentials: "same-origin", headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  let d = null;
  try { d = await r.json(); } catch {}
  if (!r.ok || !d) throw new Error(d?.error || (r.status === 404 ? "Texting isn't available here (it runs on the deployed site)." : `Error ${r.status}`));
  return d;
}
export const smsStatus = () => call("GET");
export const sendSms = (forecastId) => call("POST", { forecastId });
