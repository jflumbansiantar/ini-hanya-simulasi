"use client";

import dynamic from "next/dynamic";

// Game memakai Phaser + localStorage (butuh `window`) — harus client-only,
// dan ssr:false hanya diizinkan Next.js di dalam Client Component.
const GameApp = dynamic(() => import("@/components/game/GameApp"), { ssr: false });

export default function Home() {
  return <GameApp />;
}
