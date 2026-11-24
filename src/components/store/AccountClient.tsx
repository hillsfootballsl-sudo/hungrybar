"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { money } from "@/lib/pricing";
import { fmtDateTime } from "@/lib/time";
import type { CartLine } from "@/lib/types";
import { MonthDay } from "./LoginSheet";
import { ProductCard } from "./ProductCard";
import { useStore } from "./StoreProvider";
import { Icon, RewardsMark } from "./ui";

type O = { id: string; code: string; status: string; total: number; createdAt: string; pointsEarned: number; items: { name: string; quantity: number; sizeName: string | null; line: unknown }[] };
type Txn = { id: string; change: number; reason: string; note: string | null; createdAt: string; expiresAt: string | null };

const TABS = [
  ["orders", "Orders", "bag"],
  ["points", "Points", "star"],
  ["profile", "Profile", "user"],
  ["addresses", "Addresses", "pin"],
  ["favourites", "Favourites", "heart"],
] as const;

export function AccountClient({ tab: initialTab, orders }: { tab: string; orders: O[] }) {
  const s = useStore();
  const router = useRouter();
  const [tab, setTab] = useState(initialTab);
  const [history, setHistory] = useState<Txn[]>([]);
  const [expiring, setExpiring] = useState<{ remaining: number; expiresAt: string } | null>(null);
  const [form, setForm] = useState({ name: "", email: "", birthday: "", anniversary: "" });
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!s.me) return;
    setForm({ name: s.me.name ?? "", email: s.me.email ?? "", birthday: s.me.birthday ?? "", anniversary: s.me.anniversary ?? "" });
    fetch("/api/me").then((r) => r.json()).then((j) => {
      setHistory(j.history ?? []);
      setExpiring(j.expiring ?? null);
    });
  }, [s.me?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (s.me === undefined) return <div className="h-[60vh]" />;
  if (!s.me)
    return (
      <div className="mx-auto max-w-md px-5 py-20 text-center">
        <RewardsMark className="text-2xl" />
        <h1 className="mt-4 text-3xl font-extrabold">Your Hungry Bar account</h1>
        <p className="mt-2 text-char-500">Sign in to see your orders, points and saved addresses.</p>
        <button onClick={() => s.openLogin(() => router.refresh())} className="btn-dark mt-6">Sign in with phone</button>
      </div>
    );

  const reorder = (o: O) => {
    for (const i of o.items) {
      const l = i.line as CartLine | null;
      if (l && !l.rewardId) s.add({ ...l }, { silent: true });
    }
    s.showToast("Added to your cart");
    s.setCartOpen(true);
  };
  const save = async (body: Record<string, unknown>) => {
    setMsg(null);
    const r = await fetch("/api/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    setMsg(r.ok ? "Saved ✓" : j.error);
    if (r.ok) await s.refreshMe();
  };
  const favs = s.catalog.products.filter((p) => s.me!.favourites.includes(p.id));

  return (
    <div className="mx-auto max-w-5xl px-4 pb-28 pt-6">
      <div className="doodles-dark grid grid-cols-1 items-center gap-4 rounded-[28px] p-6 text-white md:grid-cols-[1fr_auto] md:p-8">
        <div>
          <p className="text-white/70">Hi {s.me.name || "there"} 👋</p>
          <h1 className="text-3xl font-extrabold">{s.me.points.toLocaleString()} <span className="text-mustard">{s.config.rewards.pointName}</span></h1>
          {expiring && <p className="mt-1 text-sm text-white/70">{expiring.remaining} points expire on {new Date(expiring.expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>}
        </div>
        <div className="flex gap-2">
          <Link href="/rewards" className="btn-mustard btn-sm">Rewards menu</Link>
          <button onClick={() => { void s.logout(); router.push("/"); }} className="btn btn-sm border border-white/30 text-white">Log out</button>
        </div>
      </div>
      <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto">
        {TABS.map(([k, label, icon]) => (
          <button key={k} onClick={() => { setTab(k); setMsg(null); }} className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold ${tab === k ? "bg-char text-white" : "bg-char-50"}`}>
            <Icon name={icon} className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {tab === "orders" && (
          <div className="space-y-3">
            {orders.length === 0 && <p className="text-char-500">No orders yet. <Link href="/menu" className="font-bold text-tomato underline">Order something delicious →</Link></p>}
            {orders.map((o) => (
              <div key={o.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-extrabold">#{o.code} <span className="font-normal text-char-400">· {fmtDateTime(o.createdAt)}</span></p>
                  <p className="line-clamp-1 text-sm text-char-500">{o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`chip ${o.status === "COMPLETED" ? "border-basil text-basil" : o.status === "CANCELLED" ? "border-tomato text-tomato" : "border-mustard bg-mustard/20"}`}>{o.status.replaceAll("_", " ").toLowerCase()}</span>
                  <span className="font-extrabold">{money(o.total)}</span>
                  <Link href={`/order/${o.id}`} className="btn-ghost btn-sm">Track</Link>
                  <button onClick={() => reorder(o)} className="btn-primary btn-sm">Reorder</button>
                </div>
              </div>
            ))}
          </div>
        )}
        {tab === "points" && (
          <div className="card divide-y divide-char-100">
            {history.length === 0 && <p className="p-5 text-char-500">No points yet. You earn 1 point for every Rs. {s.config.rewards.rupeesPerPoint} when your order is completed.</p>}
            {history.map((h) => (
              <div key={h.id} className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-bold">{h.note ?? h.reason.toLowerCase()}</p>
                  <p className="text-xs text-char-400">{fmtDateTime(h.createdAt)}{h.expiresAt && h.change > 0 ? ` · valid till ${new Date(h.expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : ""}</p>
                </div>
                <span className={`text-lg font-extrabold ${h.change > 0 ? "text-basil" : "text-tomato"}`}>{h.change > 0 ? "+" : ""}{h.change}</span>
              </div>
            ))}
          </div>
        )}
        {tab === "profile" && (
          <form className="card grid grid-cols-1 gap-4 p-5 md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); void save({ name: form.name, email: form.email, ...(s.me!.birthday ? {} : { birthday: form.birthday }), ...(s.me!.anniversary ? {} : { anniversary: form.anniversary }) }); }}>
            <div><label className="label" htmlFor="pf-name">Name</label><input id="pf-name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><span className="label">Mobile</span><p className="flex h-[50px] items-center rounded-xl bg-char-50 px-4 font-bold">+{s.me.phone}</p></div>
            <div><label className="label" htmlFor="pf-email">Email</label><input id="pf-email" type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><label className="label" htmlFor="pf-bday">Birthday {s.me.birthday && "(set)"}</label><MonthDay id="pf-bday" value={form.birthday} onChange={(v) => setForm({ ...form, birthday: v })} disabled={!!s.me.birthday} /></div>
            <div><label className="label" htmlFor="pf-ann">Anniversary {s.me.anniversary && "(set)"}</label><MonthDay id="pf-ann" value={form.anniversary} onChange={(v) => setForm({ ...form, anniversary: v })} disabled={!!s.me.anniversary} /></div>
            <div className="flex items-end gap-3 md:col-span-2"><button className="btn-dark">Save profile</button>{msg && <span className="text-sm font-bold">{msg}</span>}</div>
          </form>
        )}
        {tab === "addresses" && (
          <div className="space-y-3">
            {s.me.addresses.length === 0 && <p className="text-char-500">Addresses you deliver to are saved here automatically.</p>}
            {s.me.addresses.map((a, i) => (
              <div key={i} className="card flex items-center justify-between gap-3 p-4">
                <div><p className="font-bold">📍 {a.address}</p>{a.landmark && <p className="text-sm text-char-500">{a.landmark}</p>}<p className="text-xs text-char-400">{s.config.zones.find((z) => z.id === a.zoneId)?.name}</p></div>
                <button onClick={() => save({ addresses: s.me!.addresses.filter((_, k) => k !== i) })} className="btn-ghost btn-sm">Remove</button>
              </div>
            ))}
            {msg && <p className="text-sm font-bold">{msg}</p>}
          </div>
        )}
        {tab === "favourites" && (
          favs.length ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">{favs.map((p) => <ProductCard key={p.id} p={p} />)}</div>
          ) : (
            <p className="text-char-500">Tap the ♥ on any menu item to save it here.</p>
          )
        )}
      </div>
    </div>
  );
}
