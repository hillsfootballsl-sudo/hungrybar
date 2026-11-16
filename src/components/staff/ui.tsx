"use client";
import { useCallback, useEffect, useState } from "react";

export function Modal({ open, onClose, title, children, wide, dark }: { open: boolean; onClose: () => void; title?: React.ReactNode; children: React.ReactNode; wide?: boolean; dark?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-char/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        className={`max-h-[94vh] w-full overflow-y-auto rounded-t-2xl p-5 shadow-2xl sm:rounded-2xl ${wide ? "max-w-5xl" : "max-w-lg"} ${dark ? "bg-char text-cream" : "bg-white text-char"}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        {title && (
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-condensed text-2xl uppercase">{title}</h2>
            <button onClick={onClose} className="rounded-full p-2 text-xl leading-none hover:bg-black/5" aria-label="Close">✕</button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export type ToastT = { id: number; msg: string; bad?: boolean };
export function useToasts() {
  const [toasts, setToasts] = useState<ToastT[]>([]);
  const toast = useCallback((msg: string, bad?: boolean) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, bad }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), bad ? 6000 : 3000);
  }, []);
  const view = (
    <div className="pointer-events-none fixed left-1/2 top-4 z-[100] flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((t) => (
        <div key={t.id} className={`animate-drop rounded-xl px-4 py-3 text-sm font-bold shadow-xl ${t.bad ? "bg-tomato text-white" : "bg-char text-cream"}`}>{t.msg}</div>
      ))}
    </div>
  );
  return { toast, view };
}

/** Big numeric keypad used for cash, opening float and manager PINs */
export function Keypad({ value, onChange, masked, max = 9 }: { value: string; onChange: (v: string) => void; masked?: boolean; max?: number }) {
  return (
    <div>
      <div className="mb-3 rounded-xl bg-cream-100 p-3 text-right font-display text-3xl tracking-wider">{masked ? "•".repeat(value.length) || "—" : value || "0"}</div>
      <div className="grid grid-cols-3 gap-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0", "⌫"].map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => onChange(k === "⌫" ? value.slice(0, -1) : (value + k).replace(/^0+(?=\d)/, "").slice(0, max))}
            className="h-14 rounded-xl bg-char-50 font-display text-xl hover:bg-char-100 active:scale-95"
          >
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}

let audioCtx: AudioContext | null = null;
export function beep(times = 2) {
  try {
    audioCtx ??= new AudioContext();
    const ctx = audioCtx;
    for (let i = 0; i < times; i++) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "square";
      o.frequency.value = i % 2 ? 660 : 880;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.25);
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + i * 0.25 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.25 + 0.2);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.25);
      o.stop(ctx.currentTime + i * 0.25 + 0.22);
    }
  } catch {}
}

export function useInterval(fn: () => void, ms: number) {
  useEffect(() => {
    fn();
    const t = setInterval(fn, ms);
    return () => clearInterval(t);
  }, [fn, ms]);
}

export function elapsed(iso: string, now: number) {
  const m = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
}
