// Store: in-memory state, mirrored to localStorage (cache / offline) and to the
// shared team document served by netlify/functions/state.mjs (Netlify Blobs).
import { useSyncExternalStore } from "react";
import { POLYGON_IDS } from "./polygons.js";
import * as sync from "./sync.js";

const KEY = "parks-avy-fx:v2";
const USER_KEY = "parks-avy-fx:user";

export const COLOURS = [
  { name: "Dark Magenta", hex: "#8b008b", text: "#fff" },
  { name: "Aquamarine", hex: "#7fffd4", text: "#1f1f1f" },
  { name: "Royal Blue", hex: "#4169e1", text: "#fff" },
  { name: "Orange Red", hex: "#ff4500", text: "#fff" },
  { name: "Gold", hex: "#ffd700", text: "#1f1f1f" },
  { name: "Forest Green", hex: "#228b22", text: "#fff" },
  { name: "Slate Grey", hex: "#708090", text: "#fff" },
  { name: "Hot Pink", hex: "#ff69b4", text: "#1f1f1f" },
  { name: "Teal", hex: "#008080", text: "#fff" },
];
export const FORECASTERS = ["Ben Firth", "Lisa Paulson"];
export const TIMEZONES = ["Mountain Time (Canada)", "Pacific Time (Canada)"];
export const SECTIONS = [
  ["weather", "Weather Summary"],
  ["snowpack", "Snowpack Summary"],
  ["avalanche", "Avalanche Summary"],
  ["problems", "Avalanche Problems"],
  ["danger", "Danger Ratings"],
  ["confidence", "Confidence"],
  ["media", "Media"],
  ["communications", "Communications"],
  ["review", "Review"],
];

// ---------- time helpers ----------
export const nowIso = () => new Date().toISOString();
const p2 = (n) => String(n).padStart(2, "0");
export function fmtStamp(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
}
export function relTime(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return iso || "";
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 60) return "Less Than A Minute Ago";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} Minute${m === 1 ? "" : "s"} Ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} Hour${h === 1 ? "" : "s"} Ago`;
  const days = Math.floor(h / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} Days Ago`;
  return fmtStamp(iso);
}
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export function dayName(dateStr, offset = 0) {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + offset);
  return DAYS[d.getDay()];
}
export function cardTitles(f) {
  const base = f.dayOne === "Issue Date" ? 0 : 1;
  return [
    `${dayName(f.issued, base)} Nowcast`,
    `${dayName(f.issued, base)} Forecast`,
    `${dayName(f.issued, base + 1)} Forecast`,
    `${dayName(f.issued, base + 2)} Forecast`,
  ];
}
export const expiryDate = (f) => new Date(`${f.expiry}T${f.expiryTime || "17:00"}:00`);

const uid = () => Math.random().toString(36).slice(2, 10);

// ---------- identity (per browser) ----------
let user = "Ben Firth";
try { user = localStorage.getItem(USER_KEY) || user; } catch {}
export const getUser = () => user;
export function setUser(name) {
  user = name;
  try { localStorage.setItem(USER_KEY, name); } catch {}
  emit(false);
}
export const initials = (name) => name.split(/\s+/).filter(Boolean).map((w) => w[0].toUpperCase()).slice(0, 2).join("");

// ---------- shapes ----------
const text = (en = "", fr = "", tr = false) => ({ en, fr, tr });
export const blankCard = () => ({
  weather: text(), snowpack: text(), avalanche: text(),
  problems: [],
  danger: { alpine: "No Rating", treeline: "No Rating", btl: "No Rating" },
  confidence: "No Rating", confidenceFilter: "", confidenceStatements: [],
});
export const blankForecast = (over = {}) => ({
  id: uid(),
  name: "",
  forecaster: user,
  colour: COLOURS[0].name,
  issued: todayStr(), issuedTime: "17:00",
  expiry: todayStr(1), expiryTime: "17:00",
  timezone: TIMEZONES[0],
  multiDay: false,
  dayOne: "Issue Date",
  status: "draft",
  reviewStatus: "Not Required",
  polygons: [],
  checks: {},
  cards: [blankCard(), blankCard(), blankCard(), blankCard()],
  visibleCards: [true, true, true, true],
  media: {},
  comms: { headline: text(), sms: text() },
  reviewNote: "",
  modified: nowIso(),
  modifiedBy: user,
  ...over,
});
function todayStr(offsetDays = 0) {
  const d = new Date(); d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}

