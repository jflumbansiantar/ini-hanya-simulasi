"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const SPEED_OPTIONS = [30, 120, 600, 3000] as const; // sim-menit per real-detik

interface ClockState {
  simMinutes: number;
  speedIndex: number;
  setSpeedIndex: (index: number) => void;
}

/**
 * Jam simulasi digerakkan oleh requestAnimationFrame — simMinutes selalu
 * diturunkan dari (realElapsed, speed), bukan diakumulasi/di-mutate.
 * Mulai dari jam 07:30 supaya peta selalu terlihat "hidup" begitu dibuka.
 */
export function useSimulationClock(): ClockState {
  const [simMinutes, setSimMinutes] = useState(450);
  const [speedIndex, setSpeedIndexState] = useState(1);

  const baseRef = useRef(450);
  const realStartRef = useRef<number>(0);
  const speedRef = useRef<(typeof SPEED_OPTIONS)[number]>(SPEED_OPTIONS[1]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    realStartRef.current = performance.now();

    const tick = () => {
      const elapsedRealSec = (performance.now() - realStartRef.current) / 1000;
      const next = (baseRef.current + elapsedRealSec * (speedRef.current / 60)) % 1440;
      setSimMinutes(next);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const setSpeedIndex = useCallback((index: number) => {
    baseRef.current =
      (baseRef.current + ((performance.now() - realStartRef.current) / 1000) * (speedRef.current / 60)) % 1440;
    realStartRef.current = performance.now();
    speedRef.current = SPEED_OPTIONS[index];
    setSpeedIndexState(index);
  }, []);

  return { simMinutes, speedIndex, setSpeedIndex };
}
