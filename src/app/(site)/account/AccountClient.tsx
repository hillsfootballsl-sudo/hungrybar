"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart";
import { PhoneLogin } from "@/components/site/PhoneLogin";
import { money } from "@/lib/pricing";
import { fmtDateTime } from "@/lib/time";
import type { CartLine } from "@/lib/types";

type O = { id: string; code: string; status: string; total: number; createdAt: string; items: { name: string; quantity: number; sizeName: string | null; line: unknown }[] };

export function AccountClient({ customer, orders, stampsRequired }: { customer: { name: string | null; phone: string; stamps: number; rewardsUsed: number; totalOrders: number } | null; orders: O[]; stampsRequired: number }) {
  const router = useRouter();
  const cart = useCart();
  if (!customer)
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <h1 className="h-display text-5xl">My orders</h1>
        <p className="mb-6 mt-2 text-char-500">Sign in with your phone to see your orders and reward stamps.</p>
        <PhoneLogin onDone={() => router.refresh()} />
      </div>
    );
  const reorder = (o: O) => {
    for (const i of o.items) {
      const l = i.line as CartLine | null;
      if (l) cart.add({ ...l, quantity: l.quantity });
    }
    cart.setOpen(true);
  };
  const left = Math.max(0, stampsRequired - 1 - customer.stamps);
  return (
    <div className="grain mx-auto max-w-5xl px-4 pb-24 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-bold uppercase tracking-[.3em] text-tomato">Hey {customer.name || "there"} 👋</p>
          <h1 className="h-display text-5xl">My Hungry Bar</h1>
        </div>
        <button className="text-sm font-bold underline" onClick={async () => { await fetch("/api/me", { method: "DELETE" }); router.refresh(); }}>Sign out</button>
      </div>
      <div className="card mt-6 grid items-center gap-6 bg-char p-6 text-cream md:grid-cols-[1fr_auto]">
        <div>
          <p className="font-condensed text-3xl uppercase">{left === 0 ? "🎉 Your FREE pizza is ready!" : `${left} more order${left === 1 ? "" : "s"} to a free pizza`}</p>
          <p className="text-cream/70">Stamps are added when an order is completed. Free pizzas enjoyed: {customer.rewardsUsed}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: stampsRequired }, (_, i) => (
            <span key={i} className={`grid h-9 w-9 place-items-center rounded-full border-2 border-cream text-xs font-bold ${i < customer.stamps ? "bg-tomato" : i === stampsRequired - 1 ? "bg-mustard text-char" : "bg-transparent"}`}>
              {i === stampsRequired - 1 ? "🍕" : i < customer.stamps ? "✓" : ""}
            </span>
          ))}
        </div>
      </div>
      <h2 className="mt-10 font-condensed text-3xl uppercase">Orders</h2>
      <div className="mt-4 space-y-3">
        {orders.length === 0 && <p className="text-char-500">No orders yet. <Link href="/build" className="font-bold text-tomato underline">Build your first pizza →</Link></p>}
        {orders.map((o) => (
          <div key={o.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-bold">#{o.code} · <span className="text-char-400">{fmtDateTime(o.createdAt)}</span></p>
              <p className="text-sm text-char-500">{o.items.map((i) => `${i.quantity}× ${i.name}${i.sizeName ? ` (${i.sizeName})` : ""}`).join(", ")}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="chip bg-white">{o.status.replaceAll("_", " ").toLowerCase()}</span>
              <span className="font-bold">{money(o.total)}</span>
              <Link href={`/order/${o.id}`} className="btn-ghost btn-sm">Track</Link>
              <button onClick={() => reorder(o)} className="btn-primary btn-sm">Reorder</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
