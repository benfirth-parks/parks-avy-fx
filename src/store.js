// Local-first store for the demo. Persists to localStorage; swap the load/save
// functions for Supabase (or any API) without touching the UI.
import { useSyncExternalStore } from "react";
import { POLYGON_IDS } from "./polygons.js";

const KEY = "parks-avy-fx:v1";

export const COLOURS = [
  { name: "Dark Magenta", hex: "#8b008b", text: "#fff" },
  { name: "Aquamarine", hex: "#7fffd4", text: "#1f1f1f" },
  { name: "Royal Blue", hex: "#4169e1", text: "#fff" },
  { name: "Orange Red", hex: "#ff4500", text: "#fff" },
  { name: "Gold", hex: "#ffd700", text: "#1f1f1f" },
  { name: "Forest Green", hex: "#228b22", text: "#fff" },
  { name: "Slate Grey", hex: "#708090", text: "#fff" },
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

export const nowStamp = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};
const uid = () => Math.random().toString(36).slice(2, 10);

const text = (en = "", fr = "", tr = false) => ({ en, fr, tr });
export const blankCard = () => ({
  weather: text(), snowpack: text(), avalanche: text(),
  problems: [],
  danger: { alpine: "No Rating", treeline: "No Rating", btl: "No Rating" },
  confidence: "No Rating", confidenceFilter: "",
});
export const blankForecast = (over = {}) => ({
  id: uid(),
  name: "",
  forecaster: "Ben Firth",
  colour: COLOURS[0].name,
  issued: "2026-07-03", issuedTime: "17:00",
  expiry: "2026-10-01", expiryTime: "17:00",
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
  modified: nowStamp(),
  ...over,
});

const WEATHER_EN = `<p>For recent weather, see the <a href="https://avalanche.ca/map">telemetry stations</a> on the Avalanche Canada map page.</p><p>For forecasted weather, check out <a href="https://weather.gc.ca/">Environment Canada</a> regional forecasts.</p><p>Western Canada <a href="https://weather.gc.ca/jet_stream/index_e.html">weather maps</a></p>`;
const WEATHER_FR = `<p>Pour connaître les conditions météorologiques récentes, consultez les <a href="https://avalanche.ca/map">stations de télémétrie sur</a> la page « Cartes » du site d'Avalanche Canada.</p><p>Pour les prévisions météorologiques, consultez les prévisions régionales <a href="https://meteo.gc.ca/">d'Environnement Canada</a>.</p><p><a href="https://meteo.gc.ca/jet_stream/index_f.html">Cartes météorologiques</a> de l'Ouest canadien</p>`;
const SNOW_EN = `<p>After a big snowfall year and cooler spring temps there is still quite a bit of snow in the alpine and at treeline.</p><p>The snowpack is slowly transitioning to a summer snowpack. Its undergone numerous freeze/thaw cycles and has been rained on a bunch.</p><p>After cold clear mornings expect the surface to be firm and icy then softening with daytime heating and sun.</p><p>Click <a href="https://avalanche.ca/">here</a> for a description of the four spring potential avalanche scenarios.</p>`;
const SNOW_FR = `<p>Après une année marquée par d'importantes chutes de neige et des températures printanières plus fraîches, il reste encore pas mal de neige en haute montagne et à la limite forestière.</p><p>Le manteau neigeux évolue progressivement vers un manteau estival. Il a subi de nombreux cycles de gel-dégel et a été abondamment arrosé par la pluie.</p><p>Après des matins froids et dégagés, attendez-vous à ce que la surface soit ferme et verglacée, puis qu'elle ramollisse sous l'effet de la chaleur diurne et du soleil.</p><p>Cliquez <a href="https://avalanche.ca/">ici</a> pour découvrir la description des quatre scénarios d'avalanches potentiels au printemps.</p>`;
const AV_EN = `<p>Check the <a href="https://avalanche.ca/map">Avalanche Canada</a> map page for any recent local MINs (mountain information network) or for MCRs click here: <a href="https://www.mountainconditions.com/">mountain condition reports</a>.</p>`;
const AV_FR = `<p>Consultez la page des cartes <a href="https://avalanche.ca/map">d'Avalanche Canada</a> pour connaître les dernières informations locales du MIN (réseau d'information sur la montagne) ou, pour les MCR, cliquez ici : <a href="https://www.mountainconditions.com/">bulletins d'état des pistes</a>.</p>`;
const HEAD_EN = `<p><strong>Avalanche forecasts have ended for the season and will resume in autumn 2026.</strong></p><p><strong>During the summer months, avalanche danger may exist in the high alpine as a result of warmth and isothermal snow, or random summer snowstorms that deposit fresh snow with wind. Start your day early to take advantage of cold conditions in the morning.</strong></p>`;
const HEAD_FR = `<p><strong>Les prévisions d'avalanches ont pris fin pour cette saison et reprendront à l'automne 2026.</strong></p><p><strong>Pendant les mois d'été, un risque d'avalanche peut exister en haute montagne en raison de la chaleur et de la neige isotherme, ou de tempêtes de neige estivales sporadiques qui déposent de la neige fraîche sous l'effet du vent. Commencez votre journée tôt pour profiter des conditions froides du matin.</strong></p>`;

