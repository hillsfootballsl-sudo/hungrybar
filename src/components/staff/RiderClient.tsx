"use client";
import { useCallback, useEffect, useState } from "react";
import type { Ticket } from "@/lib/orderView";
import { money } from "@/lib/pricing";
import { elapsed } from "./ui";

export function RiderClient({ me, shopPhone }: { me: { id: string; name: string }; shopPhone: string }) {
  const [orders, setOrders] = useState<Ticket[]>([]);
  const [now, setNow] = useState(Date.now());
  const load = useCallback(async () => {
    const r = await fetch("/api/staff/orders?scope=rider");
    if (r.status === 401) return (window.location.href = "/staff/login?next=/rider");
    if (r.ok) setOrders((await r.json()).orders);
    setNow(Date.now());
  }, []);
  useEffect(() => {
    void load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [load]);
  const act = async (o: Ticket, status: string) => {
    await fetch(`/api/staff/orders/${o.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, riderId: me.id }) });
    void load();
  };
  const mine = orders.filter((o) => o.status === "OUT_FOR_DELIVERY" && o.riderId === me.id);
  const ready = orders.filter((o) => o.status !== "OUT_FOR_DELIVERY");
  const Card = ({ o }: { o: Ticket }) => {
    const maps = o.lat && o.lng ? `https://www.google.com/maps/dir/?api=1&destination=${o.lat},${o.lng}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${o.address ?? ""} ${o.zone ?? ""} Sri Lanka`)}`;
    return (
      <div className="rounded-2xl bg-white p-4 text-char shadow">
        <div className="flex justify-between">
          <p className="font-display text-2xl">#{1000 + o.number}</p>
          <p className="text-right font-bold">{money(o.total)}<span className={`block text-xs ${o.paymentStatus === "PAID" ? "text-basil" : "text-tomato"}`}>{o.paymentStatus === "PAID" ? "PAID" : "COLLECT CASH"}</span></p>
        </div>
        <p className="font-bold">{o.customerName}</p>
        <p className="text-sm">{o.address} {o.zone && <span className="text-char-400">({o.zone})</span>}</p>
        {o.landmark && <p className="text-sm text-char-400">🏁 {o.landmark}</p>}
        <p className="mt-1 text-xs text-char-400">{o.status.replaceAll("_", " ")} · {elapsed(o.createdAt, now)} since order</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <a href={maps} target="_blank" rel="noreferrer" className="btn-ghost">🗺️ Map</a>
          {o.customerPhone && <a href={`tel:+${o.customerPhone}`} className="btn-ghost">📞 Call</a>}
          {o.status === "READY" && <button onClick={() => act(o, "OUT_FOR_DELIVERY")} className="btn-primary col-span-2 h-12">Pick up</button>}
          {o.status === "OUT_FOR_DELIVERY" && <button onClick={() => act(o, "COMPLETED")} className="btn-primary col-span-2 h-12 bg-basil">Delivered {o.paymentStatus !== "PAID" ? `· collected ${money(o.total)}` : ""}</button>}
        </div>
      </div>
    );
  };
  return (
    <div className="staff min-h-screen bg-char p-4 text-cream">
      <div className="mb-4 flex items-center justify-between">
        <p className="font-display text-2xl uppercase">🛵 {me.name}</p>
        <a href={`tel:${shopPhone.replace(/\s/g, "")}`} className="text-sm underline">Call shop</a>
      </div>
      <h2 className="mb-2 font-condensed text-xl uppercase text-mustard">My deliveries ({mine.length})</h2>
      <div className="space-y-3">{mine.map((o) => <Card key={o.id} o={o} />)}</div>
      <h2 className="mb-2 mt-6 font-condensed text-xl uppercase text-mustard">Ready / cooking ({ready.length})</h2>
      <div className="space-y-3">{ready.map((o) => <Card key={o.id} o={o} />)}</div>
      {orders.length === 0 && <p className="mt-10 text-center text-cream/50">No deliveries right now.</p>}
    </div>
  );
}
