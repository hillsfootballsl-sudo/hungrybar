"use client";
import { useEffect, useMemo, useState } from "react";
import { colomboDateKey, colomboParts, fmtTime12, isOpenAt } from "@/lib/time";
import { type OrderMode, useStore } from "./StoreProvider";
import { Icon, Sheet } from "./ui";

export function useSlots(days = 2) {
  const s = useStore();
  return useMemo(() => {
    const out: { iso: string; label: string; day: string }[] = [];
    const start = Math.ceil((Date.now() + s.config.prepMinutes * 60000) / (15 * 60000)) * 15 * 60000;
    for (let t = start; t < start + days * 86400000 && out.length < 60; t += 30 * 60000) {
      const d = new Date(t);
      if (!isOpenAt(s.config.hours.open, s.config.hours.close, colomboParts(d).minutes)) continue;
      const day = colomboDateKey(d) === colomboDateKey() ? "Today" : "Tomorrow";
      out.push({ iso: d.toISOString(), day, label: d.toLocaleTimeString("en-GB", { timeZone: "Asia/Colombo", hour: "numeric", minute: "2-digit", hour12: true }) });
    }
    return out;
  }, [s.config, days]);
}

export function useOpenNow() {
  const s = useStore();
  const [m, setM] = useState<number | null>(null);
  useEffect(() => {
    const f = () => setM(colomboParts().minutes);
    f();
    const t = setInterval(f, 60000);
    return () => clearInterval(t);
  }, []);
  return m == null ? null : isOpenAt(s.config.hours.open, s.config.hours.close, m);
}

export function LocationModal() {
  const s = useStore();
  const [type, setType] = useState<OrderMode>(s.mode.type ?? "DELIVERY");
  const [zoneId, setZoneId] = useState<string | null>(s.mode.zoneId);
  const [when, setWhen] = useState(s.mode.when);
  const slots = useSlots();
  const open = useOpenNow();
  useEffect(() => {
    if (s.locationOpen) {
      setType(s.mode.type ?? "DELIVERY");
      setZoneId(s.mode.zoneId);
      const closed = !isOpenAt(s.config.hours.open, s.config.hours.close, colomboParts().minutes);
      setWhen(closed && s.mode.when === "ASAP" ? slots[0]?.iso ?? "ASAP" : s.mode.when);
    }
  }, [s.locationOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const can = type !== "DELIVERY" || !!zoneId;
  const tabs: [OrderMode, string, string][] = [
    ["DELIVERY", "Delivery", "bike"],
    ["TAKEAWAY", "Pickup", "store"],
    ...(s.mode.tableToken ? ([["DINE_IN", `Table ${s.mode.tableLabel}`, "home"]] as [OrderMode, string, string][]) : []),
  ];
  return (
    <Sheet open={s.locationOpen} onClose={() => s.closeLocation(false)} label="Choose delivery or pickup">
      <h2 className="h-title pr-10">How would you like your order?</h2>
      <div className={`mt-4 grid gap-2 rounded-2xl bg-char-50 p-1.5 ${tabs.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
        {tabs.map(([t, label, icon]) => (
          <button key={t} onClick={() => setType(t)} className={`flex items-center justify-center gap-2 rounded-xl py-3 font-bold transition ${type === t ? "bg-white text-char shadow" : "text-char-500"}`}>
            <Icon name={icon} className="h-5 w-5" /> {label}
          </button>
        ))}
      </div>

      {type === "DELIVERY" && (
        <div className="mt-5">
          <p className="label">Choose your area</p>
          <div className="grid max-h-[30dvh] gap-2 overflow-y-auto pr-1 scrollbar-thin">
            {s.config.zones.map((z) => (
              <button key={z.id} onClick={() => setZoneId(z.id)} className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition ${zoneId === z.id ? "border-char bg-char text-white" : "border-char-100 hover:border-char-300"}`}>
                <span>
                  <span className="block font-bold">{z.name}</span>
                  <span className={`text-xs ${zoneId === z.id ? "text-white/70" : "text-char-400"}`}>~{z.eta} min</span>
                </span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${z.fee === 0 ? "bg-basil text-white" : zoneId === z.id ? "bg-white/15" : "bg-char-50"}`}>{z.fee === 0 ? "FREE delivery" : `Rs. ${z.fee}`}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-char-400">Your exact address is asked at checkout.</p>
        </div>
      )}
      {type === "TAKEAWAY" && (
        <div className="mt-5 rounded-2xl border border-char-100 p-4">
          <p className="font-bold">Hungry Bar · {s.config.shop.address}</p>
          <p className="text-sm text-char-500">Open daily {fmtTime12(s.config.hours.open)} – {fmtTime12(s.config.hours.close)} · ready in ~{s.config.prepMinutes} min</p>
          <a href={s.config.shop.mapUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-tomato">Directions <Icon name="arrow" className="h-4 w-4" /></a>
        </div>
      )}
      {type === "DINE_IN" && <p className="mt-5 rounded-2xl bg-cream-200 p-4 font-bold">You&apos;re ordering for table {s.mode.tableLabel}. We&apos;ll bring it over.</p>}

      <div className="mt-5">
        <p className="label">When?</p>
        {open === false && <p className="mb-2 rounded-xl bg-mustard/25 p-3 text-sm">We&apos;re closed right now. We open at <b>{fmtTime12(s.config.hours.open)}</b>, so pick a time below.</p>}
        <div className="flex flex-wrap gap-2">
          {open !== false && (
            <button onClick={() => setWhen("ASAP")} className={`rounded-full border px-4 py-2.5 text-sm font-bold ${when === "ASAP" ? "border-char bg-char text-white" : "border-char-200"}`}>⚡ As soon as possible</button>
          )}
          <select aria-label="Schedule a time" value={when === "ASAP" ? "" : when} onChange={(e) => setWhen(e.target.value || "ASAP")} className={`rounded-full border px-4 py-2.5 text-sm font-bold ${when !== "ASAP" ? "border-char bg-char text-white" : "border-char-200 bg-white"}`}>
            <option value="">🕒 Schedule for later</option>
            {slots.map((sl) => (
              <option key={sl.iso} value={sl.iso}>{sl.day}, {sl.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="sticky -bottom-5 z-10 -mx-5 mt-5 bg-white px-5 pb-5 pt-3 md:-bottom-7 md:-mx-7 md:px-7 md:pb-7">
      <button
        disabled={!can}
        onClick={() => {
          s.setMode({ type, zoneId: type === "DELIVERY" ? zoneId : s.mode.zoneId, when });
          s.closeLocation(true);
        }}
        className="btn-primary h-14 w-full text-lg"
      >
        {can ? "Start my order" : "Choose your area"}
      </button>
      </div>
    </Sheet>
  );
}
