import { Router } from "express";
import { stationsGeoJSON } from "../data/stations.js";
import { COVERED_LINKWAYS } from "../data/sheltered.js";

export const stationsRouter = Router();

stationsRouter.get("/geojson", (_req, res) => {
  res.json(stationsGeoJSON());
});

stationsRouter.get("/covered-linkways", (_req, res) => {
  res.json({
    type: "FeatureCollection",
    features: COVERED_LINKWAYS.map((c) => ({
      type: "Feature",
      properties: { label: c.label, id: c.id },
      geometry: { type: "LineString", coordinates: c.path.map((p) => [p.lng, p.lat]) },
    })),
  });
});
