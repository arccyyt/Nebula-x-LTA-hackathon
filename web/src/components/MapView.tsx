import { useEffect, useRef } from "react";
import maplibregl, { Map as MLMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { ItineraryLeg, LatLng } from "../types";

interface Props {
  legs: ItineraryLeg[];
  altLegs?: ItineraryLeg[];
  originPos: LatLng;
  destPos: LatLng;
  stationsGeoJSON?: GeoJSON.FeatureCollection;
  coveredLinkways?: GeoJSON.FeatureCollection;
}

function legsToGeoJSON(legs: ItineraryLeg[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: legs
      .filter((l) => l.path.length > 1)
      .map((l) => ({
        type: "Feature",
        properties: { color: l.color, status: l.status, dashed: l.status === "sheltered" || l.status === "exposed" },
        geometry: { type: "LineString", coordinates: l.path.map((p) => [p.lng, p.lat]) },
      })),
  };
}

export default function MapView({ legs, altLegs, originPos, destPos, stationsGeoJSON, coveredLinkways }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const readyRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      attributionControl: false,
      style: {
        version: 8,
        sources: {
          basemap: {
            type: "raster",
            tiles: ["https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors © CARTO",
          },
        },
        layers: [{ id: "basemap", type: "raster", source: "basemap" }],
      },
      center: [originPos.lng, originPos.lat],
      zoom: 12,
    });
    mapRef.current = map;

    map.on("load", () => {
      map.addSource("route", { type: "geojson", data: legsToGeoJSON(legs) });
      map.addSource("altRoute", { type: "geojson", data: legsToGeoJSON(altLegs ?? []) });
      map.addSource("stations", { type: "geojson", data: stationsGeoJSON ?? { type: "FeatureCollection", features: [] } });
      map.addSource("covered", { type: "geojson", data: coveredLinkways ?? { type: "FeatureCollection", features: [] } });

      map.addLayer({ id: "covered-line", type: "line", source: "covered", paint: { "line-color": "#2563EB", "line-width": 3, "line-opacity": 0.35, "line-dasharray": [1, 1.5] } });
      map.addLayer({
        id: "alt-route-line",
        type: "line",
        source: "altRoute",
        paint: { "line-color": ["get", "color"], "line-width": 4, "line-opacity": 0.55, "line-dasharray": [2, 1.5] },
      });
      map.addLayer({
        id: "route-line-solid",
        type: "line",
        source: "route",
        filter: ["!=", ["get", "dashed"], true],
        paint: { "line-color": ["get", "color"], "line-width": 6 },
      });
      map.addLayer({
        id: "route-line-dashed",
        type: "line",
        source: "route",
        filter: ["==", ["get", "dashed"], true],
        paint: { "line-color": ["get", "color"], "line-width": 6, "line-dasharray": [1, 1] },
      });
      map.addLayer({
        id: "station-points",
        type: "circle",
        source: "stations",
        paint: {
          "circle-radius": ["case", ["get", "isInterchange"], 5, 3],
          "circle-color": "#ffffff",
          "circle-stroke-color": "#333333",
          "circle-stroke-width": 1.5,
        },
      });

      new maplibregl.Marker({ color: "#0B5FFF" }).setLngLat([originPos.lng, originPos.lat]).addTo(map);
      new maplibregl.Marker({ color: "#E11D2E" }).setLngLat([destPos.lng, destPos.lat]).addTo(map);

      readyRef.current = true;
      fitToLegs(map, legs, originPos, destPos);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      readyRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    (map.getSource("route") as maplibregl.GeoJSONSource | undefined)?.setData(legsToGeoJSON(legs));
    (map.getSource("altRoute") as maplibregl.GeoJSONSource | undefined)?.setData(legsToGeoJSON(altLegs ?? []));
    fitToLegs(map, legs, originPos, destPos);
  }, [legs, altLegs, originPos, destPos]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    (map.getSource("stations") as maplibregl.GeoJSONSource | undefined)?.setData(stationsGeoJSON ?? { type: "FeatureCollection", features: [] });
    (map.getSource("covered") as maplibregl.GeoJSONSource | undefined)?.setData(coveredLinkways ?? { type: "FeatureCollection", features: [] });
  }, [stationsGeoJSON, coveredLinkways]);

  return (
    <div className="map-wrap">
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      <div className="map-attribution-note">© OpenStreetMap contributors © CARTO</div>
    </div>
  );
}

function fitToLegs(map: MLMap, legs: ItineraryLeg[], originPos: LatLng, destPos: LatLng) {
  const bounds = new maplibregl.LngLatBounds([originPos.lng, originPos.lat], [originPos.lng, originPos.lat]);
  bounds.extend([destPos.lng, destPos.lat]);
  legs.forEach((l) => l.path.forEach((p) => bounds.extend([p.lng, p.lat])));
  map.fitBounds(bounds, { padding: 48, maxZoom: 15, duration: 400 });
}