const WEATHER_EN = `<p>For recent weather, see the <a href="https://avalanche.ca/map">telemetry stations</a> on the Avalanche Canada map page.</p><p>For forecasted weather, check out <a href="https://weather.gc.ca/">Environment Canada</a> regional forecasts.</p><p>Western Canada <a href="https://weather.gc.ca/jet_stream/index_e.html">weather maps</a></p>`;
const WEATHER_FR = `<p>Pour connaître les conditions météorologiques récentes, consultez les <a href="https://avalanche.ca/map">stations de télémétrie sur</a> la page « Cartes » du site d'Avalanche Canada.</p><p>Pour les prévisions météorologiques, consultez les prévisions régionales <a href="https://meteo.gc.ca/">d'Environnement Canada</a>.</p><p><a href="https://meteo.gc.ca/jet_stream/index_f.html">Cartes météorologiques</a> de l'Ouest canadien</p>`;
const SNOW_EN = `<p>After a big snowfall year and cooler spring temps there is still quite a bit of snow in the alpine and at treeline.</p><p>The snowpack is slowly transitioning to a summer snowpack. Its undergone numerous freeze/thaw cycles and has been rained on a bunch.</p><p>After cold clear mornings expect the surface to be firm and icy then softening with daytime heating and sun.</p><p>Click <a href="https://avalanche.ca/">here</a> for a description of the four spring potential avalanche scenarios.</p>`;
const SNOW_FR = `<p>Après une année marquée par d'importantes chutes de neige et des températures printanières plus fraîches, il reste encore pas mal de neige en haute montagne et à la limite forestière.</p><p>Le manteau neigeux évolue progressivement vers un manteau estival. Il a subi de nombreux cycles de gel-dégel et a été abondamment arrosé par la pluie.</p><p>Après des matins froids et dégagés, attendez-vous à ce que la surface soit ferme et verglacée, puis qu'elle ramollisse sous l'effet de la chaleur diurne et du soleil.</p><p>Cliquez <a href="https://avalanche.ca/">ici</a> pour découvrir la description des quatre scénarios d'avalanches potentiels au printemps.</p>`;
const AV_EN = `<p>Check the <a href="https://avalanche.ca/map">Avalanche Canada</a> map page for any recent local MINs (mountain information network) or for MCRs click here: <a href="https://www.mountainconditions.com/">mountain condition reports</a>.</p>`;
const AV_FR = `<p>Consultez la page des cartes <a href="https://avalanche.ca/map">d'Avalanche Canada</a> pour connaître les dernières informations locales du MIN (réseau d'information sur la montagne) ou, pour les MCR, cliquez ici : <a href="https://www.mountainconditions.com/">bulletins d'état des pistes</a>.</p>`;
const HEAD_EN = `<p><strong>Avalanche forecasts have ended for the season and will resume in autumn 2026.</strong></p><p><strong>During the summer months, avalanche danger may exist in the high alpine as a result of warmth and isothermal snow, or random summer snowstorms that deposit fresh snow with wind. Start your day early to take advantage of cold conditions in the morning.</strong></p>`;
const HEAD_FR = `<p><strong>Les prévisions d'avalanches ont pris fin pour cette saison et reprendront à l'automne 2026.</strong></p><p><strong>Pendant les mois d'été, un risque d'avalanche peut exister en haute montagne en raison de la chaleur et de la neige isotherme, ou de tempêtes de neige estivales sporadiques qui déposent de la neige fraîche sous l'effet du vent. Commencez votre journée tôt pour profiter des conditions froides du matin.</strong></p>`;

export function seed() {
  const live = blankForecast({
    id: "byk-april-30",
    name: "BYK April 30",
    forecaster: "Lisa Paulson",
    status: "live",
    issued: "2026-07-03", issuedTime: "17:00",
    expiry: "2026-10-01", expiryTime: "17:00",
    polygons: [...POLYGON_IDS],
    checks: Object.fromEntries(SECTIONS.map(([k]) => [k, k !== "review"])),
    modified: "2026-07-03T19:38:00.000Z",
    modifiedBy: "Lisa Paulson",
  });
  live.cards[1].weather = text(WEATHER_EN, WEATHER_FR);
  live.cards[0].snowpack = text(SNOW_EN, SNOW_FR);
  live.cards[0].avalanche = text(AV_EN, AV_FR);
  live.cards[1].danger = { alpine: "Summer Conditions", treeline: "Summer Conditions", btl: "Summer Conditions" };
  live.comms.headline = text(HEAD_EN, HEAD_FR);
  return {
    forecasts: [live],
    weakLayers: [
      { id: "wl1", name: "Generic non-persistent", grain: "Decomposing & Fragmented", status: "active", buried: "", notes: "", created: "2026-04-01", modified: "2026-04-01T18:00:00.000Z" },
    ],
    tombstones: {},
  };
}

// ---------- state ----------
let state = load();
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch {}
  return seed();
}
function normalize(s) {
  return { forecasts: s.forecasts || [], weakLayers: s.weakLayers || [], tombstones: s.tombstones || {} };
}
function saveLocal() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
}
const listeners = new Set();
function emit(changed = true) {
  if (changed) { saveLocal(); sync.scheduleSave(); }
  listeners.forEach((l) => l());
}
export function useStore() {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, () => state);
}
export const getState = () => state;

// Called by sync when the shared document changes elsewhere.
export function replaceState(next) {
  state = normalize(next);
  saveLocal();
  listeners.forEach((l) => l());
}

