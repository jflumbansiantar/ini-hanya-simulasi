"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Fragment, useMemo } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Marker, Popup, ZoomControl } from "react-leaflet";
import { CORRIDORS } from "@/lib/corridors";
import type { Trip } from "@/lib/simulation";
import { directionLabel } from "@/lib/simulation";

interface MapViewProps {
  visibility: Record<string, boolean>;
  trips: Trip[];
}

const corridorById = new Map(CORRIDORS.map((c) => [c.id, c]));

const busIconCache = new Map<string, L.DivIcon>();
function busIcon(color: string): L.DivIcon {
  let icon = busIconCache.get(color);
  if (!icon) {
    icon = L.divIcon({
      className: "",
      html: `<div class="bus-dot" style="background:${color}"></div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6],
    });
    busIconCache.set(color, icon);
  }
  return icon;
}

export default function MapView({ visibility, trips }: MapViewProps) {
  const visibleCorridors = useMemo(() => CORRIDORS.filter((c) => visibility[c.id]), [visibility]);

  return (
    <MapContainer
      className="mapEl"
      center={[-6.235, 106.845]}
      zoom={10}
      minZoom={9}
      maxZoom={17}
      zoomControl={false}
      maxBounds={[
        [-6.55, 106.45],
        [-5.95, 107.15],
      ]}
    >
      <ZoomControl position="bottomleft" />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
      />

      {visibleCorridors.map((c) => (
        <Fragment key={c.id}>
          <Polyline
            positions={c.stops.map((s) => [s.lat, s.lng])}
            pathOptions={{ color: c.color, weight: 3, opacity: 0.55 }}
          />
          {c.stops.map((s, i) => (
            <CircleMarker
              key={i}
              center={[s.lat, s.lng]}
              radius={3}
              pathOptions={{ color: c.color, weight: 1, fillColor: c.color, fillOpacity: 0.9 }}
            />
          ))}
        </Fragment>
      ))}

      {trips.map((trip) => {
        const corridor = corridorById.get(trip.corridorId)!;
        return (
          <Marker key={trip.id} position={[trip.lat, trip.lng]} icon={busIcon(corridor.color)}>
            <Popup>
              <div className="tjPopup">
                <div className="corridorLine" style={{ color: corridor.color }}>
                  {corridor.name} — {corridor.route}
                </div>
                <div className="dirLine">Arah: {directionLabel(corridor, trip.direction)}</div>
                <div>
                  Antara Halte <b>{trip.fromStop}</b> – <b>{trip.toStop}</b>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
