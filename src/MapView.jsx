import React, { useEffect, useRef, useState } from "react";
import { POLYGONS, POLYGON_IDS, outerRings, labelPoint, groupCentre } from "./polygons.js";
import { colourOf } from "./store.js";
import { Icons, forecastMarkerSvg } from "./icons.jsx";
import { SvgMap, webglAvailable, polygonBounds } from "./SvgMap.jsx";

const GREY = { hex: "#8a8a9a", opacity: 0.35, line: "#6d6d80" };

// Keyless outdoors-style basemap (matches AVID's Mapbox Outdoors look):
//  - shaded relief from AWS Terrain Tiles (Terrarium DEM, open data, no key)
//  - land cover, water, roads and labels from OpenFreeMap vector tiles (free, no key)
// If a source is unreachable the rest still draws; tile errors never switch to the fallback map.
const OFM = "https://tiles.openfreemap.org";
const FONT = ["Noto Sans Regular"], FONT_IT = ["Noto Sans Italic"], FONT_B = ["Noto Sans Bold"];
const style = () => ({
  version: 8,
  glyphs: `${OFM}/fonts/{fontstack}/{range}.pbf`,
  sources: {
    dem: { type: "raster-dem", encoding: "terrarium", tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"], tileSize: 256, maxzoom: 14, attribution: "Terrain: Mapzen / AWS Open Data" },
    omt: { type: "vector", url: `${OFM}/planet`, attribution: '<a href="https://openfreemap.org">OpenFreeMap</a> © <a href="https://www.openmaptiles.org/">OpenMapTiles</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' },
    polys: { type: "geojson", data: { type: "FeatureCollection", features: POLYGONS.features }, promoteId: "id" },
  },
  layers: [
    { id: "land", type: "background", paint: { "background-color": "#e7edca" } },
    { id: "wood", type: "fill", source: "omt", "source-layer": "landcover", filter: ["==", ["get", "class"], "wood"], paint: { "fill-color": "#cfe0a8", "fill-opacity": 0.75 } },
    { id: "grass", type: "fill", source: "omt", "source-layer": "landcover", filter: ["in", ["get", "class"], ["literal", ["grass", "farmland", "wetland"]]], paint: { "fill-color": "#e2eabf", "fill-opacity": 0.6 } },
    { id: "rock", type: "fill", source: "omt", "source-layer": "landcover", filter: ["in", ["get", "class"], ["literal", ["rock", "sand"]]], paint: { "fill-color": "#ecebe3", "fill-opacity": 0.7 } },
    { id: "ice", type: "fill", source: "omt", "source-layer": "landcover", filter: ["==", ["get", "class"], "ice"], paint: { "fill-color": "#f7fbfd", "fill-opacity": 0.9 } },
    { id: "hillshade", type: "hillshade", source: "dem", paint: { "hillshade-exaggeration": 0.38, "hillshade-shadow-color": "#6f7560", "hillshade-highlight-color": "#fbfbf6", "hillshade-accent-color": "#8a8c78", "hillshade-illumination-direction": 315 } },
    { id: "water", type: "fill", source: "omt", "source-layer": "water", paint: { "fill-color": "#9fd3ec" } },
    { id: "river", type: "line", source: "omt", "source-layer": "waterway", filter: ["in", ["get", "class"], ["literal", ["river", "canal"]]], paint: { "line-color": "#9fd3ec", "line-width": ["interpolate", ["linear"], ["zoom"], 8, 0.8, 13, 2.5] } },
    { id: "stream", type: "line", source: "omt", "source-layer": "waterway", minzoom: 11, filter: ["==", ["get", "class"], "stream"], paint: { "line-color": "#aad8ee", "line-width": 0.7 } },
    { id: "park-edge", type: "line", source: "omt", "source-layer": "park", paint: { "line-color": "#7fae6a", "line-width": 0.8, "line-opacity": 0.5, "line-dasharray": [3, 2] } },
    { id: "border", type: "line", source: "omt", "source-layer": "boundary", filter: ["<=", ["get", "admin_level"], 4], paint: { "line-color": "#9a8f9e", "line-width": 1, "line-dasharray": [4, 2, 1, 2] } },
    { id: "road-minor", type: "line", source: "omt", "source-layer": "transportation", minzoom: 10, filter: ["in", ["get", "class"], ["literal", ["secondary", "tertiary", "minor"]]], paint: { "line-color": "#ffffff", "line-width": ["interpolate", ["linear"], ["zoom"], 10, 0.6, 14, 2.5] } },
    { id: "road-major-case", type: "line", source: "omt", "source-layer": "transportation", filter: ["in", ["get", "class"], ["literal", ["motorway", "trunk", "primary"]]], paint: { "line-color": "#d9a27f", "line-width": ["interpolate", ["linear"], ["zoom"], 7, 1.4, 13, 5] } },
    { id: "road-major", type: "line", source: "omt", "source-layer": "transportation", filter: ["in", ["get", "class"], ["literal", ["motorway", "trunk", "primary"]]], paint: { "line-color": "#fbe3cf", "line-width": ["interpolate", ["linear"], ["zoom"], 7, 0.6, 13, 3.4] } },
    // Polygons sit above roads and water, below labels (as in AVID).
    { id: "poly-fill", type: "fill", source: "polys", paint: { "fill-color": ["coalesce", ["feature-state", "color"], GREY.hex], "fill-opacity": ["coalesce", ["feature-state", "opacity"], GREY.opacity] } },
    { id: "poly-line", type: "line", source: "polys", paint: { "line-color": ["coalesce", ["feature-state", "line"], GREY.line], "line-width": 1, "line-opacity": 0.85 } },
    { id: "shield", type: "symbol", source: "omt", "source-layer": "transportation_name", filter: ["all", ["has", "ref"], ["in", ["get", "class"], ["literal", ["motorway", "trunk", "primary"]]]], layout: { "symbol-placement": "line", "symbol-spacing": 420, "text-field": ["get", "ref"], "text-font": FONT_B, "text-size": 10, "text-rotation-alignment": "viewport", "text-padding": 6 }, paint: { "text-color": "#555", "text-halo-color": "#fff", "text-halo-width": 3 } },
    { id: "water-name", type: "symbol", source: "omt", "source-layer": "water_name", minzoom: 10, layout: { "text-field": ["get", "name"], "text-font": FONT_IT, "text-size": 11 }, paint: { "text-color": "#3f7fa6", "text-halo-color": "rgba(255,255,255,.7)", "text-halo-width": 1 } },
    { id: "park-name", type: "symbol", source: "omt", "source-layer": "park", filter: ["==", ["geometry-type"], "Point"], layout: { "text-field": ["get", "name"], "text-font": FONT, "text-size": 11, "text-max-width": 8 }, paint: { "text-color": "#3a7a2c", "text-halo-color": "rgba(255,255,255,.8)", "text-halo-width": 1.2 } },
    { id: "peak", type: "symbol", source: "omt", "source-layer": "mountain_peak", minzoom: 11, filter: ["<=", ["get", "rank"], 3], layout: { "text-field": ["get", "name"], "text-font": FONT_IT, "text-size": 10, "text-offset": [0, 0.6] }, paint: { "text-color": "#6b5d4a", "text-halo-color": "rgba(255,255,255,.8)", "text-halo-width": 1 } },
    { id: "place", type: "symbol", source: "omt", "source-layer": "place", filter: ["in", ["get", "class"], ["literal", ["city", "town", "village"]]], layout: { "text-field": ["get", "name"], "text-font": FONT, "text-size": ["match", ["get", "class"], "city", 14, "town", 12.5, 11] }, paint: { "text-color": "#333", "text-halo-color": "#fff", "text-halo-width": 1.5 } },
  ],
});
// Polygon labels are HTML markers (no glyph fetch needed, so they work offline too).

export function MapView({ forecasts, selectedId, editingId, onTogglePolygon, onLasso, banner, unassigned }) {
  const el = useRef(null), map = useRef(null), ready = useRef(false);
  const latest = useRef({ forecasts, selectedId, editingId, onTogglePolygon, onLasso });
  const [lasso, setLasso] = useState(false);
  const [path, setPath] = useState(null); // screen-space points while drawing
  const drawing = useRef(null);
  const [noTiles, setNoTiles] = useState(false);
  const tilesFailed = () => setNoTiles(true);
  latest.current = { forecasts, selectedId, editingId, onTogglePolygon, onLasso };

  const [mapError, setMapError] = useState("");
  const [fallback, setFallback] = useState(() => !window.maplibregl || !webglAvailable());
  const loaded = useRef(false);
  useEffect(() => {
    if (!el.current || fallback) return;
    let m;
    try {
      const b = polygonBounds();
      m = new window.maplibregl.Map({ container: el.current, style: style(), bounds: [[b.w, b.s], [b.e, b.n]], fitBoundsOptions: { padding: 40 }, attributionControl: false });
    } catch (e) { setMapError("Map could not start: " + (e.message || e)); setFallback(true); return; }
    m.addControl(new window.maplibregl.AttributionControl({ compact: true }), "bottom-left");
    // "style.load" (not "load"): "load" waits for every source, so one unreachable
    // basemap source would keep the polygons unlabelled and unpainted.
    m.once("style.load", () => {
      ready.current = true; loaded.current = true;
      for (const f of POLYGONS.features) {
        const el = document.createElement("div");
        el.className = "polylabel"; el.textContent = f.properties.name;
        new window.maplibregl.Marker({ element: el }).setLngLat(labelPoint(f)).addTo(m);
      }
      paint();
    });
    // Tile / glyph / source errors only mean part of the basemap is missing; the polygons
    // still draw. Switch to the fallback map only if the engine itself never starts.
    m.on("error", (e) => {
      const msg = e?.error?.message || String(e?.error || "");
      if (e?.sourceId || e?.tile || /tile|fetch|network|load|glyph|sprite|4\d\d|5\d\d|Failed/i.test(msg)) { if (e?.sourceId === "omt" || /openfreemap/i.test(msg)) tilesFailed(); return; }
      if (!loaded.current) { setMapError("Map engine error: " + msg); setFallback(true); }
    });
    const guard = setTimeout(() => { if (!loaded.current) { setMapError("Map engine did not start in time"); setFallback(true); } }, 10000);
    m.on("click", "poly-fill", (e) => {
      const { editingId, onTogglePolygon } = latest.current;
      if (editingId && onTogglePolygon && e.features[0]) onTogglePolygon(e.features[0].id);
    });
    m.on("mouseenter", "poly-fill", () => { if (latest.current.editingId) m.getCanvas().style.cursor = "pointer"; });
    m.on("mouseleave", "poly-fill", () => { m.getCanvas().style.cursor = ""; });
    map.current = m;
    return () => { clearTimeout(guard); try { m.remove(); } catch {} map.current = null; ready.current = false; };
  }, [fallback]);

  const markers = useRef([]);
  function paint() {
    const m = map.current;
    if (!m || !ready.current) return;
    const { forecasts, selectedId, editingId } = latest.current;
    // One danger marker per forecast, at the centre of its polygons.
    markers.current.forEach((mk) => mk.remove());
    markers.current = forecasts.filter((f) => f.polygons.length).map((f) => {
      const at = groupCentre(f.polygons); if (!at) return null;
      const el = document.createElement("div");
      el.className = "fcmarker"; el.title = f.name || "Untitled"; el.innerHTML = forecastMarkerSvg(f.cards?.[1]?.danger);
      return new window.maplibregl.Marker({ element: el }).setLngLat(at).addTo(m);
    }).filter(Boolean);
    const byPoly = {};
    for (const f of forecasts) for (const p of f.polygons) byPoly[p] = f;
    for (const id of POLYGON_IDS) {
      const f = byPoly[id];
      if (!f) { m.setFeatureState({ source: "polys", id }, { color: GREY.hex, opacity: GREY.opacity, line: GREY.line }); continue; }
      const c = colourOf(f);
      const focus = !selectedId && !editingId ? true : f.id === selectedId || f.id === editingId;
      m.setFeatureState({ source: "polys", id }, { color: c.hex, opacity: focus ? 0.62 : 0.3, line: shade(c.hex) });
    }
  }
  useEffect(paint, [forecasts, selectedId, editingId]);

  // Leaving setup mode turns the lasso off.
  useEffect(() => { if (!editingId) setLasso(false); }, [editingId]);
  useEffect(() => {
    const m = map.current; if (!m) return;
    if (lasso) { m.dragPan.disable(); m.getCanvas().style.cursor = "crosshair"; } else { m.dragPan.enable(); m.getCanvas().style.cursor = ""; }
  }, [lasso]);

  const pt = (e) => { const r = el.current.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const onDown = (e) => { if (!lasso || e.button !== 0) return; e.preventDefault(); drawing.current = { pts: [pt(e)], remove: e.shiftKey }; setPath([pt(e)]); e.currentTarget.setPointerCapture?.(e.pointerId); };
  const onMove = (e) => { if (!drawing.current) return; drawing.current.pts.push(pt(e)); setPath([...drawing.current.pts]); };
  const onUp = (e) => {
    const d = drawing.current; drawing.current = null; setPath(null);
    if (!d || d.pts.length < 3) return;
    const m = map.current; const hit = [];
    for (const f of POLYGONS.features) {
      const c = m.project(labelPoint(f));
      const inside = pointInPoly([c.x, c.y], d.pts) || outerRings(f).some((ring) => ring.some((ll) => { const q = m.project(ll); return pointInPoly([q.x, q.y], d.pts); }));
      if (inside) hit.push(f.id);
    }
    if (hit.length) latest.current.onLasso?.(hit, d.remove || e.shiftKey);
  };

  return (
    <div className="mapwrap">
      {fallback ? (
        <SvgMap forecasts={forecasts} selectedId={selectedId} editingId={editingId} onTogglePolygon={onTogglePolygon} onLasso={onLasso} lasso={lasso} />
      ) : (
        <div ref={el} className="map" />
      )}
      {mapError && <div className="tilenote" style={{ top: 60, bottom: "auto", left: 10, right: "auto" }} title={mapError}>Basic map mode</div>}
      {banner && (
        <div className="mapbanner" style={{ background: banner.hex, color: banner.text }}>
          <b>{banner.name}</b>
          <span>Expires {banner.expiry}</span><span>Issued {banner.issued}</span><span>({banner.modified})</span>
        </div>
      )}
      {editingId && <button className={"lassobtn" + (lasso ? " on" : "")} title={lasso ? "Lasso on — drag around polygons to add, hold Shift to remove. Click to turn off." : "Lasso select"} aria-pressed={lasso} onClick={() => setLasso(!lasso)}>{Icons.lasso}</button>}
      {lasso && !fallback && <div className="lassolayer" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        {path && <svg className="lassosvg"><polygon points={path.map((p) => p.join(",")).join(" ")} /></svg>}
        <div className="lassohint">Drag to select polygons · hold Shift to remove</div>
      </div>}
      <div className={"unassigned " + (unassigned ? "warn" : "ok")}>Unassigned polygons: {unassigned}</div>
      {noTiles && <div className="tilenote">Some basemap layers (roads, labels) couldn't load; terrain and polygons are unaffected.</div>}
    </div>
  );
}

function shade(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, (n >> 16) - 45), g = Math.max(0, ((n >> 8) & 255) - 45), b = Math.max(0, (n & 255) - 45);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

// Ray-casting point-in-polygon on screen coordinates.
function pointInPoly([x, y], poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
