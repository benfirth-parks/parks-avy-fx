// Forecast polygons for the Banff / Yoho / Kootenay (BYK) region.
// PLACEHOLDERS below are hand-drafted to match the shape of the AVID map. The real
// polygons are imported in the app (Documentation → Forecast polygons) and stored in
// the shared document as `geo`; setPolygons() swaps them in. Features are Polygon or
// MultiPolygon with properties { id, name }.
export const PLACEHOLDER = {
  type: "FeatureCollection",
  features: [
    poly("west-93n", "West Side 93N", [[-116.95,52.05],[-116.75,52.12],[-116.55,51.85],[-116.45,51.62],[-116.62,51.55],[-116.85,51.75]]),
    poly("east-93n", "East Side 93N", [[-116.75,52.12],[-116.55,52.15],[-116.35,51.9],[-116.15,51.68],[-116.28,51.55],[-116.45,51.62],[-116.55,51.85]]),
    poly("little-yoho", "Little Yoho", [[-116.85,51.75],[-116.62,51.55],[-116.45,51.62],[-116.5,51.48],[-116.7,51.45],[-116.9,51.55]]),
    poly("field", "Field", [[-116.7,51.45],[-116.5,51.48],[-116.45,51.35],[-116.6,51.3],[-116.72,51.36]]),
    poly("lake-louise", "Lake Louise", [[-116.5,51.48],[-116.28,51.55],[-116.15,51.5],[-116.05,51.32],[-116.2,51.2],[-116.45,51.35]]),
    poly("llsa", "LLSA", [[-116.28,51.55],[-116.15,51.68],[-115.95,51.6],[-115.9,51.45],[-116.05,51.32],[-116.15,51.5]]),
    poly("sunshine", "Sunshine", [[-116.05,51.32],[-115.9,51.45],[-115.7,51.3],[-115.65,51.12],[-115.85,51.05],[-116.0,51.15]]),
    poly("kootenay", "Kootenay", [[-116.2,51.2],[-116.05,51.32],[-116.0,51.15],[-115.85,51.05],[-115.95,50.85],[-116.15,50.9],[-116.25,51.05]]),
    poly("banff", "Banff", [[-115.7,51.3],[-115.55,51.35],[-115.35,51.2],[-115.35,51.05],[-115.55,51.0],[-115.65,51.12]]),
  ],
};

function poly(id, name, ring) {
  const closed = [...ring, ring[0]];
  return { type: "Feature", id, properties: { id, name }, geometry: { type: "Polygon", coordinates: [closed] } };
}

// Live bindings: importers of POLYGONS / POLYGON_IDS / POLYGON_NAME see the current set.
export let POLYGONS = PLACEHOLDER;
export let POLYGON_IDS = [];
export let POLYGON_NAME = {};
export let POLYGON_VERSION = 0;
export function setPolygons(fc) {
  const next = fc && Array.isArray(fc.features) && fc.features.length ? fc : PLACEHOLDER;
  if (next === POLYGONS && POLYGON_VERSION) return false;
  POLYGONS = next;
  POLYGON_IDS = POLYGONS.features.map((f) => f.id);
  POLYGON_NAME = Object.fromEntries(POLYGONS.features.map((f) => [f.id, f.properties.name]));
  POLYGON_VERSION++;
  return true;
}
setPolygons(PLACEHOLDER);

// Outer rings of a Polygon / MultiPolygon feature.
export const outerRings = (f) => (f.geometry.type === "MultiPolygon" ? f.geometry.coordinates.map((p) => p[0]) : [f.geometry.coordinates[0]]);
// Label point: vertex average of the largest outer ring.
export function labelPoint(f) {
  let best = null, bestA = -1;
  for (const r of outerRings(f)) { const a = Math.abs(ringArea(r)); if (a > bestA) { bestA = a; best = r; } }
  let x = 0, y = 0; const n = best.length - 1 || 1;
  for (let i = 0; i < n; i++) { x += best[i][0]; y += best[i][1]; }
  return [x / n, y / n];
}
function ringArea(r) { let a = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1]); return a / 2; }

// Turn an uploaded GeoJSON file into forecast polygons. Names come from `nameProp`
// (auto-detected when omitted); ids are kept from `existing` when the name matches,
// so forecasts that already reference a polygon keep it. Coordinates are rounded to
// ~1 m to keep the shared document small.
export const NAME_PROPS = ["name", "Name", "NAME", "title", "Title", "label", "Label", "zone", "Zone", "ZONE_NAME", "region", "Region"];
export function importGeoJSON(raw, { nameProp, existing = PLACEHOLDER } = {}) {
  const gj = typeof raw === "string" ? JSON.parse(raw) : raw;
  const feats = gj?.type === "FeatureCollection" ? gj.features : gj?.type === "Feature" ? [gj] : null;
  if (!feats) throw new Error("Not a GeoJSON FeatureCollection.");
  const polys = feats.filter((f) => f?.geometry && (f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon"));
  if (!polys.length) throw new Error("No Polygon or MultiPolygon features in the file.");
  const prop = nameProp || NAME_PROPS.find((k) => polys.every((f) => f.properties && f.properties[k] != null && String(f.properties[k]).trim()));
  if (!prop) throw new Error("Couldn't find a name property shared by every polygon. Name them (e.g. a \"name\" property) and try again.");
  const byName = Object.fromEntries(existing.features.map((f) => [norm(f.properties.name), f.id]));
  const round = (c) => (typeof c[0] === "number" ? [Math.round(c[0] * 1e5) / 1e5, Math.round(c[1] * 1e5) / 1e5] : c.map(round));
  const used = new Set();
  const features = polys.map((f) => {
    const name = String(f.properties[prop]).trim();
    let id = byName[norm(name)] || slug(name) || "polygon";
    for (let n = 2; used.has(id); n++) id = `${slug(name)}-${n}`;
    used.add(id);
    const coordinates = round(f.geometry.coordinates);
    return { type: "Feature", id, properties: { id, name }, geometry: { type: f.geometry.type, coordinates } };
  });
  for (const f of features) for (const r of outerRings(f)) for (const [x, y] of r)
    if (!(x >= -180 && x <= 180 && y >= -90 && y <= 90)) throw new Error("Coordinates aren't longitude/latitude. Export the file in WGS84 (EPSG:4326) and try again.");
  return { type: "FeatureCollection", features, nameProp: prop };
}
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
