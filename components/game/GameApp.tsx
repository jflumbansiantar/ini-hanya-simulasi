"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { controller } from "@/lib/game/controller";
import Briefing from "./Briefing";
import Hud from "./Hud";
import LivePanel from "./LivePanel";
import MissionMenu from "./MissionMenu";
import PlanPanel from "./PlanPanel";
import ResultPanel from "./ResultPanel";

export default function GameApp() {
  useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    controller.init();
    let cancelled = false;
    let game: { destroy: (removeCanvas: boolean) => void } | null = null;
    // Phaser butuh `window` — dimuat hanya di browser
    import("./phaserGame").then(({ createGame }) => {
      if (!cancelled && mapRef.current) game = createGame(mapRef.current, controller);
    });
    return () => {
      cancelled = true;
      game?.destroy(true);
    };
  }, []);

  const c = controller;
  const phase = c.phase;
  return (
    <div className="gameRoot">
      <div ref={mapRef} className="mapEl" />
      {phase === "menu" && <MissionMenu />}
      {phase === "briefing" && <Briefing />}
      {(phase === "planning" || phase === "playing" || phase === "result") && <Hud />}
      {phase === "planning" && <PlanPanel />}
      {phase === "playing" && <LivePanel />}
      {phase === "result" && <ResultPanel key={c.mission?.id} />}
      {c.message && (
        <div key={c.message.seq} className={`toast${c.message.text.startsWith("⚠️") ? " alert" : ""}`}>
          {c.message.text}
        </div>
      )}
      <div className="attrib">
        Peta: batas kecamatan Kemendagri 2020 · jalan ©{" "}
        <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>
      </div>
    </div>
  );
}
