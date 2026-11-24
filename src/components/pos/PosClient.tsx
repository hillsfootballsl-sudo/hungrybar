"use client";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type BuilderInitial, PizzaBuilder } from "@/components/builder/PizzaBuilder";
import { ItemArt } from "@/components/ItemArt";
import { ComboPicker } from "@/components/store/ComboModal";
import { PizzaArt } from "@/components/PizzaArt";
import { type PrintConfig, PrinterControl, usePrinter } from "@/components/staff/printing";
import { beep, Keypad, Modal, useToasts } from "@/components/staff/ui";
import type { StaffSession } from "@/lib/jwt";
import type { Ticket } from "@/lib/orderView";
import { lineKey, money, priceLine } from "@/lib/pricing";
import type { CartLine, Catalog } from "@/lib/types";
import { OrdersPanel } from "./OrdersPanel";
import { PayModal } from "./PayModal";
import { ShiftModal, type ShiftSummary } from "./ShiftModal";

type Mode = "TAKEAWAY" | "DINE_IN" | "DELIVERY" | "UBER" | "PICKME";
type Quote = { subtotal: number; promoDiscount: number; promoError?: string; manualDiscount: number; discount: number; deliveryFee: number; total: number; pointsNeeded: number; pointsBalance: number | null; pointsEarnable: number; error?: string };
type Cust = { id: string; name: string | null; phone: string; points: number; totalOrders: number; birthday?: string | null } | null;

const MODES: { id: Mode; label: string; icon: string }[] = [
  { id: "TAKEAWAY", label: "Takeaway", icon: "🛍️" },
  { id: "DINE_IN", label: "Dine-in", icon: "🍽️" },
  { id: "DELIVERY", label: "Delivery", icon: "🛵" },
  { id: "UBER", label: "Uber", icon: "🟢" },
  { id: "PICKME", label: "PickMe", icon: "🟡" },
];