// Merge two copies of the document: newest edit per forecast wins, deletions carry.
export function merge(a, b) {
  const tomb = { ...(a.tombstones || {}), ...(b.tombstones || {}) };
  for (const id of Object.keys(tomb)) if (!tomb[id]) delete tomb[id];
  const byId = new Map();
  for (const f of [...(a.forecasts || []), ...(b.forecasts || [])]) {
    const cur = byId.get(f.id);
    if (!cur || (f.modified || "") > (cur.modified || "")) byId.set(f.id, f);
  }
  const forecasts = [...byId.values()].filter((f) => !(tomb[f.id] && tomb[f.id] >= (f.modified || "")));
  const wl = new Map();
  for (const w of [...(a.weakLayers || []), ...(b.weakLayers || [])]) {
    const cur = wl.get(w.id);
    if (!cur || (w.modified || "") > (cur.modified || "")) wl.set(w.id, w);
  }
  const weakLayers = [...wl.values()].filter((w) => !(tomb[w.id] && tomb[w.id] >= (w.modified || "")));
  forecasts.sort((x, y) => (y.modified || "").localeCompare(x.modified || ""));
  return { forecasts, weakLayers, tombstones: tomb };
}

// ---------- mutations ----------
export function updateForecast(id, fn) {
  state = { ...state, forecasts: state.forecasts.map((f) => (f.id === id ? { ...fn(structuredClone(f)), modified: nowIso(), modifiedBy: user } : f)) };
  emit();
}
export function addForecast(f) {
  state = { ...state, forecasts: [f, ...state.forecasts] };
  emit();
  return f.id;
}
export function deleteForecast(id) {
  state = { ...state, forecasts: state.forecasts.filter((f) => f.id !== id), tombstones: { ...state.tombstones, [id]: nowIso() } };
  emit();
}
export function deleteDraftsStartNewDay() {
  const t = nowIso();
  const tomb = { ...state.tombstones };
  for (const f of state.forecasts) if (f.status === "draft") tomb[f.id] = t;
  state = { ...state, forecasts: state.forecasts.filter((f) => f.status !== "draft"), tombstones: tomb };
  emit();
}
export function cloneToDraft(id) {
  const src = state.forecasts.find((f) => f.id === id);
  const copy = structuredClone(src);
  copy.id = uid();
  copy.name = `Copy of ${src.name}`;
  copy.status = "draft";
  copy.checks = {};
  copy.forecaster = user;
  copy.modified = nowIso();
  copy.modifiedBy = user;
  // Everything copied from another forecast needs a fresh translation pass.
  for (const c of copy.cards) for (const k of ["weather", "snowpack", "avalanche"]) if (c[k].en || c[k].fr) c[k].tr = true;
  for (const k of ["headline", "sms"]) if (copy.comms[k].en || copy.comms[k].fr) copy.comms[k].tr = true;
  return addForecast(copy);
}
export function publishForecast(id) {
  const target = state.forecasts.find((f) => f.id === id);
  const t = nowIso();
  state = {
    ...state,
    forecasts: state.forecasts.map((f) => {
      if (f.id === id) return { ...f, status: "live", publishedAt: t, modified: t, modifiedBy: user };
      // A live forecast covering any of the same polygons is superseded.
      if (f.status === "live" && f.polygons.some((p) => target.polygons.includes(p))) return { ...f, status: "completed", completedAt: t, modified: t, modifiedBy: user };
      return f;
    }),
  };
  emit();
}
// Live forecasts past their expiry move to Completed.
export function expireForecasts() {
  const now = new Date();
  let changed = false;
  const forecasts = state.forecasts.map((f) => {
    if (f.status === "live" && expiryDate(f) < now) { changed = true; return { ...f, status: "completed", completedAt: nowIso(), modified: nowIso(), modifiedBy: "system" }; }
    return f;
  });
  if (changed) { state = { ...state, forecasts }; emit(); }
}
export function resetDemo() {
  state = seed();
  emit();
}
export function addWeakLayer(w) {
  state = { ...state, weakLayers: [...state.weakLayers, { id: uid(), created: todayStr(), modified: nowIso(), ...w }] };
  emit();
}
export function updateWeakLayer(id, patch) {
  state = { ...state, weakLayers: state.weakLayers.map((w) => (w.id === id ? { ...w, ...patch, modified: nowIso() } : w)) };
  emit();
}
export function deleteWeakLayer(id) {
  state = { ...state, weakLayers: state.weakLayers.filter((w) => w.id !== id), tombstones: { ...state.tombstones, [id]: nowIso() } };
  emit();
}

// ---------- derived ----------
export function progress(f) {
  const done = SECTIONS.filter(([k]) => f.checks[k]).length;
  return Math.min(100, done * 10);
}
export const colourOf = (f) => COLOURS.find((c) => c.name === f.colour) || COLOURS[0];
export function unassignedCount(forecasts, status) {
  const used = new Set(forecasts.filter((f) => f.status === status).flatMap((f) => f.polygons));
  return POLYGON_IDS.filter((p) => !used.has(p)).length;
}

// Boot the shared-document sync once the module is loaded.
sync.start({ getState, replaceState, merge, getUser });
expireForecasts();
setInterval(expireForecasts, 60_000);
