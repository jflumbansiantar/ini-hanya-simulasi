import { formatClock } from "@/lib/simulation";

export { formatClock };

export function rupiah(n: number): string {
  return `Rp${n.toLocaleString("id-ID")}`;
}

export function minutes(n: number): string {
  const m = Math.max(0, Math.round(n));
  if (m < 60) return `${m} mnt`;
  return `${Math.floor(m / 60)} j ${m % 60} mnt`;
}
