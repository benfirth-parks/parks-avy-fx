// Machine-translate a forecast's English text into French (netlify/functions/translate.mjs).
// Only fields flagged Translation Required (or with empty French) are sent. HTML is split
// into text nodes so formatting and links survive. Results are marked tr: "machine" so the
// editor shows "Machine translated — review" until someone saves the French by hand.
import { getState, updateForecast } from "./store.js";

const API = "/.netlify/functions/translate";
const BATCH_TEXTS = 150, BATCH_CHARS = 15000;

// Where translatable text lives in a forecast: [getter, setter, isHtml].
function fields(f) {
  const out = [];
  f.cards.forEach((c, i) => {
    for (const k of ["weather", "snowpack", "avalanche"]) out.push({ get: (x) => x.cards[i][k], set: (x, v) => { x.cards[i][k] = v; }, html: true });
    c.problems.forEach((p) => out.push({ get: (x) => x.cards[i].problems.find((q) => q.id === p.id)?.desc, set: (x, v) => { const q = x.cards[i].problems.find((q2) => q2.id === p.id); if (q) q.desc = v; }, html: true }));
  });
  out.push({ get: (x) => x.comms.headline, set: (x, v) => { x.comms.headline = v; }, html: true });
  out.push({ get: (x) => x.comms.sms, set: (x, v) => { x.comms.sms = v; }, html: false });
  return out;
}
const needs = (fld) => fld && fld.en && fld.en.replace(/<[^>]*>/g, "").trim() && (fld.tr === true || !fld.fr);

export function translatableCount(f) {
  return fields(f).filter((d) => needs(d.get(f))).length;
}

export async function translateForecast(id) {
  const f = getState().forecasts.find((x) => x.id === id);
  const jobs = fields(f).map((d) => ({ ...d, src: d.get(f) })).filter((j) => needs(j.src));
  if (!jobs.length) return 0;

  // Split each field into segments (text nodes for HTML).
  const segments = [];
  for (const j of jobs) {
    if (j.html) {
      j.doc = new DOMParser().parseFromString(`<body>${j.src.en}</body>`, "text/html");
      j.nodes = textNodes(j.doc.body);
      j.first = segments.length;
      segments.push(...j.nodes.map((n) => n.nodeValue));
    } else { j.first = segments.length; segments.push(j.src.en); }
  }
  const translated = await translateTexts(segments);

  let n = 0;
  updateForecast(id, (x) => {
    for (const j of jobs) {
      const cur = j.get(x);
      if (!cur || cur.en !== j.src.en) continue; // English changed while translating; leave it flagged
      let fr;
      if (j.html) { j.nodes.forEach((node, k) => { node.nodeValue = translated[j.first + k]; }); fr = j.doc.body.innerHTML; }
      else fr = translated[j.first];
      j.set(x, { ...cur, fr, tr: "machine" });
      n++;
    }
    return x;
  });
  return n;
}

function textNodes(root) {
  const out = [];
  const w = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = w.nextNode(); node; node = w.nextNode()) if (/[A-Za-zÀ-ÿ]/.test(node.nodeValue)) out.push(node);
  return out;
}

async function translateTexts(texts) {
  const out = [];
  let batch = [], chars = 0;
  const flush = async () => {
    if (!batch.length) return;
    const r = await fetch(API, { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ texts: batch, from: "en", to: "fr" }) });
    let d = null;
    try { d = await r.json(); } catch {}
    if (r.status === 401) throw new Error("Sign in to use translation.");
    if (!r.ok || !d?.texts) throw new Error(d?.error || (r.status === 404 ? "Translation isn't available here (it runs on the deployed site)." : `Translation failed (${r.status}).`));
    out.push(...d.texts);
    batch = []; chars = 0;
  };
  for (const t of texts) {
    if (batch.length >= BATCH_TEXTS || chars + t.length > BATCH_CHARS) await flush();
    batch.push(t); chars += t.length;
  }
  await flush();
  return out;
}
