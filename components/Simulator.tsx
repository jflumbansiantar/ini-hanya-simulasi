"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { CORRIDORS } from "@/lib/corridors";
import { CORRIDOR_META } from "@/lib/corridorMeta";
import { getActiveTrips, type Trip } from "@/lib/simulation";
import { useSimulationClock } from "@/lib/useSimulationClock";
import Badge from "./Badge";
import ControlPanel from "./ControlPanel";
import OnboardingModal from "./OnboardingModal";

// MapView memuat Leaflet yang butuh `window` — dynamic-import tanpa SSR
// harus dilakukan dari dalam Client Component, bukan Server Component.
const MapView = dynamic(() => import("./MapView"), { ssr: false });

const ONBOARD_KEY = "tj-sim-onboarded";
const MOBILE_QUERY = "(max-width: 768px)";

export default function Simulator() {
  const { simMinutes, speedIndex, setSpeedIndex } = useSimulationClock();

  const [visibility, setVisibility] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(CORRIDORS.map((c) => [c.id, c.defaultVisible]))
  );

  // Komponen ini hanya pernah dirender di client (dynamic ssr:false di
  // page.tsx), jadi akses localStorage/window di initializer aman.
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try {
      return localStorage.getItem(ONBOARD_KEY) !== "1";
    } catch {
      return true;
    }
  });
  const [collapsed, setCollapsed] = useState(() => window.matchMedia(MOBILE_QUERY).matches);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) setCollapsed(true);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const dismissOnboarding = useCallback(() => {
    setShowOnboarding(false);
    try {
      localStorage.setItem(ONBOARD_KEY, "1");
    } catch {
      // localStorage tak tersedia (mode privat dsb.) — abaikan, modal tetap tertutup untuk sesi ini
    }
  }, []);

  const toggleCorridor = useCallback((id: string, visible: boolean) => {
    setVisibility((prev) => ({ ...prev, [id]: visible }));
  }, []);

  const setAllCorridors = useCallback((visible: boolean) => {
    setVisibility(Object.fromEntries(CORRIDORS.map((c) => [c.id, visible])));
  }, []);

  const trips = useMemo<Trip[]>(() => {
    const result: Trip[] = [];
    for (const c of CORRIDORS) {
      if (!visibility[c.id]) continue;
      result.push(...getActiveTrips(c, CORRIDOR_META[c.id], simMinutes));
    }
    return result;
  }, [simMinutes, visibility]);

  const corridorsOperating = useMemo(() => new Set(trips.map((t) => t.corridorId)).size, [trips]);

  return (
    <div className="mapRoot">
      <MapView visibility={visibility} trips={trips} />
      <Badge />
      <ControlPanel
        simMinutes={simMinutes}
        speedIndex={speedIndex}
        onSpeedChange={setSpeedIndex}
        busCount={trips.length}
        corridorsOperating={corridorsOperating}
        visibility={visibility}
        onToggleCorridor={toggleCorridor}
        onSetAll={setAllCorridors}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((v) => !v)}
      />
      {showOnboarding && <OnboardingModal onDismiss={dismissOnboarding} />}
    </div>
  );
}
