"use client";

import { useState } from "react";
import { ALL_STOPS, findRoute, isKnownStop, type RouteResult } from "@/lib/routeFinder";
import { directionLabel } from "@/lib/simulation";
import { CORRIDORS } from "@/lib/corridors";

interface RouteFinderProps {
  onRouteChange: (result: RouteResult | null) => void;
}

const corridorById = new Map(CORRIDORS.map((c) => [c.id, c]));

type SearchState = "idle" | "invalid" | "same" | "not-found" | "found";

export default function RouteFinder({ onRouteChange }: RouteFinderProps) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [result, setResult] = useState<RouteResult | null>(null);
  const [state, setState] = useState<SearchState>("idle");

  const close = () => {
    setOpen(false);
    setResult(null);
    setState("idle");
    onRouteChange(null);
  };

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const a = from.trim();
    const b = to.trim();
    if (!a || !b || !isKnownStop(a) || !isKnownStop(b)) {
      setResult(null);
      setState("invalid");
      onRouteChange(null);
      return;
    }
    const r = findRoute(a, b);
    if (!r) {
      setResult(null);
      setState("not-found");
      onRouteChange(null);
      return;
    }
    setResult(r);
    setState(r.steps.length === 0 ? "same" : "found");
    onRouteChange(r);
  };

  return (
    <div className="routeFinder">
      <button
        type="button"
        className="routeFinderToggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        🔎 Cari Rute
      </button>
      {open && (
        <div className="routeFinderCard">
          <div className="routeFinderHead">
            <span>Cari Rute Halte</span>
            <button type="button" className="routeFinderClose" onClick={close} aria-label="Tutup">
              ✕
            </button>
          </div>
          <form onSubmit={submit} className="routeFinderForm">
            <label className="routeFinderField">
              <span>Dari halte</span>
              <input
                list="tj-stop-options"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                placeholder="mis. Blok M"
                autoComplete="off"
              />
            </label>
            <button
              type="button"
              className="routeFinderSwap"
              onClick={swap}
              aria-label="Tukar asal dan tujuan"
              title="Tukar asal dan tujuan"
            >
              ⇅
            </button>
            <label className="routeFinderField">
              <span>Ke halte</span>
              <input
                list="tj-stop-options"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="mis. Kota"
                autoComplete="off"
              />
            </label>
            <datalist id="tj-stop-options">
              {ALL_STOPS.map((s) => (
                <option key={s.name} value={s.name} />
              ))}
            </datalist>
            <button type="submit" className="routeFinderSubmit">
              Cari Rute
            </button>
          </form>

          {state === "invalid" && (
            <div className="routeFinderMsg">
              Isi kedua halte dengan nama yang valid (pilih dari daftar saran ketikan).
            </div>
          )}
          {state === "not-found" && (
            <div className="routeFinderMsg">Rute tidak ditemukan antara kedua halte ini.</div>
          )}
          {state === "same" && (
            <div className="routeFinderMsg">Halte asal dan tujuan sama — tidak perlu naik bus.</div>
          )}
          {state === "found" && result && (
            <div className="routeFinderResult">
              <div className="routeFinderSummary">
                <b>{result.totalKm.toFixed(1)} km</b> · ~{Math.round(result.totalMin)} menit ·{" "}
                {result.transfers === 0 ? "langsung, tanpa transfer" : `${result.transfers}x transfer`}
              </div>
              <ol className="routeFinderSteps">
                {result.steps.map((step, i) => {
                  const corridor = corridorById.get(step.corridorId)!;
                  return (
                    <li key={i}>
                      <div className="routeFinderStepHead">
                        <span className="routeFinderSwatch" style={{ background: step.corridorColor }} />
                        <span className="routeFinderCorridorName">
                          {step.corridorName} · {step.corridorRoute}
                        </span>
                      </div>
                      <div className="routeFinderStepBody">
                        Naik di <b>{step.boardStop}</b>, turun di <b>{step.alightStop}</b>
                        <div className="routeFinderStepMeta">
                          arah {directionLabel(corridor, step.direction)} · {step.distanceKm.toFixed(1)} km ·
                          {" "}~{Math.round(step.durationMin)} menit
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
