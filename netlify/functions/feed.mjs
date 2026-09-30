// Public feed of Live avalanche forecasts, read from the shared team document.
// GET /.netlify/functions/feed?format=json|rss|sms&lang=en|fr
//   json (default) → structured forecasts for other sites / apps
//   rss            → one item per live forecast
//   sms            → plain-text SMS message(s), ready to hand to a texting service
// Forecasts past their expiry are left out even if nobody has opened the app since.
import { getStore } from "@netlify/blobs";
import { PLACEHOLDER } from "../../src/polygons.js";
import { UI_FR } from "../../src/content.js";

export default async (req) => {
  try {
    const url = new URL(req.url);
    const format = (url.searchParams.get("format") || "json").toLowerCase();
    const lang = url.searchParams.get("lang") === "fr" ? "fr" : "en";
    const store = getStore({ name: "parks-avy-fx", consistency: "strong" });
    const doc = await store.get("state", { type: "json" });
    const out = render(doc?.state, { format, lang, origin: url.origin, now: new Date() });
    return new Response(out.body, { status: out.status || 200, headers: { "content-type": out.type, "cache-control": "public, max-age=60", "access-control-allow-origin": "*" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e && e.message ? e.message : e) }), { status: 500, headers: { "content-type": "application/json" } });
  }
};

// Pure renderer (no Netlify APIs) so it can be exercised locally.
export function render(state, { format = "json", lang = "en", origin = "", now = new Date() } = {}) {
  const fc = state?.geo?.fc?.features?.length ? state.geo.fc : PLACEHOLDER; // imported polygons, else placeholders
  const names = Object.fromEntries(fc.features.map((f) => [f.id, f.properties.name]));
  const forecasts = liveForecasts(state, now).map((f) => shape(f, lang, origin, names));
  if (format === "sms") return { type: "text/plain; charset=utf-8", body: sms(forecasts) };
  if (format === "rss") return { type: "application/rss+xml; charset=utf-8", body: rss(forecasts, lang, origin, now) };
  if (format !== "json") return { status: 400, type: "application/json", body: JSON.stringify({ error: "format must be json, rss or sms" }) };
  return { type: "application/json; charset=utf-8", body: JSON.stringify({ generated: now.toISOString(), lang, forecasts }, null, 2) };
}

// ---------- selection ----------
const TZ = { "Mountain Time (Canada)": "America/Edmonton", "Pacific Time (Canada)": "America/Vancouver" };
const zoneOf = (f) => TZ[f.timezone] || TZ["Mountain Time (Canada)"];

function liveForecasts(state, now) {
  return (state?.forecasts || [])
    .filter((f) => f.status === "live" && zonedToUtc(f.expiry, f.expiryTime || "17:00", zoneOf(f)) > now)
    .sort((a, b) => (b.publishedAt || b.modified || "").localeCompare(a.publishedAt || a.modified || ""));
}

// Wall-clock date/time in an IANA zone → UTC Date (handles DST).
export function zonedToUtc(date, time, zone) {
  const [y, m, d] = String(date).split("-").map(Number);
  const [hh, mm] = String(time).split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh || 0, mm || 0);
  const off = offset(guess, zone);
  let ts = guess - off;
  const off2 = offset(ts, zone);
  if (off2 !== off) ts = guess - off2;
  return new Date(ts);
}
function offset(ts, zone) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: zone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(new Date(ts)).map((p) => [p.type, p.value]));
  return Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second) - ts;
}

