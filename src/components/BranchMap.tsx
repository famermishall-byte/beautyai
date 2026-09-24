"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap, Marker, LayerGroup } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Branch } from "@/types";

type Coords = { latitude: number; longitude: number };

// The pin lives in the page DOM, so it reads the palette straight from the design tokens.
const PIN = (active: boolean) => `
  <svg width="${active ? 44 : 36}" height="${active ? 54 : 44}" viewBox="0 0 36 44" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 3px 4px var(--scrim))">
    <path d="M18 43C18 43 33 28.5 33 17.5C33 9 26.3 2 18 2C9.7 2 3 9 3 17.5C3 28.5 18 43 18 43Z" style="fill: var(${active ? "--accent-strong" : "--accent"}); stroke: var(--on-accent)" stroke-width="2.5"/>
    <circle cx="18" cy="17.5" r="6" style="fill: var(--on-accent)"/>
  </svg>`;

// Leaflet vector layers take literal colors, so resolve the token at runtime.
function tokenColor(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

export function BranchMap({
  branches,
  selectedId,
  onSelect,
  userPosition,
}: {
  branches: Branch[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  userPosition: Coords | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  });

  const located = branches.filter((b) => b.latitude !== null && b.longitude !== null);
  const locatedKey = located.map((b) => `${b.id}:${b.latitude}:${b.longitude}`).join("|");
  const userKey = userPosition ? `${userPosition.latitude},${userPosition.longitude}` : "";

  // Build the map and its markers whenever the set of located branches changes.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;
      leafletRef.current = L;

      const map = L.map(containerRef.current, { zoomControl: false, attributionControl: true });
      mapRef.current = map;
      L.control.zoom({ position: "bottomright" }).addTo(map);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      const layer = L.layerGroup().addTo(map);
      layerRef.current = layer;
      markersRef.current = new Map();

      const points: [number, number][] = [];
      for (const b of located) {
        const pos: [number, number] = [b.latitude as number, b.longitude as number];
        points.push(pos);
        const marker = L.marker(pos, {
          icon: L.divIcon({ html: PIN(false), className: "", iconSize: [36, 44], iconAnchor: [18, 44] }),
          title: b.name,
        }).addTo(layer);
        marker.on("click", () => onSelectRef.current(b.id));
        markersRef.current.set(b.id, marker);
      }

      if (userPosition) {
        const u: [number, number] = [userPosition.latitude, userPosition.longitude];
        L.circleMarker(u, { radius: 8, color: tokenColor("--accent", "#c8135f"), weight: 3, fillColor: tokenColor("--on-accent", "#fff"), fillOpacity: 1 }).addTo(layer);
        points.push(u);
      }

      if (points.length === 0) map.setView([42.8746, 74.5698], 11);
      else if (points.length === 1) map.setView(points[0], 15);
      else map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 15 });
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
      markersRef.current = new Map();
    };
    // located/userPosition are read through the keys above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locatedKey, userKey]);

  // Highlight the selected branch's pin and move to it.
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    markersRef.current.forEach((marker, id) => {
      const active = id === selectedId;
      marker.setIcon(
        L.divIcon({
          html: PIN(active),
          className: "",
          iconSize: active ? [44, 54] : [36, 44],
          iconAnchor: active ? [22, 54] : [18, 44],
        })
      );
      marker.setZIndexOffset(active ? 1000 : 0);
    });
    const selected = selectedId ? markersRef.current.get(selectedId) : null;
    if (selected) map.flyTo(selected.getLatLng(), Math.max(map.getZoom(), 15), { duration: 0.6 });
  }, [selectedId, locatedKey]);

  return <div ref={containerRef} className="isolate h-72 w-full rounded-card overflow-hidden border border-border bg-accent-soft" />;
}
