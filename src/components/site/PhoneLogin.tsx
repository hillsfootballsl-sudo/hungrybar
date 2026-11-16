"use client";
import { useState } from "react";

export interface Me { id: string; phone: string; name: string | null; stamps: number; addresses: unknown }

export function PhoneLogin({ onDone, compact }: { onDone: (c: Me) => void; compact?: boolean }) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const send = async () => {
    setBusy(true);
    setErr(null);
    const r = await fetch("/api/otp/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone }) });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) return setErr(j.error);
    setSent(j.phone);
    setDevCode(j.devCode ?? null);
  };
  const verify = async () => {
    setBusy(true);
    setErr(null);
    const r = await fetch("/api/otp/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: sent, code }) });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) return setErr(j.error);
    onDone(j.customer);
  };

  return (
    <div className={compact ? "" : "card p-5"}>
      {!sent ? (
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="space-y-3">
          <label className="label" htmlFor="phone">Your mobile number</label>
          <div className="flex gap-2">
            <span className="grid place-items-center rounded-xl border-2 border-char bg-cream-200 px-3 font-bold">🇱🇰 +94</span>
            <input id="phone" className="input" inputMode="tel" autoComplete="tel" placeholder="07X XXX XXXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <button disabled={busy || phone.replace(/\D/g, "").length < 9} className="btn-dark w-full">{busy ? "Sending…" : "Send me a code"}</button>
          <p className="text-xs text-char-400">We&apos;ll text you a 6-digit code. Your number also collects your reward stamps.</p>
        </form>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); verify(); }} className="space-y-3">
          <label className="label" htmlFor="otp">Enter the code sent to +{sent}</label>
          <input id="otp" className="input text-center font-display text-3xl tracking-[.5em]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} autoFocus />
          {devCode && <p className="rounded-lg bg-mustard/30 p-2 text-center text-xs">Test mode (no SMS provider set): your code is <b>{devCode}</b></p>}
          <button disabled={busy || code.length < 6} className="btn-primary w-full">{busy ? "Checking…" : "Verify"}</button>
          <button type="button" className="w-full text-sm font-bold text-char-500 underline" onClick={() => { setSent(null); setCode(""); }}>Change number</button>
        </form>
      )}
      {err && <p className="mt-3 rounded-lg bg-tomato-50 p-2 text-sm font-bold text-tomato-700">{err}</p>}
    </div>
  );
}
