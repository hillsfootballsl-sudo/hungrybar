"use client";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { PizzaArt } from "@/components/PizzaArt";
import type { Ticket } from "@/lib/orderView";
import type { CartLine, Catalog } from "@/lib/types";
import { beep, elapsed } from "./ui";

export function KitchenClient({ catalog, staffName }: { catalog: Catalog; staffName: string }) {
  const [orders, setOrders] = useState<Ticket[]>([]);
  const [now, setNow] = useState(Date.now());
  const [sound, setSound] = useState(true);
  const seen = useRef<Set<string> | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/staff/orders?scope=kitchen");
    if (r.status === 401) return (window.location.href = "/staff/login?next=/kitchen");
    if (!r.ok) return;
    const j = (await r.json()) as { orders: Ticket[] };
    setOrders(j.orders);
    const ids = new Set(j.orders.filter((o) => o.status === "CONFIRMED").map((o) => o.id));
    if (seen.current && sound && [...ids].some((id) => !seen.current!.has(id))) beep(3);
    seen.current = ids;
  }, [sound]);
  useEffect(() => {
    void load();
    const t = setInterval(load, 4000);
    const c = setInterval(() => setNow(Date.now()), 15000);
    return () => {
      clearInterval(t);
      clearInterval(c);
    };
  }, [load]);

  const move = async (o: Ticket, status: Ticket["status"]) => {
    setOrders((os) => os.map((x) => (x.id === o.id ? { ...x, status } : x)));
    await fetch(`/api/staff/orders/${o.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    void load();
  };

  const later = (o: Ticket) => o.scheduledFor && new Date(o.scheduledFor).getTime() - now > 40 * 60000;
  const cols = [
    { id: "CONFIRMED", title: "New", color: "bg-tomato", list: orders.filter((o) => o.status === "CONFIRMED" && !later(o)) },
    { id: "PREPARING", title: "In the oven", color: "bg-mustard text-char", list: orders.filter((o) => o.status === "PREPARING") },
    { id: "READY", title: "Ready / pickup", color: "bg-basil", list: orders.filter((o) => o.status === "READY").slice(-12) },
  ];
  const scheduled = orders.filter((o) => o.status === "CONFIRMED" && later(o));

  return (
    <div className="flex h-[100dvh] flex-col bg-char-800 text-cream">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-white/10 px-4">
        <Image src="/brand/logo.png" alt="" width={40} height={40} />
        <span className="font-display text-xl uppercase">Kitchen</span>
        <span className="text-sm text-cream/50">{staffName}</span>
        {scheduled.length > 0 && <span className="rounded-lg bg-white/10 px-3 py-1 text-sm">⏰ {scheduled.length} scheduled later</span>}
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => { setSound((s) => !s); beep(1); }} className="rounded-lg bg-white/10 px-3 py-2 text-sm font-bold">{sound ? "🔔 Sound on" : "🔕 Muted"}</button>
          <button onClick={() => document.documentElement.requestFullscreen?.()} className="rounded-lg bg-white/10 px-3 py-2 text-sm font-bold">⛶</button>
        </div>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden p-3 md:grid-cols-3">
        {cols.map((c) => (
          <section key={c.id} className="flex min-h-0 flex-col rounded-2xl bg-white/5">
            <h2 className={`flex items-center justify-between rounded-t-2xl px-4 py-2 font-condensed text-2xl uppercase ${c.color}`}>
              {c.title} <span className="font-display">{c.list.length}</span>
            </h2>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
              {c.list.map((o) => {
                const mins = Math.floor((now - new Date(o.confirmedAt ?? o.createdAt).getTime()) / 60000);
                const urgency = c.id === "READY" ? "border-basil" : mins >= 20 ? "border-tomato animate-pulse" : mins >= 12 ? "border-mustard" : "border-white/20";
                return (
                  <article key={o.id} className={`rounded-xl border-4 bg-char p-3 ${urgency}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-display text-3xl leading-none">#{1000 + o.number}</p>
                        <p className="mt-1 text-sm font-bold uppercase tracking-wide text-mustard">
                          {o.type === "DINE_IN" ? o.table ? `🍽️ Table ${o.table}` : "🍽️ Dine-in" : o.type === "DELIVERY" ? `🛵 ${o.channel === "UBER" ? "Uber" : o.channel === "PICKME" ? "PickMe" : "Delivery"}` : "🛍️ Takeaway"}
                        </p>
                      </div>
                      <span className="rounded-lg bg-white/10 px-2 py-1 font-display text-lg">{elapsed(o.confirmedAt ?? o.createdAt, now)}</span>
                    </div>
                    <ul className="mt-3 space-y-2">
                      {o.items.map((i) => {
                        const line = i.line as CartLine | null;
                        return (
                          <li key={i.id} className="flex gap-2">
                            {i.kind === "PIZZA" && line ? (
                              <PizzaArt catalog={catalog} sizeId={line.sizeId} crustId={line.crustId} toppings={line.toppings ?? {}} board={false} animate={false} scaleBySize={false} className="h-12 w-12 shrink-0" />
                            ) : (
                              <span className="w-12 shrink-0" />
                            )}
                            <div>
                              <p className="text-lg font-bold leading-tight">
                                <span className="text-tomato-300">{i.quantity}×</span> {i.name}
                              </p>
                              {(i.sizeName || i.crustName) && <p className="text-sm text-cream/70">{[i.sizeName, i.crustName].filter(Boolean).join(" · ")}</p>}
                              {i.summary && <p className="text-sm font-bold text-mustard">{i.summary}</p>}
                              {i.note && <p className="rounded bg-tomato px-1 text-sm font-bold">⚠ {i.note}</p>}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                    {o.note && <p className="mt-2 rounded bg-white/10 p-2 text-sm">📝 {o.note}</p>}
                    <div className="mt-3">
                      {c.id === "CONFIRMED" && <button onClick={() => move(o, "PREPARING")} className="h-12 w-full rounded-xl bg-mustard font-bold text-char">🔥 Start</button>}
                      {c.id === "PREPARING" && <button onClick={() => move(o, "READY")} className="h-12 w-full rounded-xl bg-basil font-bold">✅ Ready</button>}
                      {c.id === "READY" && <p className="text-center text-sm text-cream/60">Waiting for {o.type === "DELIVERY" ? "rider" : "pickup"}</p>}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