// ---------- shaping ----------
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const addDays = (dateStr, n) => { const d = new Date(dateStr + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d; };
const iso = (d) => d.toISOString().slice(0, 10);

function shape(f, lang, origin, names) {
  const T = (s) => (lang === "fr" ? UI_FR[s] || s : s);
  const L = (field) => (field ? (lang === "fr" ? field.fr || field.en : field.en) || "" : "");
  const base = f.dayOne === "Issue Date" ? 0 : 1;
  const zone = zoneOf(f);
  // Same day cards as the public preview: the three forecast days after the nowcast.
  const days = [1, 2, 3].filter((i) => f.visibleCards?.[i] !== false).map((i) => {
    const date = addDays(f.issued, base + i - 1);
    const card = f.cards[i];
    return { date: iso(date), day: T(DAYS[date.getUTCDay()]), danger: { alpine: T(card.danger.alpine), treeline: T(card.danger.treeline), belowTreeline: T(card.danger.btl) } };
  });
  const problems = f.cards.flatMap((c, i) => (c.problems || []).map((p) => ({
    type: T(p.type), day: i === 0 ? "nowcast" : iso(addDays(f.issued, base + i - 1)),
    distribution: p.distribution || null, sensitivity: p.sensitivity || null, size: p.size || null,
    depthCm: p.depthMin || p.depthMax ? [p.depthMin || null, p.depthMax || null] : null,
    aspectsElevations: p.cells || [], description: toText(L(p.desc)), advice: p.tta || [],
  })));
  const summary = (k) => { const field = f.cards.map((c) => c[k]).find((x) => x && (x.en || x.fr)); return field ? L(field) : ""; };
  const first = f.cards[1];
  const headline = L(f.comms?.headline);
  const banner = L(f.comms?.banner);
  const smsText = toText(L(f.comms?.sms)) || toText(headline).slice(0, 140);
  const texts = [...f.cards.flatMap((c) => [c.weather, c.snowpack, c.avalanche, ...(c.problems || []).map((p) => p.desc)]), f.comms?.banner, f.comms?.headline, f.comms?.sms];
  const translationRequired = lang === "fr" && texts.some((x) => x && x.tr === true && (x.en || x.fr));
  const machineTranslated = lang === "fr" && texts.some((x) => x && x.tr === "machine");
  return {
    id: f.id, name: f.name, forecaster: f.forecaster,
    issued: zonedToUtc(f.issued, f.issuedTime || "17:00", zone).toISOString(),
    validUntil: zonedToUtc(f.expiry, f.expiryTime || "17:00", zone).toISOString(),
    published: f.publishedAt || f.modified || null,
    areas: (f.polygons || []).filter((id) => names[id]).map((id) => ({ id, name: names[id] })),
    banner: banner ? { html: banner, text: toText(banner) } : null,
    headline: { html: headline, text: toText(headline) },
    sms: smsText,
    days,
    problems,
    summaries: { snowpack: summary("snowpack"), avalanche: summary("avalanche"), weather: summary("weather") },
    confidence: { rating: T(first.confidence), statements: first.confidenceStatements || [] },
    translationRequired, machineTranslated,
    url: `${origin}/#/forecasts/${f.id}/preview`,
  };
}

function toText(html) {
  return String(html || "")
    .replace(/<\s*br\s*\/?>/gi, "\n").replace(/<\/(p|li|h[1-6]|div)>/gi, "\n").replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/[ \t]+\n/g, "\n").replace(/\n{2,}/g, "\n").trim();
}

// ---------- formats ----------
function sms(list) {
  if (!list.length) return "";
  if (list.length === 1) return list[0].sms + "\n";
  return list.map((f) => `${f.name}: ${f.sms}`).join("\n\n") + "\n";
}

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const cdata = (s) => `<![CDATA[${String(s).replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;

function rss(list, lang, origin, now) {
  const fr = lang === "fr";
  const title = fr ? "Prévisions d'avalanches — Banff, Yoho et Kootenay" : "Avalanche Forecasts — Banff, Yoho & Kootenay";
  const items = list.map((f) => {
    const first = f.days[0];
    const rating = first ? ` — ${first.day}: ${[first.danger.alpine, first.danger.treeline, first.danger.belowTreeline].join(" / ")}` : "";
    const rows = f.days.map((d) => `<tr><td>${esc(d.day)}</td><td>${esc(d.danger.alpine)}</td><td>${esc(d.danger.treeline)}</td><td>${esc(d.danger.belowTreeline)}</td></tr>`).join("");
    const head = fr ? ["Jour", "Alpin", "Limite forestière", "Sous la limite forestière"] : ["Day", "Alpine", "Treeline", "Below Treeline"];
    const body = `${f.banner ? `<p><strong>${f.banner.html}</strong></p>` : ""}${f.headline.html}<table><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr>${rows}</table>`
      + (f.areas.length ? `<p>${fr ? "Secteurs" : "Areas"}: ${esc(f.areas.map((a) => a.name).join(", "))}</p>` : "")
      + ["snowpack", "avalanche", "weather"].map((k) => f.summaries[k]).filter(Boolean).join("");
    return `<item><title>${esc(f.name + rating)}</title><link>${esc(f.url)}</link><guid isPermaLink="false">${esc(f.id + "@" + (f.published || f.issued))}</guid><pubDate>${new Date(f.published || f.issued).toUTCString()}</pubDate><description>${cdata(body)}</description></item>`;
  }).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>${esc(title)}</title><link>${esc(origin + "/")}</link><description>${esc(title)}</description><language>${fr ? "fr-CA" : "en-CA"}</language><lastBuildDate>${now.toUTCString()}</lastBuildDate><ttl>5</ttl>
${items}
</channel></rss>
`;
}
