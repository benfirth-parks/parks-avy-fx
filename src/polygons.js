// Approximate forecast polygons for the Banff / Yoho / Kootenay (BYK) region.
// PLACEHOLDER GEOMETRY — hand-drafted to match the shape of the AVID map.
// Replace `coordinates` with the real Parks Canada forecast polygons (GeoJSON, WGS84).
export const POLYGONS = {
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

export const POLYGON_IDS = POLYGONS.features.map((f) => f.id);
export const POLYGON_NAME = Object.fromEntries(POLYGONS.features.map((f) => [f.id, f.properties.name]));
