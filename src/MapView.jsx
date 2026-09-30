import React, { useEffect, useRef, useState } from "react";
import { POLYGONS, POLYGON_IDS, outerRings, labelPoint } from "./polygons.js";
import { colourOf } from "./store.js";
import { Icons } from "./icons.jsx";
import { SvgMap, webglAvailable, polygonBounds } from "./SvgMap.jsx";

const GREY = { hex: "#5c5a7a", opacity: 0.42, line: "#6e5db0" };

// Keyless raster basemap. OpenTopoMap is the closest free match to the terrain
// look of the current tool; swap `tiles` for Mapbox/MapTiler outdoors if a key is available.
const style = () => ({
  version: 8,
  sources: {
    topo: {
      type: "raster",
      tiles: ["https://a.tile.opentopomap.org/{z}/{x}/{y}.png", "https://b.tile.opentopomap.org/{z}/{x}/{y}.png", "https://c.tile.opentopomap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenTopoMap (CC-BY-SA) © OpenStreetMap contributors",
    },
    polys: { type: "geojson", data: { type: "FeatureCollection", features: POLYGONS.features }, promoteId: "id" },
  },
  layers: [
    { id: "ground", type: "background", paint: { "background-color": "#dfe9b8" } },
    { id: "topo", type: "raster", source: "topo", paint: { "raster-saturation": -0.15, "raster-opacity": 0.9 } },
    { id: "poly-fill", type: "fill", source: "polys", paint: { "fill-color": ["coalesce", ["feature-state", "color"], GREY.hex], "fill-opacity": ["coalesce", ["feature-state", "opacity"], GREY.opacity] } },
    { id: "poly-line", type: "line", source: "polys", paint: { "line-color": ["coalesce", ["feature-state", "line"], GREY.line], "line-width": 1.6 } },
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
    m.on("load", () => {
      ready.current = true; loaded.current = true;
      for (const f of POLYGONS.features) {
        const el = document.createElement("div");
        el.className = "polylabel"; el.textContent = f.properties.name;
        new window.maplibregl.Marker({ element: el }).setLngLat(labelPoint(f)).addTo(m);
      }
      paint();
    });
    m.on("error", (e) => {
      const msg = e?.error?.message || String(e?.error || "");
      if (/tile|fetch|network|load/i.test(msg) && loaded.current) { tilesFailed(); return; }
      if (!loaded.current) { setMapError("Map engine error: " + msg); setFallback(true); }
    });
    // If the engine never reports its first load, switch to the fallback map.
    const guard = setTimeout(() => { if (!loaded.current) { setMapError("Map engine did not start in time"); setFallback(true); } }, 5000);
    m.on("click", "poly-fill", (e) => {
      const { editingId, onTogglePolygon } = latest.current;
      if (editingId && onTogglePolygon && e.features[0]) onTogglePolygon(e.features[0].id);
    });
    m.on("mouseenter", "poly-fill", () => { if (latest.current.editingId) m.getCanvas().style.cursor = "pointer"; });
    m.on("mouseleave", "poly-fill", () => { m.getCanvas().style.cursor = ""; });
    map.current = m;
    return () => { clearTimeout(guard); try { m.remove(); } catch {} map.current = null; ready.current = false; };
  }, [fallback]);

  function paint() {
    const m = map.current;
    if (!m || !ready.current) return;
    const { forecasts, selectedId, editingId } = latest.current;
    const byPoly = {};
    for (const f of forecasts) for (const p of f.polygons) byPoly[p] = f;
    for (const id of POLYGON_IDS) {
      const f = byPoly[id];
      if (!f) { m.setFeatureState({ source: "polys", id }, { color: GREY.hex, opacity: GREY.opacity, line: GREY.line }); continue; }
      const c = colourOf(f);
      const focus = !selectedId && !editingId ? true : f.id === selectedId || f.id === editingId;
      m.setFeatureState({ source: "polys", id }, { color: c.hex, opacity: focus ? 0.82 : 0.35, line: shade(c.hex) });
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
      {noTiles && <div className="tilenote">Basemap tiles are blocked in this preview host; terrain loads in the deployed app.</div>}
    </div>
  );
}

function shade(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, (n >> 16) - 60), g = Math.max(0, ((n >> 8) & 255) - 60), b = Math.max(0, (n & 255) - 60);
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
