"use client";
import Image from "next/image";
import { useState } from "react";

const ROLE_COLOR: Record<string, string> = { OWNER: "bg-tomato", MANAGER: "bg-mustard", CASHIER: "bg-basil", KITCHEN: "bg-char-500", RIDER: "bg-sky-600" };

export function LoginClient({ staff, next, denied }: { staff: { id: string; name: string; role: string }[]; next?: string; denied: boolean }) {
  const [sel, setSel] = useState<string | null>(staff.length === 1 ? staff[0].id : null);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState<string | null>(denied ? "Your role can't open that screen." : null);
  const [busy, setBusy] = useState(false);

  const submit = async (p: string) => {
    if (!sel) return;
    setBusy(true);
    setErr(null);
    const r = await fetch("/api/staff/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ staffId: sel, pin: p }) });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) {
      setErr(j.error);
      setPin("");
      return;
    }
    window.location.href = next && !next.startsWith("//") ? next : j.home;
  };
  const press = (d: string) => {
    if (busy) return;
    const p = (pin + d).slice(0, 6);
    setPin(p);
    if (p.length >= 4 && p.length === 4) void submit(p);
  };

  return (
    <div className="grain flex min-h-screen items-center justify-center bg-char p-4 text-cream">
      <div className="absolute inset-0 sunburst" />
      <div className="relative w-full max-w-3xl">
        <div className="mb-8 flex items-center justify-center gap-3">
          <Image src="/brand/logo.png" alt="" width={72} height={72} />
          <div>
            <p className="h-display text-3xl">Hungry Bar</p>
            <p className="text-sm uppercase tracking-[.3em] text-cream/60">Staff</p>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl bg-white/5 p-5">
            <p className="mb-3 text-sm font-bold uppercase tracking-widest text-cream/60">Who&apos;s this?</p>
            <div className="grid grid-cols-2 gap-3">
              {staff.map((s) => (
                <button key={s.id} onClick={() => { setSel(s.id); setPin(""); setErr(null); }} className={`flex items-center gap-3 rounded-2xl border-2 p-3 text-left transition ${sel === s.id ? "border-tomato bg-tomato/20" : "border-white/10 hover:bg-white/5"}`}>
                  <span className={`grid h-11 w-11 place-items-center rounded-full font-display text-lg text-white ${ROLE_COLOR[s.role] ?? "bg-char-500"}`}>{s.name[0]}</span>
                  <span>
                    <span className="block font-bold">{s.name}</span>
                    <span className="text-xs uppercase tracking-wide text-cream/50">{s.role.toLowerCase()}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-3xl bg-white/5 p-5">
            <p className="mb-3 text-sm font-bold uppercase tracking-widest text-cream/60">PIN</p>
            <div className="mb-4 flex justify-center gap-3">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className={`h-4 w-4 rounded-full border-2 border-cream ${i < pin.length ? "bg-cream" : ""}`} />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "⌫"].map((k) => (
                <button
                  key={k}
                  disabled={!sel || busy}
                  onClick={() => (k === "C" ? setPin("") : k === "⌫" ? setPin((p) => p.slice(0, -1)) : press(k))}
                  className="h-16 rounded-2xl bg-white/10 font-display text-2xl transition hover:bg-white/20 active:scale-95 disabled:opacity-30"
                >
                  {k}
                </button>
              ))}
            </div>
            {err && <p className="mt-4 rounded-lg bg-tomato/20 p-2 text-center text-sm font-bold text-tomato-200">{err}</p>}
            {!sel && <p className="mt-4 text-center text-sm text-cream/50">Pick your name first</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