export function PosClient({
  catalog,
  staff,
  zones,
  tables,
  riders,
  print,
  loyaltyEnabled,
}: {
  catalog: Catalog;
  staff: StaffSession;
  zones: { id: string; name: string; fee: number }[];
  tables: { id: string; label: string }[];
  riders: { id: string; name: string }[];
  print: PrintConfig;
  loyaltyEnabled: boolean;
}) {
  const { toast, view: toasts } = useToasts();
  const printer = usePrinter(print, toast);

  // ── ticket state ──
  const [lines, setLines] = useState<CartLine[]>([]);
  const [mode, setMode] = useState<Mode>("TAKEAWAY");
  const [tableId, setTableId] = useState<string>("");
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? "");
  const [address, setAddress] = useState("");
  const [extRef, setExtRef] = useState("");
  const [phone, setPhone] = useState("");
  const [cust, setCust] = useState<Cust>(null);
  const [custName, setCustName] = useState("");
  const [rewardsOpen, setRewardsOpen] = useState(false);
  const [combo, setCombo] = useState<{ productId: string; editKey?: string; line?: CartLine } | null>(null);
  const [promo, setPromo] = useState("");
  const [discount, setDiscount] = useState<{ amount: number; note: string; pin?: string } | null>(null);
  const [note, setNote] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [cat, setCat] = useState<string>(catalog.categories[0]?.id ?? "custom");
  const [builder, setBuilder] = useState<{ initial: BuilderInitial; editKey?: string } | null>(null);
  const [paying, setPaying] = useState(false);
  const [done, setDone] = useState<Ticket | null>(null);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [ticketOpen, setTicketOpen] = useState(false);

  // ── shift + orders ──
  const [shift, setShift] = useState<ShiftSummary | null | undefined>(undefined);
  const [shiftOpen, setShiftOpen] = useState(false);
  const [orders, setOrders] = useState<Ticket[]>([]);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const seen = useRef<Set<string> | null>(null);

  const loadShift = useCallback(async () => {
    const r = await fetch("/api/pos/shift");
    if (r.status === 401) return (window.location.href = "/staff/login?next=/pos");
    const j = await r.json();
    setShift(j.summary);
  }, []);
  useEffect(() => {
    void loadShift();
  }, [loadShift]);

  const loadOrders = useCallback(async () => {
    const r = await fetch("/api/staff/orders?scope=active");
    if (!r.ok) return;
    const j = (await r.json()) as { orders: Ticket[] };
    setOrders(j.orders);
    const pending = j.orders.filter((o) => o.status === "PENDING");
    if (seen.current) {
      const fresh = pending.filter((o) => !seen.current!.has(o.id));
      if (fresh.length) {
        beep(4);
        toast(`🔔 ${fresh.length} new online order${fresh.length > 1 ? "s" : ""}!`);
      }
    }
    seen.current = new Set(pending.map((o) => o.id));
  }, [toast]);
  useEffect(() => {
    void loadOrders();
    const t = setInterval(loadOrders, 5000);
    return () => clearInterval(t);
  }, [loadOrders]);
  // keep ringing while something waits
  const pendingCount = orders.filter((o) => o.status === "PENDING").length;
  useEffect(() => {
    if (!pendingCount) return;
    const t = setInterval(() => beep(2), 15000);
    return () => clearInterval(t);
  }, [pendingCount]);

  // ── pricing ──
  const priced = useMemo(() => lines.map((l) => priceLine(catalog, l)), [lines, catalog]);
  const channel = mode === "UBER" || mode === "PICKME" ? mode : "POS";
  const type = mode === "UBER" || mode === "PICKME" ? "DELIVERY" : mode;

  useEffect(() => {
    if (!lines.length) return setQuote(null);
    const t = setTimeout(async () => {
      const r = await fetch("/api/pos/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines, channel, type, zoneId, customerPhone: cust ? phone : null, promoCode: promo || null, manualDiscount: discount?.amount ?? null }),
      });
      if (r.ok) setQuote(await r.json());
    }, 200);
    return () => clearTimeout(t);
  }, [lines, channel, type, zoneId, cust, phone, promo, discount]);

  const lookup = async (p: string) => {
    if (p.replace(/\D/g, "").length < 9) return setCust(null);
    const r = await fetch(`/api/pos/customer?phone=${encodeURIComponent(p)}`);
    const j = await r.json();
    setCust(j.customer);
    if (j.customer?.name) setCustName(j.customer.name);
  };

  const addLine = (l: Omit<CartLine, "key">) => {
    const key = lineKey(l);
    setLines((ls) => {
      const ex = ls.find((x) => x.key.startsWith(key + "#") && (x.note ?? "") === (l.note ?? ""));
      if (ex) return ls.map((x) => (x === ex ? { ...x, quantity: x.quantity + l.quantity } : x));
      return [...ls, { ...l, key: key + "#" + Math.random().toString(36).slice(2, 7) }];
    });
  };
  const setQty = (key: string, q: number) => setLines((ls) => (q <= 0 ? ls.filter((l) => l.key !== key) : ls.map((l) => (l.key === key ? { ...l, quantity: q } : l))));

  const reset = () => {
    setLines([]);
    setPhone("");
    setCust(null);
    setCustName("");
    setPromo("");
    setDiscount(null);
    setNote("");
    setExtRef("");
    setAddress("");
    setTableId("");
    setQuote(null);
  };

  const submit = async (payment: { method: "CASH" | "CARD"; tendered?: number | null } | null) => {
    const r = await fetch("/api/pos/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lines,
        channel,
        type,
        customerPhone: phone || null,
        customerName: custName || null,
        zoneId: type === "DELIVERY" && channel === "POS" ? zoneId : null,
        address: type === "DELIVERY" ? address : null,
        tableId: type === "DINE_IN" ? tableId || null : null,
        promoCode: promo || null,
        manualDiscount: discount ? { amount: discount.amount, note: discount.note } : null,
        approvalPin: discount?.pin ?? null,
        payment: channel === "POS" ? payment : null,
        externalRef: extRef || null,
        note: note || null,
      }),
    });
    const j = await r.json();
    if (!r.ok) {
      toast(j.error || "Couldn't save the order", true);
      return false;
    }
    const t = j as Ticket;
    setDone(t);
    setPaying(false);
    reset();
    void loadShift();
    void loadOrders();
    if (print.receipt.autoPrint) {
      if (payment || channel !== "POS") await printer.printReceipt(t, { drawer: payment?.method === "CASH" });
      if (print.receipt.printKot) await printer.printKot(t);
    }
    return true;
  };

  if (shift === undefined) return <div className="grid h-screen place-items-center bg-char text-cream">Loading…</div>;
  if (shift === null)
    return (
      <div className="staff grid min-h-screen place-items-center bg-char p-4">
        {toasts}
        <ShiftModal summary={null} staff={staff} onChange={setShift} print={print} printer={printer} inline />
      </div>
    );

  const products = catalog.products.filter((p) => p.categoryId === cat);
  const canCharge = lines.length > 0 && priced.every((p) => p.valid) && !quote?.error && (type !== "DELIVERY" || channel !== "POS" || (address.trim() && phone));
  const pointsLeft = (cust?.points ?? 0) - priced.reduce((s, p) => s + p.points, 0);
  const count = lines.reduce((s, l) => s + l.quantity, 0);

  const TicketPanel = (
    <div className="flex h-full min-h-0 flex-col bg-white">
      {/* mode */}
      <div className="grid grid-cols-5 gap-1 border-b border-char-100 p-2">
        {MODES.map((m) => (
          <button key={m.id} onClick={() => setMode(m.id)} className={`rounded-lg px-1 py-2 text-xs font-bold ${mode === m.id ? "bg-char text-cream" : "bg-char-50 hover:bg-char-100"}`}>
            <span className="block text-base">{m.icon}</span>
            {m.label}
          </button>
        ))}
      </div>
      <div className="space-y-2 border-b border-char-100 p-3 text-sm">
        {mode === "DINE_IN" && (
          <div className="flex flex-wrap gap-1">
            {tables.map((t) => (
              <button key={t.id} onClick={() => setTableId(t.id === tableId ? "" : t.id)} className={`rounded-md px-3 py-1.5 font-bold ${tableId === t.id ? "bg-tomato text-white" : "bg-char-50"}`}>
                {t.label}
              </button>
            ))}
          </div>
        )}
        {(mode === "UBER" || mode === "PICKME") && <input className="input" placeholder={`${mode === "UBER" ? "Uber" : "PickMe"} order ID`} value={extRef} onChange={(e) => setExtRef(e.target.value)} />}
        <div className="flex gap-2">
          <input className="input" inputMode="tel" placeholder="Customer phone (stamps)" value={phone} onChange={(e) => { setPhone(e.target.value); void lookup(e.target.value); }} />
          <input className="input" placeholder="Name" value={custName} onChange={(e) => setCustName(e.target.value)} />
        </div>
        {cust && loyaltyEnabled && (
          <div className="flex items-center justify-between rounded-lg bg-cream-100 px-3 py-2">
            <span>⭐ <b>{cust.points.toLocaleString()}</b> pts · {cust.totalOrders} orders{quote?.pointsEarnable ? ` · earns +${quote.pointsEarnable}` : ""}</span>
            <button onClick={() => setRewardsOpen(true)} className="rounded-md bg-char px-2.5 py-1 text-xs font-bold text-white">Use points</button>
          </div>
        )}
        {phone.replace(/\D/g, "").length >= 9 && !cust && <p className="text-xs text-char-400">New customer — points start with this order.</p>}
        {mode === "DELIVERY" && (
          <div className="flex gap-2">
            <select className="input w-40" value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>{z.name} {z.fee ? `+${z.fee}` : "(free)"}</option>
              ))}
            </select>
            <input className="input" placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
        )}
      </div>

      {/* lines */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {priced.length === 0 && <p className="p-8 text-center text-char-300">Tap items to start an order</p>}
        {priced.map((p) => (
          <div key={p.line.key} className="flex items-start gap-2 border-b border-char-50 px-3 py-2">
            <button
              className="min-w-0 flex-1 text-left"
              onClick={() => (p.line.rewardId ? null : p.line.kind === "PIZZA" ? setBuilder({ initial: { productId: p.line.productId, sizeId: p.line.sizeId, crustId: p.line.crustId, toppings: p.line.toppings, quantity: p.line.quantity, note: p.line.note }, editKey: p.line.key }) : p.line.kind === "COMBO" ? setCombo({ productId: p.line.productId!, editKey: p.line.key, line: p.line }) : null)}
            >
              <p className="font-bold leading-tight">{p.line.rewardId && "🎁 "}{p.name} {p.sizeName && <span className="font-normal text-char-400">· {p.sizeName}</span>}</p>
              {p.summary && <p className="text-xs text-tomato-700">{p.summary}</p>}
              {p.line.note && <p className="text-xs italic text-char-400">“{p.line.note}”</p>}
              {!p.valid && <p className="text-xs font-bold text-tomato">{p.error}</p>}
            </button>
            <div className="flex items-center rounded-lg bg-char-50">
              <button className="h-8 w-8 font-bold" onClick={() => setQty(p.line.key, p.line.quantity - 1)}>−</button>
              <span className="w-6 text-center font-bold">{p.line.quantity}</span>
              <button className="h-8 w-8 font-bold" onClick={() => setQty(p.line.key, p.line.quantity + 1)}>+</button>
            </div>
            <span className="w-20 text-right font-bold">{p.line.rewardId ? <span className="text-basil">FREE</span> : money(p.lineTotal).replace("Rs. ", "")}</span>
          </div>
        ))}
      </div>

      {/* totals */}
      <div className="border-t border-char-100 p-3 text-sm">
        <div className="mb-2 flex gap-2">
          <input className="input uppercase" placeholder="Promo" value={promo} onChange={(e) => setPromo(e.target.value.toUpperCase())} />
          <button onClick={() => setDiscountOpen(true)} className="btn-ghost whitespace-nowrap">{discount ? `−${discount.amount}` : "% Discount"}</button>
          <input className="input" placeholder="Order note" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        {quote?.promoError && promo && <p className="mb-1 text-xs font-bold text-tomato">{quote.promoError}</p>}
        {quote?.error && <p className="mb-1 text-xs font-bold text-tomato">{quote.error}</p>}
        <div className="space-y-0.5">
          <div className="flex justify-between"><span>Subtotal</span><span>{money(quote?.subtotal ?? priced.reduce((s, p) => s + p.lineTotal, 0))}</span></div>
          {!!quote?.discount && <div className="flex justify-between text-basil"><span>Discounts</span><span>−{money(quote.discount)}</span></div>}
          {!!quote?.deliveryFee && <div className="flex justify-between"><span>Delivery</span><span>{money(quote.deliveryFee)}</span></div>}
          {!!quote?.pointsNeeded && <div className="flex justify-between text-basil"><span>Points used</span><span>{quote.pointsNeeded.toLocaleString()} pts</span></div>}
        </div>
        <div className="mt-3 grid grid-cols-[auto_1fr] gap-2">
          {channel === "POS" && (
            <button disabled={!canCharge} onClick={() => submit(null)} className="btn-ghost h-14" title="Send to kitchen now, take payment later">
              Pay later
            </button>
          )}
          <button disabled={!canCharge} onClick={() => (channel === "POS" ? setPaying(true) : submit(null))} className={`btn-primary h-14 text-lg ${channel !== "POS" ? "col-span-2" : ""}`}>
            {channel === "POS" ? "Charge" : `Send ${channel === "UBER" ? "Uber" : "PickMe"} order`} · {money(quote?.total ?? 0)}
          </button>
        </div>
        {lines.length > 0 && <button onClick={reset} className="mt-2 w-full text-xs font-bold text-char-400 underline">Clear ticket</button>}
      </div>
    </div>
  );

  return (
    <div className="staff flex h-[100dvh] flex-col overflow-hidden">
      {toasts}
      {/* top bar */}
      <header className="flex h-14 shrink-0 items-center gap-2 bg-char px-3 text-cream">
        <Image src="/brand/logo.png" alt="" width={40} height={40} />
        <span className="hidden font-display text-lg uppercase md:block">POS</span>
        <button onClick={() => setShiftOpen(true)} className="ml-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-bold">
          💰 {money(shift.sales)} · {shift.orders} orders
        </button>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setOrdersOpen(true)} className={`relative rounded-lg px-3 py-2 text-sm font-bold ${pendingCount ? "animate-pulse bg-tomato" : "bg-white/10"}`}>
            📋 Orders
            {orders.length > 0 && <span className="ml-1 rounded-full bg-white px-1.5 text-xs text-char">{orders.length}</span>}
            {pendingCount > 0 && <span className="ml-1">· {pendingCount} new</span>}
          </button>
          <PrinterControl printer={printer} />
          <Link href="/kitchen" target="_blank" className="hidden rounded-lg bg-white/10 px-3 py-2 text-sm font-bold md:block">🔥 Kitchen</Link>
          {["OWNER", "MANAGER"].includes(staff.role) && <Link href="/admin" className="hidden rounded-lg bg-white/10 px-3 py-2 text-sm font-bold md:block">⚙️ Admin</Link>}
          <button onClick={async () => { await fetch("/api/staff/logout", { method: "POST" }); window.location.href = "/staff/login"; }} className="rounded-lg bg-white/10 px-3 py-2 text-sm font-bold" title={`Signed in as ${staff.name}`}>
            {staff.name.split(" ")[0]} ⏻
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[88px_minmax(0,1fr)] lg:grid-cols-[96px_minmax(0,1fr)_400px]">
        {/* categories */}
        <nav className="no-scrollbar flex flex-col gap-1 overflow-y-auto bg-char-700 p-2">
          <button onClick={() => setCat("custom")} className={`rounded-xl p-2 text-center text-[11px] font-bold leading-tight ${cat === "custom" ? "bg-tomato text-white" : "bg-white/5 text-cream hover:bg-white/10"}`}>
            <span className="mb-1 block text-2xl">🎨</span>Custom pizza
          </button>
          {catalog.categories.map((c) => (
            <button key={c.id} onClick={() => setCat(c.id)} className={`rounded-xl p-2 text-center text-[11px] font-bold leading-tight ${cat === c.id ? "bg-tomato text-white" : "bg-white/5 text-cream hover:bg-white/10"}`}>
              <span className="mx-auto mb-1 block h-8 w-8">
                {c.icon === "pizza" || c.icon === "detroit" ? (
                  <PizzaArt catalog={catalog} sizeId={catalog.sizes.find((s) => (c.icon === "detroit" ? s.shape === "RECT" : s.shape !== "RECT"))?.id} toppings={catalog.products.find((p) => p.categoryId === c.id)?.toppings ?? {}} board={false} animate={false} scaleBySize={false} className="h-8 w-8" />
                ) : (
                  <ItemArt art={catalog.products.find((p) => p.categoryId === c.id)?.art ?? c.icon} className="h-8 w-8" />
                )}
              </span>
              {c.name.replace("The Toast Theory · ", "")}
            </button>
          ))}
        </nav>

        {/* products */}
        <main className="min-h-0 overflow-y-auto bg-[#F6F3EE] p-3 pb-24 lg:pb-3">
          {cat === "custom" ? (
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              {catalog.sizes.filter((s) => s.inBuilder).map((s) => (
                <button key={s.id} onClick={() => setBuilder({ initial: { sizeId: s.id, crustId: catalog.crusts[0]?.id } })} className="card flex flex-col items-center p-4 hover:border-tomato">
                  <PizzaArt catalog={catalog} sizeId={s.id} toppings={{}} board={false} animate={false} className="h-24 w-24" />
                  <p className="mt-2 font-bold">Build · {s.name}</p>
                  <p className="text-sm text-char-400">base {money(s.basePrice)}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              {products.map((p) =>
                p.kind === "COMBO" ? (
                  <button key={p.id} onClick={() => setCombo({ productId: p.id })} className="card flex flex-col overflow-hidden text-left active:scale-95">
                    <div className="h-24 overflow-hidden bg-tomato">{p.image ? <img src={p.image} alt="" className="h-full w-full object-cover" /> : <ItemArt art="deal" className="mx-auto h-24 w-24" />}</div>
                    <div className="p-2">
                      <p className="text-sm font-bold leading-tight">{p.name}</p>
                      <p className="text-xs text-char-400">{money(p.variants[0]?.price ?? 0)} · tap to choose</p>
                    </div>
                  </button>
                ) : p.kind === "PIZZA" ? (
                  <div key={p.id} className="card flex flex-col overflow-hidden">
                    <button onClick={() => setBuilder({ initial: { productId: p.id, sizeId: p.variants[0]?.sizeId } })} className="relative bg-char p-2" title="Customise">
                      <PizzaArt catalog={catalog} sizeId={p.variants[0]?.sizeId} toppings={p.toppings} board={false} animate={false} scaleBySize={false} className="mx-auto h-24 w-24" />
                      <span className="absolute right-2 top-2 rounded bg-white/90 px-1.5 text-[10px] font-bold">✎ edit</span>
                    </button>
                    <p className="px-2 pt-2 text-sm font-bold leading-tight">{p.name}</p>
                    <div className={`grid gap-1 p-2 ${p.variants.length > 1 ? "grid-cols-3" : "grid-cols-1"}`}>
                      {p.variants.map((v) => (
                        <button
                          key={v.id}
                          onClick={() => addLine({ kind: "PIZZA", productId: p.id, sizeId: v.sizeId!, crustId: catalog.crusts[0]?.id, toppings: { ...p.toppings }, quantity: 1 })}
                          className="rounded-lg bg-tomato py-2 text-xs font-bold leading-tight text-white active:scale-95"
                        >
                          {catalog.sizes.find((s) => s.id === v.sizeId)?.short ?? v.name}
                          <span className="block text-[11px] font-normal opacity-90">{v.price}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div key={p.id} className="card flex flex-col overflow-hidden">
                    <button onClick={() => addLine({ kind: "ITEM", productId: p.id, variantId: p.variants[0].id, quantity: 1 })} className="flex flex-1 flex-col items-center p-2 active:scale-95">
                      <ItemArt art={p.art} className="h-16 w-16" />
                      <p className="mt-1 text-center text-sm font-bold leading-tight">{p.name}</p>
                      {p.variants.length === 1 && <p className="text-xs text-char-400">{money(p.variants[0].price)}</p>}
                    </button>
                    {p.variants.length > 1 && (
                      <div className="grid grid-cols-2 gap-1 p-2 pt-0">
                        {p.variants.map((v) => (
                          <button key={v.id} onClick={() => addLine({ kind: "ITEM", productId: p.id, variantId: v.id, quantity: 1 })} className="rounded-lg bg-char py-1.5 text-xs font-bold text-cream">
                            {v.name} <span className="opacity-70">{v.price}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {catalog.addons.filter((a) => a.categoryId === p.categoryId).map((a) => (
                      <button key={a.id} onClick={() => addLine({ kind: "ITEM", productId: p.id, variantId: p.variants[0].id, addons: { [a.id]: 1 }, quantity: 1 })} className="mx-2 mb-2 rounded-lg bg-mustard/40 py-1 text-[11px] font-bold">
                        + {a.name} ({a.price})
                      </button>
                    ))}
                  </div>
                ),
              )}
            </div>
          )}
        </main>

        {/* ticket — side panel on large screens, sheet on small */}
        <aside className="hidden min-h-0 border-l border-char-100 lg:block">{TicketPanel}</aside>
      </div>
      <button onClick={() => setTicketOpen(true)} className="btn-primary fixed bottom-4 right-4 z-30 h-14 shadow-xl lg:hidden">
        🧾 Ticket ({count}) · {money(quote?.total ?? 0)}
      </button>
      {ticketOpen && (
        <div className="fixed inset-0 z-40 flex justify-end bg-char/50 lg:hidden" onClick={() => setTicketOpen(false)}>
          <div className="h-full w-full max-w-md" onClick={(e) => e.stopPropagation()}>{TicketPanel}</div>
        </div>
      )}

      {/* builder */}
      <Modal open={!!builder} onClose={() => setBuilder(null)} title={builder?.editKey ? "Edit pizza" : "Customise pizza"} wide>
        {builder && (
          <PizzaBuilder
            catalog={catalog}
            initial={builder.initial}
            variant="embedded"
            confirmLabel={builder.editKey ? "Update" : "Add"}
            onConfirm={(l) => {
              if (builder.editKey) setLines((ls) => ls.map((x) => (x.key === builder.editKey ? { ...l, key: lineKey(l) + "#" + Math.random().toString(36).slice(2, 7) } : x)));
              else addLine(l);
              setBuilder(null);
            }}
          />
        )}
      </Modal>

      <ComboPicker
        catalog={catalog}
        open={!!combo}
        productId={combo?.productId}
        initial={combo?.line}
        onClose={() => setCombo(null)}
        confirmLabel={combo?.editKey ? "Update" : "Add"}
        onConfirm={(l) => {
          if (combo?.editKey) setLines((ls) => ls.map((x) => (x.key === combo.editKey ? { ...l, key: lineKey(l) + "#" + Math.random().toString(36).slice(2, 7) } : x)));
          else addLine(l);
          setCombo(null);
        }}
      />
      <Modal open={rewardsOpen} onClose={() => setRewardsOpen(false)} title={`Use points · ${Math.max(0, pointsLeft).toLocaleString()} available`}>
        <ul className="space-y-2">
          {catalog.rewards.map((r) => {
            const ok = pointsLeft >= r.points;
            const prod = catalog.products.find((x) => x.id === r.productId);
            return (
              <li key={r.id} className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${ok ? "border-char-200" : "border-char-100 opacity-50"}`}>
                <div>
                  <p className="font-bold">{r.name}</p>
                  <p className="text-xs text-char-400">{r.points.toLocaleString()} points</p>
                </div>
                <button disabled={!ok} className="btn-primary btn-sm" onClick={() => { setLines((ls) => [...ls, { kind: prod?.kind === "PIZZA" ? "PIZZA" : "ITEM", productId: r.productId, rewardId: r.id, quantity: 1, key: `reward-${r.id}-${Math.random().toString(36).slice(2, 6)}` }]); setRewardsOpen(false); }}>Claim</button>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-char-400">Points come off when the order is saved, and go back if it&apos;s voided.</p>
      </Modal>

      {/* discount */}
      <DiscountModal open={discountOpen} onClose={() => setDiscountOpen(false)} subtotal={quote?.subtotal ?? 0} needsPin={!["OWNER", "MANAGER"].includes(staff.role)} value={discount} onApply={(d) => { setDiscount(d); setDiscountOpen(false); }} />

      {/* payment */}
      {paying && quote && <PayModal total={quote.total} onClose={() => setPaying(false)} onPay={submit} />}

      {/* done */}
      <Modal open={!!done} onClose={() => setDone(null)} title="Order saved">
        {done && (
          <div className="text-center">
            <p className="font-display text-6xl">#{1000 + done.number}</p>
            <p className="mt-1 text-char-400">{done.type.replace("_", "-")} · {money(done.total)} · {done.paymentStatus === "PAID" ? "Paid" : "Unpaid"}</p>
            {done.changeGiven != null && done.changeGiven > 0 && <p className="mt-4 rounded-xl bg-mustard p-4 font-display text-3xl">Change: {money(done.changeGiven)}</p>}
            <div className="mt-6 grid grid-cols-2 gap-2">
              <button className="btn-ghost" onClick={() => printer.printReceipt(done)}>🧾 Receipt</button>
              <button className="btn-ghost" onClick={() => printer.printKot(done)}>🔥 Kitchen ticket</button>
              <button className="btn-primary col-span-2 h-14 text-lg" onClick={() => setDone(null)}>New order</button>
            </div>
          </div>
        )}
      </Modal>

      <OrdersPanel open={ordersOpen} onClose={() => setOrdersOpen(false)} orders={orders} reload={loadOrders} printer={printer} toast={toast} riders={riders} isManager={["OWNER", "MANAGER"].includes(staff.role)} onSettle={async (o, pay) => {
        const r = await fetch(`/api/staff/orders/${o.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pay }) });
        const j = await r.json();
        if (!r.ok) return toast(j.error, true);
        await printer.printReceipt(j, { drawer: pay.method === "CASH" });
        void loadOrders();
        void loadShift();
      }} />
      <Modal open={shiftOpen} onClose={() => setShiftOpen(false)} title="Shift & cash drawer">
        <ShiftModal summary={shift} staff={staff} onChange={(s) => { setShift(s); if (!s) setShiftOpen(false); }} print={print} printer={printer} />
      </Modal>
    </div>
  );
}

function DiscountModal({ open, onClose, subtotal, needsPin, value, onApply }: { open: boolean; onClose: () => void; subtotal: number; needsPin: boolean; value: { amount: number; note: string } | null; onApply: (d: { amount: number; note: string; pin?: string } | null) => void }) {
  const [kind, setKind] = useState<"%" | "Rs">("%");
  const [v, setV] = useState("");
  const [note, setNote] = useState("");
  const [pin, setPin] = useState("");
  const amount = kind === "%" ? Math.round((subtotal * Math.min(100, Number(v) || 0)) / 100) : Number(v) || 0;
  return (
    <Modal open={open} onClose={onClose} title="Discount">
      <div className="mb-3 flex gap-2">
        {(["%", "Rs"] as const).map((k) => (
          <button key={k} onClick={() => setKind(k)} className={`flex-1 rounded-lg py-2 font-bold ${kind === k ? "bg-char text-cream" : "bg-char-50"}`}>{k === "%" ? "Percent" : "Amount"}</button>
        ))}
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        {(kind === "%" ? ["5", "10", "15", "20", "50", "100"] : ["100", "200", "500", "1000"]).map((q) => (
          <button key={q} onClick={() => setV(q)} className="rounded-lg bg-cream-200 px-3 py-2 font-bold">{kind === "%" ? `${q}%` : `Rs ${q}`}</button>
        ))}
      </div>
      <Keypad value={v} onChange={setV} max={6} />
      <input className="input mt-3" placeholder="Reason (staff meal, complaint, friend…)" value={note} onChange={(e) => setNote(e.target.value)} />
      {needsPin && <input className="input mt-2" type="password" inputMode="numeric" placeholder="Manager PIN" value={pin} onChange={(e) => setPin(e.target.value)} />}
      <p className="mt-3 text-center font-bold">= −{money(amount)}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button className="btn-ghost" onClick={() => onApply(null)} disabled={!value}>Remove</button>
        <button className="btn-primary" disabled={!amount || (needsPin && pin.length < 4)} onClick={() => onApply({ amount, note: note || (kind === "%" ? `${v}% off` : "Discount"), pin: pin || undefined })}>Apply</button>
      </div>
    </Modal>
  );
}
