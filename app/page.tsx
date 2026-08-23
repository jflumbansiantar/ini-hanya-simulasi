"use client";

import dynamic from "next/dynamic";

// Simulator merender peta Leaflet (butuh `window`) — harus client-only,
// dan ssr:false hanya diizinkan Next.js di dalam Client Component.
const Simulator = dynamic(() => import("@/components/Simulator"), { ssr: false });

export default function Home() {
  return <Simulator />;
}
