// Machine translation for forecast text, via MyMemory (free, no key).
// POST { texts: [string], from: "en", to: "fr" } → { texts: [string] }   (signed-in users only)
// Plain text segments only; the client splits HTML into text nodes first.
// MyMemory's anonymous quota is about 5,000 words a day; set MYMEMORY_EMAIL in the
// Netlify environment to raise it to ~50,000. Results are cached in Blobs.
import { createHash } from "node:crypto";
import { openStore, currentUser, unauthorized, json } from "../lib/auth.mjs";

const MAX_TEXTS = 200, MAX_CHARS = 20000, CHUNK = 450;

export default async (req) => {
  try {
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
    const store = openStore();
    if (!(await currentUser(req, store))) return unauthorized();
    let body;
    try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
    const from = body?.from === "fr" ? "fr" : "en", to = body?.to === "en" ? "en" : "fr";
    const texts = Array.isArray(body?.texts) ? body.texts.map((t) => String(t ?? "")) : null;
    if (!texts || texts.length > MAX_TEXTS || texts.join("").length > MAX_CHARS) return json({ error: "Send up to 200 texts, 20,000 characters in total." }, 400);
    const out = await translateAll(texts, from, to, store);
    return json({ texts: out, provider: "MyMemory" });
  } catch (e) {
    return json({ error: String(e && e.message ? e.message : e) }, e.status || 502);
  }
};

async function translateAll(texts, from, to, store) {
  const out = new Array(texts.length);
  let next = 0;
  const worker = async () => {
    while (next < texts.length) {
      const i = next++;
      out[i] = await translateText(texts[i], from, to, store);
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  return out;
}

// Keep leading/trailing whitespace; translate the rest in sentence-sized chunks.
async function translateText(text, from, to, store) {
  const m = text.match(/^(\s*)([\s\S]*?)(\s*)$/);
  if (!m[2] || !/[A-Za-zÀ-ÿ]/.test(m[2])) return text;
  const parts = [];
  for (const chunk of chunks(m[2])) parts.push(await cached(chunk, from, to, store));
  return m[1] + parts.join(" ") + m[3];
}
function chunks(s) {
  if (s.length <= CHUNK) return [s];
  const sentences = s.match(/[^.!?]+[.!?]*\s*/g) || [s];
  const out = []; let cur = "";
  for (const sen of sentences) {
    if ((cur + sen).length > CHUNK && cur) { out.push(cur.trim()); cur = ""; }
    if (sen.length > CHUNK) { for (let i = 0; i < sen.length; i += CHUNK) out.push(sen.slice(i, i + CHUNK).trim()); continue; }
    cur += sen;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

// One lookup per distinct chunk, even when the same sentence appears in parallel segments.
const pending = new Map();
function cached(q, from, to, store) {
  const k = `${from}|${to}|${q}`;
  if (!pending.has(k)) pending.set(k, lookup(q, from, to, store).finally(() => setTimeout(() => pending.delete(k), 0)));
  return pending.get(k);
}
async function lookup(q, from, to, store) {
  const key = `tm/${from}-${to}/${createHash("sha256").update(q).digest("hex")}`;
  const hit = await store.get(key, { type: "text" }).catch(() => null);
  if (hit) return hit;
  const t = await mymemory(q, from, to);
  await store.set(key, t).catch(() => {});
  return t;
}

async function mymemory(q, from, to) {
  const u = new URL("https://api.mymemory.translated.net/get");
  u.searchParams.set("q", q);
  u.searchParams.set("langpair", `${from}|${to === "fr" ? "fr-CA" : "en-CA"}`);
  if (process.env.MYMEMORY_EMAIL) u.searchParams.set("de", process.env.MYMEMORY_EMAIL);
  const r = await fetch(u, { headers: { accept: "application/json" } });
  const d = await r.json().catch(() => null);
  const t = d?.responseData?.translatedText;
  const status = Number(d?.responseStatus);
  if (!r.ok || status !== 200 || !t || /MYMEMORY WARNING|QUERY LENGTH LIMIT/i.test(t)) {
    const quota = status === 429 || /USED ALL AVAILABLE FREE TRANSLATIONS/i.test(t || d?.responseDetails || "");
    throw Object.assign(new Error(quota ? "The free translation quota for today is used up. Translate by hand or try tomorrow." : `Translation service error: ${d?.responseDetails || r.status}`), { status: quota ? 429 : 502 });
  }
  return decode(t);
}
const decode = (s) => s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
