"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PizzaArt } from "@/components/PizzaArt";
import { money } from "@/lib/pricing";
import { fmtClock, fmtDateTime } from "@/lib/time";
import type { CartLine } from "@/lib/types";
import { useStore } from "./StoreProvider";
import { Icon } from "./ui";

type Item = { id: string; name: string; quantity: number; sizeName: string | null; summary: string | null; lineTotal: number; kind: string; line: unknown };
type O = { id: string; code: string; status: string; type: string; paymentStatus: string; paymentMethod: string; createdAt: string; scheduledFor: string | null; eta: number; table: string | null; subtotal: number; discount: number; deliveryFee: number; total: number; cancelReason: string | null; pointsEarned: number; pointsRedeemed: number; items: Item[] };

const STEPS = [
  { s: "PENDING", t: "Order sent", d: "Waiting for Hungry Bar to accept", icon: "📨" },
  { s: "CONFIRMED", t: "Accepted", d: "We've got your order", icon: "👍" },
  { s: "PREPARING", t: "In the oven", d: "Made fresh, right now", icon: "🔥" },
  { s: "READY", t: "Ready", d: "Boxed and hot", icon: "📦" },
  { s: "OUT_FOR_DELIVERY", t: "On the way", d: "Our rider is heading to you", icon: "🛵" },
  { s: "COMPLETED", t: "Enjoy!", d: "Thanks for ordering", icon: "🍕" },
];

const b64ToU8 = (b64: string) => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};

function PushPrompt({ orderId }: { orderId: string }) {
  const s = useStore();
  const [state, setState] = useState<"hidden" | "ask" | "done" | "denied">("hidden");
  useEffect(() => {
    if (!s.config.vapidKey || !("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission === "default") setState("ask");
    else if (Notification.permission === "granted") void subscribe(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const subscribe = async (silent = false) => {
    try {
      if (!silent) {
        const p = await Notification.requestPermission();
        if (p !== "granted") return setState("denied");
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(s.config.vapidKey!) }));
      await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription: sub.toJSON(), orderId }) });
      setState("done");
    } catch {
      setState("hidden");
    }
  };
  if (state === "hidden") return null;
  return (
    <div className="card flex items-center gap-3 p-4">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-mustard"><Icon name="bell" /></span>
      <div className="min-w-0 flex-1">
        <p className="font-bold">{state === "done" ? "Notifications on ✓" : state === "denied" ? "Notifications are blocked" : "Get notified when it's on the way"}</p>
        <p className="text-xs text-char-500">{state === "done" ? "We'll ping this device as your order moves." : state === "denied" ? "You can allow them in your browser settings." : "We'll only message you about your orders."}</p>
      </div>
      {state === "ask" && (
        <div className="flex gap-2">
          <button onClick={() => setState("hidden")} className="btn-ghost btn-sm">Not now</button>
          <button onClick={() => subscribe()} className="btn-dark btn-sm">Allow</button>
        </div>
      )}
    </div>
  );
}

