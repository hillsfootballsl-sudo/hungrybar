"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useCatalog } from "@/components/CatalogContext";
import { PizzaArt } from "@/components/PizzaArt";
import { money } from "@/lib/pricing";
import { fmtClock, fmtDateTime } from "@/lib/time";
import type { CartLine } from "@/lib/types";

type Item = { id: string; name: string; quantity: number; sizeName: string | null; summary: string | null; lineTotal: number; kind: string; line: unknown };
type Initial = {
  id: string; code: string; status: string; type: string; paymentStatus: string; paymentMethod: string; createdAt: string; scheduledFor: string | null; eta: number;
  table: string | null; subtotal: number; discount: number; deliveryFee: number; total: number; cancelReason: string | null; stamps: number | null; items: Item[];
};

const STEPS = [
  { s: "PENDING", t: "Order sent", d: "Waiting for the shop to accept", icon: "📨" },
  { s: "CONFIRMED", t: "Accepted", d: "We've got it!", icon: "👍" },
  { s: "PREPARING", t: "In the oven", d: "Hand-tossing & baking", icon: "🔥" },
  { s: "READY", t: "Ready", d: "Boxed and hot", icon: "📦" },
  { s: "OUT_FOR_DELIVERY", t: "On the way", d: "Our rider is heading to you", icon: "🛵" },
  { s: "COMPLETED", t: "Enjoy!", d: "Bon appétit", icon: "🍕" },
];

export function TrackClient({ initial, shop, stampsRequired }: { initial: Initial; shop: { phone: string; whatsapp: string }; stampsRequired: number }) {
  const cat = useCatalog();
  const [o, setO] = useState(initial);
  useEffect(() => {
    if (["COMPLETED", "CANCELLED"].includes(o.status)) return;
    const t = setInterval(async () => {
      const r = await fetch(`/api/orders/${o.id}`);
      if (r.ok) {
        const j = await r.json();
        setO((x) => ({ ...x, status: j.status, paymentStatus: j.paymentStatus, cancelReason: j.cancelReason }));
      }
    }, 6000);
    return () => clearInterval(t);
  }, [o.id, o.status]);

  const steps = STEPS.filter((s) => (o.type === "DELIVERY" ? true : s.s !== "OUT_FOR_DELIVERY"));
  const cur = Math.max(0, steps.findIndex((s) => s.s === o.status));
  const firstPizza = o.items.find((i) => i.kind === "PIZZA")?.line as CartLine | undefined;
  const cancelled = o.status === "CANCELLED";

  return (
    <div className="grain mx-auto max-w-4xl px-4 pb-24 pt-8">
      <div className="card overflow-hidden">
        <div className="relative bg-char p-6 text-cream md:p-10">
          <div className="absolute inset-0 sunburst" />
          <div className="relative grid items-center gap-6 md:grid-cols-[1fr_220px]">
            <div>
              <p className="font-bold uppercase tracking-[.3em] text-mustard">Order #{o.code}</p>
              <h1 className="h-display mt-2 text-5xl md:text-6xl">{cancelled ? "Cancelled" : steps[cur]?.t}</h1>
              <p className="mt-2 text-cream/80">{cancelled ? o.cancelReason || "This order was cancelled. Please call us if this is unexpected." : steps[cur]?.d}</p>
              {o.scheduledFor && !cancelled && <p className="chip mt-4 border-cream bg-mustard text-char">Scheduled · {fmtDateTime(o.scheduledFor)}</p>}
              {!o.scheduledFor && !cancelled && o.status !== "COMPLETED" && (
                <p className="mt-4 text-sm text-cream/70">Placed {fmtClock(o.createdAt)} · usually {o.type === "DELIVERY" ? `${o.eta}–${o.eta + 15}` : "20–25"} min</p>
              )}
              {o.paymentMethod === "PAYHERE" && <p className="mt-2 text-sm">{o.paymentStatus === "PAID" ? "✅ Card payment received" : o.paymentStatus === "FAILED" ? "❌ Card payment failed — pay cash or call us" : "⏳ Waiting for card payment confirmation"}</p>}
            </div>
            {firstPizza && (
              <div className={`mx-auto h-48 w-48 ${o.status === "PREPARING" ? "animate-wiggle" : ""}`}>
                <PizzaArt catalog={cat} sizeId={firstPizza.sizeId} crustId={firstPizza.crustId} toppings={firstPizza.toppings ?? {}} sliced={cur >= 3} steam={o.status === "PREPARING" || o.status === "READY"} board={false} className="h-full w-full" />
              </div>
            )}
          </div>
        </div>
        {!cancelled && (
          <ol className="grid grid-cols-1 gap-0 border-t-2 border-char sm:grid-cols-5">
            {steps.map((s, i) => (
              <li key={s.s} className={`flex items-center gap-3 border-b-2 border-char/10 p-4 sm:flex-col sm:border-b-0 sm:border-r-2 sm:text-center last:border-0 ${i <= cur ? "" : "opacity-35"}`}>
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-char text-xl ${i < cur ? "bg-basil" : i === cur ? "animate-pulse bg-mustard" : "bg-white"}`}>{s.icon}</span>
                <span className="text-sm font-bold">{s.t}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_280px]">
        <div className="card p-5">
          <h2 className="font-condensed text-2xl uppercase">Items</h2>
          <ul className="mt-3 divide-y divide-dashed divide-char/20">
            {o.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3 py-2 text-sm">
                <div>
                  <p className="font-bold">{i.quantity}× {i.name} {i.sizeName ? <span className="font-normal text-char-400">· {i.sizeName}</span> : null}</p>
                  {i.summary && <p className="text-xs text-tomato-700">{i.summary}</p>}
                </div>
                <span className="font-bold">{money(i.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-1 border-t-2 border-char pt-3 text-sm">
            {o.discount > 0 && <div className="flex justify-between text-basil"><dt>Discount</dt><dd>−{money(o.discount)}</dd></div>}
            {o.type === "DELIVERY" && <div className="flex justify-between"><dt>Delivery</dt><dd>{o.deliveryFee ? money(o.deliveryFee) : "FREE"}</dd></div>}
            <div className="flex justify-between text-lg font-bold"><dt>Total</dt><dd>{money(o.total)}</dd></div>
          </dl>
        </div>
        <div className="space-y-4">
          {o.stamps != null && (
            <div className="card bg-mustard p-5">
              <p className="font-condensed text-xl uppercase">Your stamps</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {Array.from({ length: stampsRequired }, (_, i) => (
                  <span key={i} className={`h-6 w-6 rounded-full border-2 border-char ${i < o.stamps! ? "bg-char" : i === stampsRequired - 1 ? "bg-tomato" : "bg-white"}`} />
                ))}
              </div>
              <p className="mt-2 text-xs font-bold">Stamp added when your order is completed.</p>
            </div>
          )}
          <a href={`https://wa.me/${shop.whatsapp}?text=${encodeURIComponent(`Hi Hungry Bar! About my order #${o.code}`)}`} target="_blank" rel="noreferrer" className="btn w-full border-2 border-char bg-[#25D366] text-white shadow-retro">WhatsApp us</a>
          <a href={`tel:${shop.phone.replace(/\s/g, "")}`} className="btn-ghost w-full">Call {shop.phone}</a>
          <Link href="/menu" className="btn-dark w-full">Order more</Link>
        </div>
      </div>
    </div>
  );
}
