"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { unavailableAt } from "@/lib/availability";
import { money } from "@/lib/pricing";
import { usePromo } from "./CartPanel";
import { useSlots } from "./LocationModal";
import { useStore } from "./StoreProvider";
import { Icon } from "./ui";

type Quote = { subtotal: number; promoDiscount: number; promoError?: string; discount: number; deliveryFee: number; total: number; pointsNeeded: number; pointsBalance: number | null; pointsEarnable: number };

function Step({ n, title, children, action }: { n: number; title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="card p-5 md:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-3 text-lg font-extrabold">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-char text-sm text-white">{n}</span>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function CheckoutClient() {
  const s = useStore();
  const router = useRouter();
  const [promo, setPromo] = usePromo();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [pay, setPay] = useState<"CASH" | "PAYHERE">("CASH");
  const [note, setNote] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const m = s.mode;
  const slots = useSlots();

  useEffect(() => {
    if (s.me) {
      setName((n) => n || s.me!.name || "");
      const a = s.me.addresses.find((x) => x.zoneId === m.zoneId) ?? s.me.addresses[0];
      if (a && !address) {
        setAddress(a.address);
        setLandmark(a.landmark ?? "");
      }
    }
  }, [s.me]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (s.ready && !m.type) s.openLocation();
  }, [s.ready]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!s.lines.length || !m.type) return;
    const t = setTimeout(async () => {
      const r = await fetch("/api/checkout/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lines: s.lines, type: m.type, zoneId: m.type === "DELIVERY" ? m.zoneId : null, promoCode: promo || null }) });
      const j = await r.json();
      if (r.ok) {
        setQuote(j);
        setErr(null);
      } else setErr(j.error);
    }, 200);
    return () => clearTimeout(t);
  }, [s.lines, m.type, m.zoneId, promo, s.me]);

  if (!s.ready || s.me === undefined) return <div className="h-[60vh]" />;
  if (!s.lines.length)
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-3xl font-extrabold">Your cart is empty</h1>
        <Link href="/menu" className="btn-primary mt-6">Browse the menu</Link>
      </div>
    );

  const needsLogin = m.type !== "DINE_IN" && !s.me;
  const scheduled = m.when !== "ASAP" ? new Date(m.when) : null;
  const closedNow = unavailableAt(s.catalog, s.lines, scheduled ?? new Date());
  const canPlace = s.config.accepting && !!m.type && !needsLogin && name.trim() && (m.type !== "DELIVERY" || (address.trim().length > 5 && m.zoneId)) && !closedNow.length && !busy && !!quote;

  const place = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/checkout/place", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: s.lines, type: m.type, zoneId: m.type === "DELIVERY" ? m.zoneId : null, address: m.type === "DELIVERY" ? address : null, landmark: m.type === "DELIVERY" ? landmark : null,
          lat: geo?.lat ?? null, lng: geo?.lng ?? null, tableToken: m.type === "DINE_IN" ? m.tableToken : null, scheduledFor: scheduled?.toISOString() ?? null,
          promoCode: promo || null, paymentMethod: pay, name, note: note || null,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      if (s.me && m.type === "DELIVERY") {
        const rest = s.me.addresses.filter((a) => a.address !== address);
        void fetch("/api/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, addresses: [{ label: "Home", address, landmark, zoneId: m.zoneId ?? undefined }, ...rest].slice(0, 5) }) });
      }
      s.clear();
      setPromo("");
      void s.refreshMe();
      if (j.pay) {
        const st = await fetch(`/api/payhere/start?order=${j.id}`).then((x) => x.json());
        if (st.action) {
          const f = document.createElement("form");
          f.method = "POST";
          f.action = st.action;
          for (const [k, v] of Object.entries(st.fields)) {
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
      router.push(`/order/${j.id}?new=1`);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-32 pt-6 md:px-6">
      <Link href="/menu" className="-ml-1 inline-flex items-center gap-1 px-1 py-2 text-sm font-bold text-char-500"><Icon name="left" className="h-4 w-4" /> Back to menu</Link>
      <h1 className="mt-2 text-3xl font-extrabold md:text-4xl">Checkout</h1>
      {!s.config.accepting && <p className="mt-4 rounded-2xl bg-mustard/30 p-4 font-bold">We&apos;re not taking online orders right now. Please call {s.config.shop.phone}.</p>}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-5">
          <Step n={1} title={needsLogin ? "Sign in to continue" : "Your details"}>
            {needsLogin ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-char-50 p-4">
                <p className="text-sm">Sign in with your mobile number to place the order and <b>earn ~{quote?.pointsEarnable ?? 0} points</b>.</p>
                <button onClick={() => s.openLogin()} className="btn-dark">Sign in with phone</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="co-name">Name</label>
                  <input id="co-name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={60} />
                </div>
                {s.me && (
                  <div>
                    <span className="label">Mobile</span>
                    <p className="flex h-[50px] items-center rounded-xl bg-char-50 px-4 font-bold">+{s.me.phone}</p>
                  </div>
                )}
              </div>
            )}
          </Step>

          <Step n={2} title={m.type === "DELIVERY" ? "Delivery address" : m.type === "DINE_IN" ? "Dine-in" : "Pickup"} action={<button onClick={() => s.openLocation()} className="-my-2 px-1 py-2.5 text-sm font-bold text-tomato underline">Change</button>}>
            {m.type === "DELIVERY" ? (
              <div className="space-y-3">
                <p className="flex items-center gap-2 rounded-xl bg-char-50 px-3 py-2 text-sm font-bold"><Icon name="bike" className="h-4 w-4 text-tomato" /> {s.zone?.name} · {s.zone?.fee ? money(s.zone.fee) : "FREE delivery"} · ~{s.zone?.eta} min</p>
                {(s.me?.addresses.length ?? 0) > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {s.me!.addresses.map((a, i) => (
                      <button key={i} onClick={() => { setAddress(a.address); setLandmark(a.landmark ?? ""); if (a.zoneId) s.setMode({ zoneId: a.zoneId }); }} className={`chip ${address === a.address ? "border-char bg-char text-white" : ""}`}>📍 {a.address.slice(0, 30)}</button>
                    ))}
                  </div>
                )}
                <div>
                  <label className="label" htmlFor="co-addr">House no. & street</label>
                  <textarea id="co-addr" className="input min-h-[80px]" value={address} onChange={(e) => setAddress(e.target.value)} maxLength={300} placeholder="No. 12, Galle Road, Dehiwala" autoComplete="street-address" />
                </div>
                <div>
                  <label className="label" htmlFor="co-lm">Landmark (helps our rider)</label>
                  <input id="co-lm" className="input" value={landmark} onChange={(e) => setLandmark(e.target.value)} maxLength={200} placeholder="Opposite the mosque, blue gate" />
                </div>
                <button onClick={() => navigator.geolocation?.getCurrentPosition((p) => setGeo({ lat: p.coords.latitude, lng: p.coords.longitude }), () => setErr("Couldn't get your location. Please type your address."), { enableHighAccuracy: true, timeout: 10000 })} className={`btn-sm btn ${geo ? "bg-basil text-white" : "btn-ghost"}`}>
                  <Icon name="pin" className="h-4 w-4" /> {geo ? "Exact location pinned" : "Pin my exact location"}
                </button>
              </div>
            ) : m.type === "DINE_IN" ? (
              <p className="font-bold">Table {m.tableLabel}. We&apos;ll bring it to you.</p>
            ) : (
              <p className="font-bold">Pick up at {s.config.shop.address}. Ready in ~{s.config.prepMinutes} minutes.</p>
            )}
            <div className="mt-4 flex items-center justify-between rounded-xl border border-char-100 px-3 py-2.5 text-sm">
              <span className="flex items-center gap-2 font-bold"><Icon name="clock" className="h-4 w-4" /> {scheduled ? `Scheduled: ${scheduled.toLocaleString("en-GB", { timeZone: "Asia/Colombo", weekday: "short", hour: "numeric", minute: "2-digit", hour12: true })}` : "As soon as possible"}</span>
              <button onClick={() => s.openLocation()} className="-my-2 px-1 py-2.5 font-bold text-tomato underline">Change</button>
            </div>
            {closedNow.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-mustard/25 p-3 text-sm font-bold">
                <span>We&apos;re closed at that time.</span>
                {slots[0] && <button onClick={() => s.setMode({ when: slots[0].iso })} className="btn-dark btn-sm">Schedule for {slots[0].day.toLowerCase()} {slots[0].label}</button>}
              </div>
            )}
          </Step>

          <Step n={3} title="Payment">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(
                [
                  ["CASH", "💵", m.type === "DELIVERY" ? "Cash on delivery" : m.type === "DINE_IN" ? "Pay at the table" : "Pay on pickup", "Cash or card at the shop"],
                  ["PAYHERE", "💳", "Card / eZ Cash", s.config.payhere ? "Secure payment by PayHere" : "Coming soon"],
                ] as const
              ).map(([k, icon, t, d]) => (
                <button key={k} disabled={k === "PAYHERE" && !s.config.payhere} onClick={() => setPay(k)} className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition disabled:opacity-45 ${pay === k ? "border-char ring-2 ring-char" : "border-char-100"}`}>
                  <span className="text-2xl">{icon}</span>
                  <span>
                    <span className="block font-bold">{t}</span>
                    <span className="text-xs text-char-400">{d}</span>
                  </span>
                </button>
              ))}
            </div>
            <label className="label mt-4" htmlFor="co-note">Note for us (optional)</label>
            <input id="co-note" className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Ring the bell twice, extra napkins…" />
          </Step>
        </div>

        <aside className="lg:sticky lg:top-[calc(var(--hdr)+16px)] lg:self-start">
          <div className="card overflow-hidden">
            <div className="p-5">
              <h2 className="text-lg font-extrabold">Order summary</h2>
              <ul className="mt-3 divide-y divide-char-100 text-sm">
                {s.priced.map((p) => (
                  <li key={p.line.key} className="flex justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="font-bold">{p.line.quantity}× {p.line.rewardId ? "🎁 " : ""}{p.name}</p>
                      <p className="truncate text-xs text-char-400">{[p.sizeName, p.summary].filter(Boolean).join(" · ")}</p>
                    </div>
                    <span className="whitespace-nowrap font-bold">{p.line.rewardId ? <span className="text-basil">FREE</span> : money(p.lineTotal)}</span>
                  </li>
                ))}
              </ul>
              <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); const v = (new FormData(e.currentTarget).get("code") as string).trim().toUpperCase(); setPromo(v); }}>
                <input name="code" defaultValue={promo} key={promo} className="input py-2.5 uppercase" placeholder="Coupon code" aria-label="Coupon code" />
                <button className="btn-ghost btn-sm">Apply</button>
              </form>
              {quote?.promoError && promo && <p className="mt-1 text-xs font-bold text-tomato">{quote.promoError}</p>}
              <dl className="mt-4 space-y-1.5 text-sm">
                <div className="flex justify-between"><dt>Subtotal</dt><dd className="font-bold">{money(quote?.subtotal ?? s.subtotal)}</dd></div>
                {!!quote?.discount && <div className="flex justify-between text-basil"><dt>Coupon {promo}</dt><dd className="font-bold">−{money(quote.discount)}</dd></div>}
                {m.type === "DELIVERY" && <div className="flex justify-between"><dt>Delivery</dt><dd className="font-bold">{quote?.deliveryFee ? money(quote.deliveryFee) : "FREE"}</dd></div>}
                {!!quote?.pointsNeeded && <div className="flex justify-between text-basil"><dt>Points used</dt><dd className="font-bold">{quote.pointsNeeded.toLocaleString()} pts</dd></div>}
              </dl>
              <div className="mt-3 flex items-baseline justify-between border-t border-char-100 pt-3">
                <span className="font-extrabold">Total</span>
                <span className="text-3xl font-extrabold text-tomato">{money(quote?.total ?? s.subtotal)}</span>
              </div>
              {s.config.rewards.enabled && quote && (
                <p className="mt-2 flex items-center gap-2 rounded-xl bg-mustard/20 px-3 py-2 text-sm font-bold"><Icon name="star" className="h-4 w-4" /> You&apos;ll earn {quote.pointsEarnable} points on this order</p>
              )}
              {err && <p className="mt-3 rounded-xl bg-tomato-50 p-3 text-sm font-bold text-tomato-700">{err}</p>}
              <button disabled={!canPlace} onClick={place} className="btn-primary mt-4 h-14 w-full text-lg">
                {busy ? "Placing…" : pay === "PAYHERE" ? "Pay & place order" : "Place order"}
              </button>
              <p className="mt-2 text-center text-xs text-char-400">By ordering you agree to our <Link href="/terms" className="underline">terms</Link>.</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
