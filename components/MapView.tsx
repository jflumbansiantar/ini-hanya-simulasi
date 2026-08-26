"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Fragment, useMemo } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Marker, Popup, Tooltip, ZoomControl } from "react-leaflet";
import { CORRIDORS } from "@/lib/corridors";
import { CORRIDOR_PATHS } from "@/lib/corridorPaths";
import type { Trip } from "@/lib/simulation";
import { directionLabel } from "@/lib/simulation";
import type { RouteResult } from "@/lib/routeFinder";

interface MapViewProps {
  visibility: Record<string, boolean>;
  trips: Trip[];
  route?: RouteResult | null;
}

const corridorById = new Map(CORRIDORS.map((c) => [c.id, c]));

const busIconCache = new Map<string, L.DivIcon>();
function busIcon(color: string): L.DivIcon {
  let icon = busIconCache.get(color);
  if (!icon) {
    icon = L.divIcon({
      className: "",
      html: `<svg class="bus-icon" width="22" height="22" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="5" width="20" height="12" rx="3" fill="${color}" stroke="#fff" stroke-width="1.5"/>
        <rect x="4.5" y="7.5" width="4" height="4" rx="0.8" fill="#fff" fill-opacity="0.85"/>
        <rect x="10" y="7.5" width="4" height="4" rx="0.8" fill="#fff" fill-opacity="0.85"/>
        <rect x="15.5" y="7.5" width="4" height="4" rx="0.8" fill="#fff" fill-opacity="0.85"/>
        <circle cx="7" cy="18" r="2" fill="#1a1a1a" stroke="#fff" stroke-width="1"/>
        <circle cx="17" cy="18" r="2" fill="#1a1a1a" stroke="#fff" stroke-width="1"/>
      </svg>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });
    busIconCache.set(color, icon);
  }
  return icon;
}

export default function MapView({ visibility, trips, route }: MapViewProps) {
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
            positions={(CORRIDOR_PATHS[c.id]?.forward.points ?? c.stops).map((s) => [s.lat, s.lng])}
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
        const info = (
          <div className="tjPopup">
            <div className="corridorLine" style={{ color: corridor.color }}>
              {corridor.name} — {corridor.route}
            </div>
            <div className="dirLine">Arah: {directionLabel(corridor, trip.direction)}</div>
            <div>
              Antara Halte <b>{trip.fromStop}</b> – <b>{trip.toStop}</b>
            </div>
          </div>
        );
        return (
          <Marker key={trip.id} position={[trip.lat, trip.lng]} icon={busIcon(corridor.color)}>
            <Tooltip direction="top" offset={[0, -10]} opacity={1}>
              {info}
            </Tooltip>
            <Popup>{info}</Popup>
          </Marker>
        );
      })}

      {route && route.steps.length > 0 && (
        <Fragment>
          {route.steps.map((step, i) => (
            <Fragment key={i}>
              <Polyline
                positions={step.path.map((p) => [p.lat, p.lng])}
                pathOptions={{ color: "#ffffff", weight: 8, opacity: 0.45 }}
              />
              <Polyline
                positions={step.path.map((p) => [p.lat, p.lng])}
                pathOptions={{ color: step.corridorColor, weight: 5, opacity: 0.95 }}
              />
            </Fragment>
          ))}
          {route.steps.map((step, i) => (
            <CircleMarker
              key={`board-${i}`}
              center={[step.path[0].lat, step.path[0].lng]}
              radius={7}
              pathOptions={{
                color: "#fff",
                weight: 2,
                fillColor: i === 0 ? "#2ecc71" : "#f9c74f",
                fillOpacity: 1,
              }}
            >
              <Tooltip direction="top" offset={[0, -8]} permanent>
                {i === 0 ? `Naik di ${step.boardStop}` : `Transfer ke ${step.corridorName} di ${step.boardStop}`}
              </Tooltip>
            </CircleMarker>
          ))}
          {(() => {
            const last = route.steps[route.steps.length - 1];
            const p = last.path[last.path.length - 1];
            return (
              <CircleMarker
                center={[p.lat, p.lng]}
                radius={7}
                pathOptions={{ color: "#fff", weight: 2, fillColor: "#e63946", fillOpacity: 1 }}
              >
                <Tooltip direction="top" offset={[0, -8]} permanent>
                  Turun di {last.alightStop}
                </Tooltip>
              </CircleMarker>
            );
          })()}
        </Fragment>
      )}
    </MapContainer>
  );
}
