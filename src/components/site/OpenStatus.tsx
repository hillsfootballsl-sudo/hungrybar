"use client";
import { useEffect, useState } from "react";
import { colomboParts, fmtTime12, isOpenAt } from "@/lib/time";

export interface Hours { cafe: { open: string; close: string; label: string }; pizza: { open: string; close: string; label: string } }

export function useNowMinutes() {
  const [m, setM] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setM(colomboParts().minutes);
    tick();
    const t = setInterval(tick, 30_000);
    return () => clearInterval(t);
  }, []);
  return m;
}

export function OpenStatus({ hours, compact }: { hours: Hours; compact?: boolean }) {
  const m = useNowMinutes();
  if (m == null) return <span className="chip border-char/30 bg-white/60 text-char-400">· · ·</span>;
  const pizza = isOpenAt(hours.pizza.open, hours.pizza.close, m);
  const cafe = isOpenAt(hours.cafe.open, hours.cafe.close, m);
  const label = pizza ? "Oven's on" : cafe ? `Café open · pizza from ${fmtTime12(hours.pizza.open)}` : `Closed · opens ${fmtTime12(hours.cafe.open)}`;
  return (
    <span className={`chip ${pizza ? "bg-basil text-white border-char" : cafe ? "bg-mustard text-char" : "bg-char-100 text-char-500 border-char/40"}`}>
      <span className={`h-2 w-2 rounded-full ${pizza || cafe ? "bg-white animate-pulse" : "bg-char-400"}`} />
      {compact ? (pizza ? "Open" : cafe ? "Café open" : "Closed") : label}
    </span>
  );
}