export function TrackClient({ initial }: { initial: O }) {
  const s = useStore();
  const [o, setO] = useState(initial);
  useEffect(() => {
    if (["COMPLETED", "CANCELLED"].includes(o.status)) return;
    const t = setInterval(async () => {
      const r = await fetch(`/api/orders/${o.id}`);
      if (r.ok) {
        const j = await r.json();
        setO((x) => ({ ...x, status: j.status, paymentStatus: j.paymentStatus, cancelReason: j.cancelReason }));
        if (j.status === "COMPLETED") void s.refreshMe();
      }
    }, 6000);
    return () => clearInterval(t);
  }, [o.id, o.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const steps = STEPS.filter((x) => (o.type === "DELIVERY" ? true : x.s !== "OUT_FOR_DELIVERY"));
  const cur = Math.max(0, steps.findIndex((x) => x.s === o.status));
  const cancelled = o.status === "CANCELLED";
  const pizza = o.items.find((i) => i.kind === "PIZZA")?.line as CartLine | undefined;

  return (
    <div className="mx-auto max-w-4xl px-4 pb-28 pt-6">
      <div className="overflow-hidden rounded-[28px] bg-char text-white">
        <div className="doodles-dark grid grid-cols-1 items-center gap-6 p-6 md:grid-cols-[1fr_200px] md:p-10">
          <div>
            <p className="text-sm font-bold uppercase tracking-[.25em] text-mustard">Order #{o.code}</p>
            <h1 className="mt-2 text-4xl font-extrabold md:text-5xl">{cancelled ? "Cancelled" : steps[cur]?.t}</h1>
            <p className="mt-1 text-white/80">{cancelled ? o.cancelReason || "This order was cancelled. Call us if this is unexpected." : steps[cur]?.d}</p>
            {o.scheduledFor && !cancelled && <p className="mt-3 inline-block rounded-full bg-mustard px-3 py-1 text-sm font-bold text-char">Scheduled · {fmtDateTime(o.scheduledFor)}</p>}
            {!o.scheduledFor && !cancelled && o.status !== "COMPLETED" && <p className="mt-3 text-sm text-white/70">Placed {fmtClock(o.createdAt)} · usually {o.type === "DELIVERY" ? `${o.eta}–${o.eta + 15}` : "20–25"} min</p>}
            {o.paymentMethod === "PAYHERE" && <p className="mt-2 text-sm">{o.paymentStatus === "PAID" ? "✅ Card payment received" : o.paymentStatus === "FAILED" ? "❌ Card payment failed — pay cash or call us" : "⏳ Waiting for card payment"}</p>}
          </div>
          {pizza?.sizeId && (
            <div className={`mx-auto h-44 w-44 ${o.status === "PREPARING" ? "animate-wiggle" : ""}`}>
              <PizzaArt catalog={s.catalog} sizeId={pizza.sizeId} crustId={pizza.crustId} toppings={pizza.toppings ?? {}} sliced={cur >= 3} steam={o.status === "PREPARING" || o.status === "READY"} board={false} className="h-full w-full" />
            </div>
          )}
        </div>
        {!cancelled && (
          <ol className="grid grid-cols-1 bg-white text-char sm:grid-cols-6">
            {steps.map((st, i) => (
              <li key={st.s} className={`flex items-center gap-3 border-b border-char-50 p-3 sm:flex-col sm:border-b-0 sm:text-center ${i <= cur ? "" : "opacity-35"}`}>
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-lg ${i < cur ? "bg-basil/15" : i === cur ? "animate-pulse bg-mustard" : "bg-char-50"}`}>{st.icon}</span>
                <span className="text-sm font-bold">{st.t}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-[1fr_300px]">
        <div className="card p-5">
          <h2 className="text-lg font-extrabold">Items</h2>
          <ul className="mt-2 divide-y divide-char-100 text-sm">
            {o.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3 py-2.5">
                <div>
                  <p className="font-bold">{i.quantity}× {i.name} {i.sizeName && <span className="font-normal text-char-400">· {i.sizeName}</span>}</p>
                  {i.summary && <p className="text-xs text-tomato-700">{i.summary}</p>}
                </div>
                <span className="font-bold">{i.lineTotal ? money(i.lineTotal) : <span className="text-basil">FREE</span>}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-2 space-y-1 border-t border-char-100 pt-3 text-sm">
            {o.discount > 0 && <div className="flex justify-between text-basil"><dt>Discount</dt><dd>−{money(o.discount)}</dd></div>}
            {o.type === "DELIVERY" && <div className="flex justify-between"><dt>Delivery</dt><dd>{o.deliveryFee ? money(o.deliveryFee) : "FREE"}</dd></div>}
            <div className="flex justify-between text-lg font-extrabold"><dt>Total</dt><dd>{money(o.total)}</dd></div>
          </dl>
        </div>
        <div className="space-y-3">
          <PushPrompt orderId={o.id} />
          {o.pointsEarned > 0 && (
            <div className="card bg-mustard/20 p-4">
              <p className="font-extrabold">⭐ {o.status === "COMPLETED" ? `${o.pointsEarned} points added` : `${o.pointsEarned} points on the way`}</p>
              <p className="text-xs text-char-500">{o.status === "COMPLETED" ? "Check your balance in My account." : "Added when your order is completed."}</p>
            </div>
          )}
          <a href={`https://wa.me/${s.config.shop.whatsapp}?text=${encodeURIComponent(`Hi Hungry Bar! About my order #${o.code}`)}`} target="_blank" rel="noreferrer" className="btn w-full bg-[#25D366] text-white">WhatsApp us</a>
          <p className="text-center text-sm">or call <span className="select-all font-bold">{s.config.shop.phone}</span></p>
          <Link href="/menu" className="btn-dark w-full">Order more</Link>
        </div>
      </div>
    </div>
  );
}
