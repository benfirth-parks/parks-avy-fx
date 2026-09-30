import React, { useEffect, useRef, useState } from "react";
import { POLYGONS, POLYGON_IDS } from "./polygons.js";
import { colourOf } from "./store.js";
import { Icons } from "./icons.jsx";

const GREY = { hex: "#5c5a7a", opacity: 0.42, line: "#6e5db0" };

// Keyless raster basemap. OpenTopoMap is the closest free match to the terrain
// look of the current tool; swap `tiles` for Mapbox/MapTiler outdoors if a key is available.
const STYLE = {
  version: 8,
  sources: {
    topo: {
      type: "raster",
      tiles: ["https://a.tile.opentopomap.org/{z}/{x}/{y}.png", "https://b.tile.opentopomap.org/{z}/{x}/{y}.png", "https://c.tile.opentopomap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenTopoMap (CC-BY-SA) © OpenStreetMap contributors",
    },
    polys: { type: "geojson", data: POLYGONS, promoteId: "id" },
  },
  layers: [
    { id: "ground", type: "background", paint: { "background-color": "#dfe9b8" } },
    { id: "topo", type: "raster", source: "topo", paint: { "raster-saturation": -0.15, "raster-opacity": 0.9 } },
    { id: "poly-fill", type: "fill", source: "polys", paint: { "fill-color": ["coalesce", ["feature-state", "color"], GREY.hex], "fill-opacity": ["coalesce", ["feature-state", "opacity"], GREY.opacity] } },
    { id: "poly-line", type: "line", source: "polys", paint: { "line-color": ["coalesce", ["feature-state", "line"], GREY.line], "line-width": 1.6 } },
  ],
};

// Polygon labels as HTML markers (no glyph fetch needed, so they work offline too).
function centroid(ring) {
  let x = 0, y = 0, n = ring.length - 1;
  for (let i = 0; i < n; i++) { x += ring[i][0]; y += ring[i][1]; }
  return [x / n, y / n];
}

export function MapView({ forecasts, selectedId, editingId, onTogglePolygon, banner, unassigned }) {
  const el = useRef(null), map = useRef(null), ready = useRef(false);
  const latest = useRef({ forecasts, selectedId, editingId, onTogglePolygon });
  const [noTiles, setNoTiles] = useState(false);
  const tilesFailed = () => setNoTiles(true);
  latest.current = { forecasts, selectedId, editingId, onTogglePolygon };

  useEffect(() => {
    if (!window.maplibregl || !el.current) return;
    const m = new window.maplibregl.Map({ container: el.current, style: STYLE, center: [-116.05, 51.45], zoom: 7.4, attributionControl: false });
    m.addControl(new window.maplibregl.AttributionControl({ compact: true }), "bottom-left");
    m.on("load", () => {
      ready.current = true;
      for (const f of POLYGONS.features) {
        const el = document.createElement("div");
        el.className = "polylabel"; el.textContent = f.properties.name;
        new window.maplibregl.Marker({ element: el }).setLngLat(centroid(f.geometry.coordinates[0])).addTo(m);
      }
      paint();
    });
    m.on("error", (e) => { if (e?.error?.message?.includes("tile")) tilesFailed(); });
    m.on("click", "poly-fill", (e) => {
      const { editingId, onTogglePolygon } = latest.current;
      if (editingId && onTogglePolygon && e.features[0]) onTogglePolygon(e.features[0].id);
    });
    m.on("mouseenter", "poly-fill", () => { if (latest.current.editingId) m.getCanvas().style.cursor = "pointer"; });
    m.on("mouseleave", "poly-fill", () => { m.getCanvas().style.cursor = ""; });
    map.current = m;
    return () => { m.remove(); map.current = null; ready.current = false; };
  }, []);

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

  return (
    <div className="mapwrap">
      <div ref={el} className="map" />
      {banner && (
        <div className="mapbanner" style={{ background: banner.hex, color: banner.text }}>
          <b>{banner.name}</b>
          <span>Expires {banner.expiry}</span><span>Issued {banner.issued}</span><span>({banner.modified})</span>
        </div>
      )}
      {editingId && <button className="lassobtn" title="Lasso select (coming soon)">{Icons.lasso}</button>}
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
