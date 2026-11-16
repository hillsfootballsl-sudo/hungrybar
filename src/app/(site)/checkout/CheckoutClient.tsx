"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/components/cart";
import { useCatalog } from "@/components/CatalogContext";
import { type Me, PhoneLogin } from "@/components/site/PhoneLogin";
import { unavailableAt } from "@/lib/availability";
import { money, priceLine } from "@/lib/pricing";
import { colomboDateKey } from "@/lib/time";

type Zone = { id: string; name: string; fee: number; eta: number };
type Quote = { subtotal: number; promoDiscount: number; promoError?: string; loyaltyAvailable: boolean; loyaltyDiscount: number; discount: number; deliveryFee: number; total: number };
type SavedAddress = { label: string; address: string; landmark?: string; zoneId?: string };

export function CheckoutClient({ zones, payhere, accepting, prepMinutes }: { zones: Zone[]; payhere: boolean; accepting: boolean; prepMinutes: number }) {
  const cat = useCatalog();
  const cart = useCart();
  const router = useRouter();
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [type, setType] = useState<"DELIVERY" | "TAKEAWAY" | "DINE_IN">("DELIVERY");
  const [name, setName] = useState("");
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? "");
  const [address, setAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [when, setWhen] = useState<string>("ASAP");
  const [pay, setPay] = useState<"CASH" | "PAYHERE">("CASH");
  const [promo, setPromo] = useState("");
  const [promoApplied, setPromoApplied] = useState("");
  const [redeem, setRedeem] = useState(false);
  const [note, setNote] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/me").then((r) => r.json()).then((j) => {
      setMe(j.customer);
      if (j.customer?.name) setName(j.customer.name);
      const a = (j.customer?.addresses as SavedAddress[] | undefined)?.[0];
      if (a) {
        setAddress(a.address);
        setLandmark(a.landmark ?? "");
        if (a.zoneId) setZoneId(a.zoneId);
      }
    });
  }, []);
  useEffect(() => {
    if (cart.tableToken) setType("DINE_IN");
  }, [cart.tableToken]);

  const priced = cart.lines.map((l) => priceLine(cat, l));
  const closedNow = useMemo(() => unavailableAt(cat, cart.lines), [cat, cart.lines]);

  // time slots for the next ~2 days where every item is available
  const slots = useMemo(() => {
    const out: { iso: string; label: string }[] = [];
    const now = Date.now() + prepMinutes * 60_000;
    const start = Math.ceil(now / (15 * 60_000)) * 15 * 60_000;
    for (let t = start; t < start + 48 * 3600_000 && out.length < 80; t += 30 * 60_000) {
      const d = new Date(t);
      if (unavailableAt(cat, cart.lines, d).length) continue;
      const key = colomboDateKey(d);
      const today = colomboDateKey();
      const day = key === today ? "Today" : "Tomorrow";
      const label = `${day}, ${d.toLocaleTimeString("en-GB", { timeZone: "Asia/Colombo", hour: "numeric", minute: "2-digit", hour12: true })}`;
      out.push({ iso: d.toISOString(), label });
    }
    return out;
  }, [cat, cart.lines, prepMinutes]);

  useEffect(() => {
    if (closedNow.length && when === "ASAP" && slots[0]) setWhen(slots[0].iso);
  }, [closedNow.length, when, slots]);

  useEffect(() => {
    if (!cart.lines.length) return;
    const t = setTimeout(async () => {
      const r = await fetch("/api/checkout/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines: cart.lines, type, zoneId: type === "DELIVERY" ? zoneId : null, promoCode: promoApplied || null, redeemLoyalty: redeem }),
      });
      const j = await r.json();
      if (r.ok) setQuote(j);
      else setErr(j.error);
    }, 250);
    return () => clearTimeout(t);
  }, [cart.lines, type, zoneId, promoApplied, redeem, me]);

  const locate = () =>
    navigator.geolocation?.getCurrentPosition(
      (p) => setGeo({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setErr("Couldn't get your location — please type your address"),
      { enableHighAccuracy: true, timeout: 10000 },
    );

  const place = async () => {
    setErr(null);
    setBusy(true);
    try {
      const r = await fetch("/api/checkout/place", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: cart.lines,
          type,
          zoneId: type === "DELIVERY" ? zoneId : null,
          address: type === "DELIVERY" ? address : null,
          landmark: type === "DELIVERY" ? landmark : null,
          lat: geo?.lat ?? null,
          lng: geo?.lng ?? null,
          tableToken: type === "DINE_IN" ? cart.tableToken : null,
          scheduledFor: when === "ASAP" ? null : when,
          promoCode: promoApplied || null,
          redeemLoyalty: redeem,
          paymentMethod: pay,
          name,
          note: note || null,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      // remember the address for next time
      if (me && type === "DELIVERY") {
        const list = ((me.addresses as SavedAddress[]) ?? []).filter((a) => a.address !== address);
        void fetch("/api/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, addresses: [{ label: "Home", address, landmark, zoneId }, ...list].slice(0, 5) }) });
      }
      if (j.pay) {
        const s = await fetch(`/api/payhere/start?order=${j.id}`).then((x) => x.json());
        if (s.action) {
          cart.clear();
          const f = document.createElement("form");
          f.method = "POST";
          f.action = s.action;
          for (const [k, v] of Object.entries(s.fields)) {
            const i = document.createElement("input");
            i.type = "hidden";
            i.name = k;
            i.value = String(v ?? "");
            f.appendChild(i);
          }
          document.body.appendChild(f);
          f.submit();
          return;
        }
      }
      cart.clear();
      router.push(`/order/${j.id}?new=1`);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };

  if (!cart.ready || me === undefined) return <div className="h-[70vh]" />;
  if (!cart.lines.length)
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="h-display text-5xl">Nothing here yet</h1>
        <p className="mt-2 text-char-500">Your cart is empty.</p>
        <Link href="/build" className="btn-primary mt-6">Build a pizza</Link>
      </div>
    );

  const needsLogin = type !== "DINE_IN" && !me;
  const zone = zones.find((z) => z.id === zoneId);
  const canPlace = accepting && !needsLogin && name.trim() && (type !== "DELIVERY" || (address.trim().length > 5 && zoneId)) && priced.every((p) => p.valid) && !busy;

  const Section = ({ n, title, children }: { n: number; title: string; children: React.ReactNode }) => (
    <section className="card p-5 md:p-6">
      <h2 className="mb-4 flex items-center gap-3 font-condensed text-2xl uppercase">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-tomato font-display text-base text-white">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );

  return (
    <div className="grain mx-auto max-w-6xl px-4 pb-32 pt-8">
      <h1 className="h-display text-5xl md:text-6xl">Checkout</h1>
      {!accepting && <p className="mt-4 rounded-xl border-2 border-char bg-mustard p-4 font-bold">We&apos;re not taking online orders right now. Please call us!</p>}
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {Section({
            n: 1,
            title: "How do you want it?",
            children: (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {(cart.tableToken ? ["DINE_IN", "TAKEAWAY", "DELIVERY"] : ["DELIVERY", "TAKEAWAY"]).map((t) => (
                  <button key={t} onClick={() => setType(t as typeof type)} className={`rounded-xl border-2 border-char p-4 text-left transition ${type === t ? "bg-char text-cream shadow-retro-red" : "bg-white"}`}>
                    <span className="text-2xl">{t === "DELIVERY" ? "🛵" : t === "TAKEAWAY" ? "🛍️" : "🍽️"}</span>
                    <p className="mt-1 font-bold">{t === "DELIVERY" ? "Delivery" : t === "TAKEAWAY" ? "Pickup" : `Table ${cart.tableLabel}`}</p>
                    <p className={`text-xs ${type === t ? "text-cream/70" : "text-char-400"}`}>{t === "DELIVERY" ? "Free around Dehiwala" : t === "TAKEAWAY" ? "Hill Food Square" : "We'll bring it over"}</p>
                  </button>
                ))}
              </div>
            ),
          })}

          {Section({
            n: 2,
            title: type === "DINE_IN" ? "Your name" : "Your details",
            children: (
              <div className="space-y-4">
                {needsLogin ? (
                  <PhoneLogin compact onDone={(c) => { setMe(c); if (c.name) setName(c.name); }} />
                ) : (
                  <>
                    {me && (
                      <div className="flex items-center justify-between rounded-xl bg-cream-200 p-3 text-sm">
                        <span>Signed in as <b>+{me.phone}</b></span>
                        <span className="chip bg-white">⭐ {me.stamps} stamps</span>
                      </div>
                    )}
                    <div>
                      <label className="label" htmlFor="name">Name</label>
                      <input id="name" className="input" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="Who's this for?" autoComplete="name" />
                    </div>
                    {type === "DINE_IN" && !me && <p className="text-xs text-char-400">Want stamps for this order? <button className="font-bold underline" onClick={() => setType("TAKEAWAY")}>Sign in with your phone</button> first, then switch back.</p>}
                  </>
                )}
              </div>
            ),
          })}

          {type === "DELIVERY" &&
            Section({
              n: 3,
              title: "Delivery address",
              children: (
                <div className="space-y-4">
                  {((me?.addresses as SavedAddress[]) ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {(me!.addresses as SavedAddress[]).map((a, i) => (
                        <button key={i} onClick={() => { setAddress(a.address); setLandmark(a.landmark ?? ""); if (a.zoneId) setZoneId(a.zoneId); }} className="chip bg-white normal-case">
                          📍 {a.address.slice(0, 28)}
                        </button>
                      ))}
                    </div>
                  )}
                  <div>
                    <label className="label" htmlFor="zone">Area</label>
                    <select id="zone" className="input" value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
                      {zones.map((z) => (
                        <option key={z.id} value={z.id}>{z.name} — {z.fee === 0 ? "FREE delivery" : `Rs. ${z.fee}`}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label" htmlFor="addr">Address</label>
                    <textarea id="addr" className="input min-h-[84px]" value={address} maxLength={300} onChange={(e) => setAddress(e.target.value)} placeholder="No. 12, Galle Road, Dehiwala" autoComplete="street-address" />
                  </div>
                  <div>
                    <label className="label" htmlFor="lm">Landmark (helps our rider)</label>
                    <input id="lm" className="input" value={landmark} maxLength={200} onChange={(e) => setLandmark(e.target.value)} placeholder="Opposite the mosque, blue gate" />
                  </div>
                  <button onClick={locate} className={`btn-ghost btn-sm ${geo ? "!bg-basil !text-white" : ""}`}>{geo ? "📍 Location pinned ✓" : "📍 Pin my exact location"}</button>
                </div>
              ),
            })}

          {Section({
            n: type === "DELIVERY" ? 4 : 3,
            title: "When?",
            children: (
              <div className="space-y-3">
                {closedNow.length > 0 && (
                  <p className="rounded-xl bg-mustard/30 p-3 text-sm"><b>{closedNow.join(", ")}</b> {closedNow.length > 1 ? "aren't" : "isn't"} being served right now — pick a time below.</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {!closedNow.length && (
                    <button onClick={() => setWhen("ASAP")} className={`rounded-xl border-2 border-char px-4 py-2 font-bold ${when === "ASAP" ? "bg-char text-cream" : "bg-white"}`}>
                      ⚡ ASAP {type === "DELIVERY" && zone ? `(~${zone.eta} min)` : `(~${prepMinutes} min)`}
                    </button>
                  )}
                  <select className={`input w-auto ${when !== "ASAP" ? "!border-char !bg-char text-cream" : ""}`} value={when === "ASAP" ? "" : when} onChange={(e) => setWhen(e.target.value || "ASAP")}>
                    <option value="">🕒 Schedule for later…</option>
                    {slots.map((s) => (
                      <option key={s.iso} value={s.iso}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            ),
          })}

          {Section({
            n: type === "DELIVERY" ? 5 : 4,
            title: "Payment",
            children: (
              <div className="grid gap-3 sm:grid-cols-2">
                <button onClick={() => setPay("CASH")} className={`rounded-xl border-2 border-char p-4 text-left ${pay === "CASH" ? "bg-char text-cream shadow-retro-red" : "bg-white"}`}>
                  <p className="text-2xl">💵</p>
                  <p className="font-bold">Cash {type === "DELIVERY" ? "on delivery" : type === "DINE_IN" ? "at the table" : "on pickup"}</p>
                </button>
                <button disabled={!payhere} onClick={() => setPay("PAYHERE")} className={`rounded-xl border-2 border-char p-4 text-left disabled:opacity-40 ${pay === "PAYHERE" ? "bg-char text-cream shadow-retro-red" : "bg-white"}`}>
                  <p className="text-2xl">💳</p>
                  <p className="font-bold">Card / eZ Cash</p>
                  <p className="text-xs opacity-70">{payhere ? "Secure via PayHere" : "Coming soon"}</p>
                </button>
              </div>
            ),
          })}
        </div>

        {/* Summary */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card overflow-hidden">
            <div className="checker h-4 border-b-2 border-char" />
            <div className="p-5">
              <h2 className="font-condensed text-2xl uppercase">Your order</h2>
              <ul className="mt-3 divide-y divide-dashed divide-char/20">
                {priced.map((p) => (
                  <li key={p.line.key} className="flex justify-between gap-3 py-2 text-sm">
                    <div>
                      <p className="font-bold">{p.line.quantity}× {p.name}</p>
                      <p className="text-xs text-char-400">{[p.sizeName, p.summary].filter(Boolean).join(" · ")}</p>
                    </div>
                    <span className="whitespace-nowrap font-bold">{money(p.lineTotal)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex gap-2">
                <input className="input py-2 text-sm uppercase" placeholder="Promo code" value={promo} onChange={(e) => setPromo(e.target.value)} />
                <button className="btn-ghost btn-sm" onClick={() => setPromoApplied(promo.trim().toUpperCase())}>Apply</button>
              </div>
              {quote?.promoError && promoApplied && <p className="mt-1 text-xs font-bold text-tomato">{quote.promoError}</p>}
              {quote?.loyaltyAvailable && (
                <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-xl border-2 border-char bg-mustard p-3">
                  <input type="checkbox" className="h-5 w-5 accent-tomato" checked={redeem} onChange={(e) => setRedeem(e.target.checked)} />
                  <span className="text-sm font-bold">🎉 Your free pizza is ready! Use it on this order{redeem && !quote.loyaltyDiscount ? " — add a 1-person pizza" : ""}</span>
                </label>
              )}
              <textarea className="input mt-3 min-h-[60px] text-sm" placeholder="Note for us (optional)" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} />
              <dl className="mt-4 space-y-1 text-sm">
                <div className="flex justify-between"><dt>Subtotal</dt><dd>{money(quote?.subtotal ?? 0)}</dd></div>
                {!!quote?.promoDiscount && <div className="flex justify-between text-basil"><dt>Promo</dt><dd>−{money(quote.promoDiscount)}</dd></div>}
                {!!quote?.loyaltyDiscount && <div className="flex justify-between text-basil"><dt>Free pizza</dt><dd>−{money(quote.loyaltyDiscount)}</dd></div>}
                {type === "DELIVERY" && <div className="flex justify-between"><dt>Delivery</dt><dd>{quote?.deliveryFee ? money(quote.deliveryFee) : "FREE"}</dd></div>}
              </dl>
              <div className="mt-3 flex items-baseline justify-between border-t-2 border-char pt-3">
                <span className="font-bold uppercase">Total</span>
                <span className="font-display text-3xl text-tomato">{money(quote?.total ?? 0)}</span>
              </div>
              {err && <p className="mt-3 rounded-lg bg-tomato-50 p-2 text-sm font-bold text-tomato-700">{err}</p>}
              <button disabled={!canPlace} onClick={place} className="btn-primary mt-4 w-full text-lg">
                {busy ? "Placing…" : pay === "PAYHERE" ? "Pay & place order" : "Place order"}
              </button>
              {needsLogin && <p className="mt-2 text-center text-xs text-char-400">Verify your phone number to continue</p>}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