function seed() {
  const live = blankForecast({
    id: "byk-april-30",
    name: "BYK April 30",
    forecaster: "Lisa Paulson",
    status: "live",
    polygons: [...POLYGON_IDS],
    checks: Object.fromEntries(SECTIONS.map(([k]) => [k, k !== "review"])),
    modified: "2026-07-03 13:38",
  });
  live.cards[0].weather = text("", "");
  live.cards[1].weather = text(WEATHER_EN, WEATHER_FR);
  live.cards[0].snowpack = text(SNOW_EN, SNOW_FR);
  live.cards[0].avalanche = text(AV_EN, AV_FR);
  live.cards[1].danger = { alpine: "Summer Conditions", treeline: "Summer Conditions", btl: "Summer Conditions" };
  live.comms.headline = text(HEAD_EN, HEAD_FR);
  return { forecasts: [live], weakLayers: [
    { id: "wl1", name: "Generic non-persistent", grain: "Decomposing & Fragmented", status: "active", created: "2026-04-01" },
  ] };
}

let state = load();
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return seed();
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
}
const listeners = new Set();
function emit() { save(); listeners.forEach((l) => l()); }

export function useStore() {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, () => state);
}
export const getState = () => state;

export function updateForecast(id, fn) {
  state = { ...state, forecasts: state.forecasts.map((f) => (f.id === id ? { ...fn(structuredClone(f)), modified: nowStamp() } : f)) };
  emit();
}
export function addForecast(f) {
  state = { ...state, forecasts: [f, ...state.forecasts] };
  emit();
  return f.id;
}
export function deleteForecast(id) {
  state = { ...state, forecasts: state.forecasts.filter((f) => f.id !== id) };
  emit();
}
export function deleteDraftsStartNewDay() {
  state = { ...state, forecasts: state.forecasts.filter((f) => f.status !== "draft") };
  emit();
}
export function cloneToDraft(id) {
  const src = state.forecasts.find((f) => f.id === id);
  const copy = structuredClone(src);
  copy.id = uid();
  copy.name = `Copy of ${src.name}`;
  copy.status = "draft";
  copy.checks = {};
  copy.modified = nowStamp();
  // Everything copied from another forecast needs a fresh translation pass.
  for (const c of copy.cards) for (const k of ["weather", "snowpack", "avalanche"]) if (c[k].en || c[k].fr) c[k].tr = true;
  for (const k of ["headline", "sms"]) if (copy.comms[k].en || copy.comms[k].fr) copy.comms[k].tr = true;
  return addForecast(copy);
}
export function publishForecast(id) {
  const target = state.forecasts.find((f) => f.id === id);
  state = {
    ...state,
    forecasts: state.forecasts.map((f) => {
      if (f.id === id) return { ...f, status: "live", modified: nowStamp() };
      // A live forecast covering any of the same polygons is superseded.
      if (f.status === "live" && f.polygons.some((p) => target.polygons.includes(p))) return { ...f, status: "completed" };
      return f;
    }),
  };
  emit();
}
export function resetDemo() {
  state = seed();
  emit();
}
export function addWeakLayer(w) {
  state = { ...state, weakLayers: [...state.weakLayers, { id: uid(), created: new Date().toISOString().slice(0, 10), ...w }] };
  emit();
}

export function progress(f) {
  const done = SECTIONS.filter(([k]) => f.checks[k]).length;
  return Math.round((done / (SECTIONS.length + 1)) * 100);
}
export const colourOf = (f) => COLOURS.find((c) => c.name === f.colour) || COLOURS[0];
export function unassignedCount(forecasts, status) {
  const used = new Set(forecasts.filter((f) => f.status === status).flatMap((f) => f.polygons));
  return POLYGON_IDS.filter((p) => !used.has(p)).length;
}
