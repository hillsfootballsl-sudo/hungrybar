"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ItemArt } from "@/components/ItemArt";
import { PizzaArt } from "@/components/PizzaArt";
import { money, pointsFor } from "@/lib/pricing";
import { useStore } from "./StoreProvider";
import { Icon, RewardsMark, Sheet } from "./ui";

export function usePromo() {
  const [code, setCode] = useState("");
  useEffect(() => {
    try {
      setCode(localStorage.getItem("hb2_promo") ?? "");
    } catch {}
  }, []);
  const set = (c: string) => {
    setCode(c);
    try {
      localStorage.setItem("hb2_promo", c);
    } catch {}
  };
  return [code, set] as const;
}

function EmptyBox() {
  return (
    <svg viewBox="0 0 200 140" className="mx-auto h-36 w-48" fill="none" stroke="#262626" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
      <path d="M20 80 L100 112 L180 80 L100 52 Z" fill="#fff" />
      <path d="M20 80 V92 L100 124 L180 92 V80" />
      <path d="M100 112 V124" />
      <path d="M20 80 L36 30 L120 8 L104 58" fill="#fff" />
      <path d="M44 36 L112 18" stroke="#EE4224" />
      <path d="M150 20 q14 6 6 16" />
    </svg>
  );
}

export function CartPanel({ variant = "sidebar", onClose }: { variant?: "sidebar" | "sheet" | "page"; onClose?: () => void }) {
  const s = useStore();
  const router = useRouter();
  const cat = s.catalog;
  const [promo, setPromo] = usePromo();
  const [promoOpen, setPromoOpen] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [rewardsOpen, setRewardsOpen] = useState(false);
  const empty = s.priced.length === 0;
  const fee = s.mode.type === "DELIVERY" ? s.zone?.fee ?? 0 : 0;
  const pointsLeft = (s.me?.points ?? 0) - s.pointsInCart;
  const earn = pointsFor(s.subtotal, s.config.rewards);

  const checkout = () =>
    s.requireMode(() => {
      onClose?.();
      router.push("/checkout");
    });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className={`flex items-center justify-between px-5 pb-3 pt-5 ${variant === "sheet" ? "pr-16" : ""}`}>
        <h2 className={`font-extrabold ${variant === "page" ? "text-3xl" : "text-xl"}`}>Your Cart</h2>
        {!empty && <span className="text-sm font-bold text-char-400">{s.count} item{s.count === 1 ? "" : "s"}</span>}
      </div>
      {s.mode.type && (
        <button onClick={() => s.openLocation()} className="mx-5 mb-2 flex items-center gap-2 rounded-xl bg-char-50 px-3 py-2 text-left text-sm font-bold">
          <Icon name={s.mode.type === "DELIVERY" ? "bike" : "store"} className="h-4 w-4 text-tomato" />
          <span className="flex-1 truncate">{s.mode.type === "DELIVERY" ? `Delivery to ${s.zone?.name ?? "…"}` : s.mode.type === "DINE_IN" ? `Table ${s.mode.tableLabel}` : "Pickup at Hill Food Square"}</span>
          <span className="text-tomato underline">Change</span>
        </button>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 scrollbar-thin">
        {empty ? (
          <div className="py-10 text-center">
            <EmptyBox />
            <p className="mt-4 text-xl font-extrabold">Your cart is feeling<br />a little empty</p>
            <p className="mt-1 text-sm font-bold italic text-char-400">Add something delicious to get started!</p>
            {variant !== "sidebar" && (
              <Link href="/menu" onClick={onClose} className="btn-primary mt-5">Browse the menu</Link>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-char-100">
            {s.priced.map((p) => {
              const prod = cat.products.find((x) => x.id === p.line.productId);
              return (
                <li key={p.line.key} className="flex gap-3 py-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-char-50">
                    {prod?.image ? (
                      <img src={prod.image} alt="" className="h-full w-full object-cover" />
                    ) : p.line.kind === "PIZZA" ? (
                      <div className="grid h-full w-full place-items-center bg-char"><PizzaArt catalog={cat} sizeId={p.line.sizeId} crustId={p.line.crustId} toppings={p.line.toppings ?? {}} board={false} animate={false} scaleBySize={false} className="h-14 w-14" /></div>
                    ) : (
                      <div className="grid h-full w-full place-items-center bg-cream-200"><ItemArt art={p.line.rewardId ? cat.products.find((x) => x.id === cat.rewards.find((r) => r.id === p.line.rewardId)?.productId)?.art : prod?.art} className="h-11 w-11" /></div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-2">
                      <p className="text-sm font-extrabold leading-tight">{p.line.rewardId && "🎁 "}{p.name}</p>
                      <p className="whitespace-nowrap text-sm font-extrabold">{p.line.rewardId ? <span className="text-basil">FREE</span> : money(p.lineTotal)}</p>
                    </div>
                    <p className="text-xs text-char-400">{[p.sizeName, p.crustName].filter(Boolean).join(" · ")}</p>
                    {p.summary && <p className="line-clamp-2 text-xs text-tomato-700">{p.summary}</p>}
                    {!p.valid && <p className="text-xs font-bold text-tomato">{p.error}</p>}
                    <div className="mt-1.5 flex items-center gap-3">
                      {!p.line.rewardId ? (
                        <div className="flex h-8 items-center rounded-full border border-char-200">
                          <button className="grid h-8 w-8 place-items-center" onClick={() => s.setQty(p.line.key, p.line.quantity - 1)} aria-label="Less"><Icon name={p.line.quantity === 1 ? "trash" : "minus"} className="h-3.5 w-3.5" /></button>
                          <span className="w-5 text-center text-sm font-bold">{p.line.quantity}</span>
                          <button className="grid h-8 w-8 place-items-center" onClick={() => s.setQty(p.line.key, p.line.quantity + 1)} aria-label="More"><Icon name="plus" className="h-3.5 w-3.5" /></button>
                        </div>
                      ) : (
                        <button className="py-2 text-sm font-bold text-char-400 underline" onClick={() => s.setQty(p.line.key, 0)}>Remove</button>
                      )}
                      {(p.line.kind === "PIZZA" || p.line.kind === "COMBO") && !p.line.rewardId && (
                        <button className="px-2 py-2 text-sm font-bold text-tomato underline" onClick={() => (p.line.kind === "PIZZA" ? s.openCustomise({ editKey: p.line.key }) : s.openCombo({ productId: p.line.productId!, editKey: p.line.key }))}>Edit</button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="space-y-2.5 border-t border-char-100 p-4 md:space-y-3 md:p-5">
        {/* rewards */}
        {s.config.rewards.enabled && (
          <div className="overflow-hidden rounded-2xl bg-char text-white">
            <div className="flex items-center gap-3 p-3 md:p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mustard text-char"><Icon name="star" className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                {s.me ? (
                  <>
                    <p className="font-extrabold">{(s.me.points - s.pointsInCart).toLocaleString()} points available</p>
                    <p className="text-xs text-white/70">{empty ? "Add items to earn more" : `You'll earn ~${earn} points on this order`}</p>
                  </>
                ) : (
                  <>
                    <p className="font-extrabold">Don&apos;t miss a bite</p>
                    <p className="text-xs text-white/70">Join Hungry Rewards: {empty ? "earn" : `earn ~${earn}`} points on this order</p>
                  </>
                )}
              </div>
              {s.me ? (
                <button onClick={() => setRewardsOpen(true)} className="btn-mustard btn-sm">Use</button>
              ) : (
                <button onClick={() => s.openLogin()} className="btn-mustard btn-sm">Join</button>
              )}
            </div>
          </div>
        )}
        {/* coupon */}
        <button onClick={() => { setPromoInput(promo); setPromoOpen(true); }} className="flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-char-100 text-left">
          <span className="grid h-11 w-12 place-items-center bg-tomato-50 text-tomato"><Icon name="tag" /></span>
          <span className="flex-1 font-bold text-char-500">{promo ? <>Coupon <span className="text-char">{promo}</span> added</> : "Apply Coupon"}</span>
          <Icon name="right" className="mr-3 h-5 w-5" />
        </button>
        {!empty && (
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span className="font-bold">{money(s.subtotal)}</span></div>
            {s.mode.type === "DELIVERY" && <div className="flex justify-between"><span>Delivery</span><span className="font-bold">{fee ? money(fee) : "FREE"}</span></div>}
            {s.pointsInCart > 0 && <div className="flex justify-between text-basil"><span>Points used</span><span className="font-bold">{s.pointsInCart.toLocaleString()} pts</span></div>}
          </div>
        )}
        <button disabled={empty || s.priced.some((p) => !p.valid)} onClick={checkout} className="btn-primary h-14 w-full text-lg">
          {empty ? "Checkout" : `Checkout · ${money(s.subtotal + fee)}`}
        </button>
      </div>

      <Sheet open={promoOpen} onClose={() => setPromoOpen(false)} label="Apply coupon">
        <h3 className="h-title">Apply coupon</h3>
        <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); setPromo(promoInput.trim().toUpperCase()); setPromoOpen(false); s.showToast(promoInput ? "Coupon saved — checked at checkout" : "Coupon removed"); }}>
          <input className="input uppercase" value={promoInput} onChange={(e) => setPromoInput(e.target.value)} placeholder="Enter code" aria-label="Coupon code" autoFocus />
          <button className="btn-dark">Apply</button>
        </form>
        {promo && <button className="mt-3 text-sm font-bold text-char-500 underline" onClick={() => { setPromo(""); setPromoOpen(false); }}>Remove {promo}</button>}
      </Sheet>

      <Sheet open={rewardsOpen} onClose={() => setRewardsOpen(false)} label="Use your points">
        <RewardsMark className="text-xl" />
        <h3 className="h-title mt-2">Use your points</h3>
        <p className="text-char-500">You have <b>{Math.max(0, pointsLeft).toLocaleString()}</b> points to spend.</p>
        <ul className="mt-4 space-y-2">
          {cat.rewards.map((r) => {
            const ok = pointsLeft >= r.points;
            return (
              <li key={r.id} className={`flex items-center justify-between gap-3 rounded-2xl border p-3 ${ok ? "border-char-200" : "border-char-100 opacity-55"}`}>
                <div>
                  <p className="font-bold">{r.name}</p>
                  <p className="text-xs text-char-400">{r.points.toLocaleString()} points{!ok ? ` · ${(r.points - pointsLeft).toLocaleString()} more needed` : ""}</p>
                </div>
                <button disabled={!ok} onClick={() => { const pr = cat.products.find((x) => x.id === r.productId); s.add({ kind: pr?.kind === "PIZZA" ? "PIZZA" : "ITEM", productId: r.productId, rewardId: r.id, quantity: 1 }, { silent: true }); s.showToast(`${r.name} added`); setRewardsOpen(false); }} className="btn-primary btn-sm">Claim</button>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-char-400">Rewards go with a paid order. Points come off when you place the order and come back if it&apos;s cancelled.</p>
      </Sheet>
    </div>
  );
}

export function CartSheet() {
  const s = useStore();
  return (
    <div className={`fixed inset-0 z-[75] ${s.cartOpen ? "" : "pointer-events-none"}`} aria-hidden={!s.cartOpen}>
      <div className={`absolute inset-0 bg-char/50 transition-opacity ${s.cartOpen ? "opacity-100" : "opacity-0"}`} onClick={() => s.setCartOpen(false)} />
      <aside className={`absolute right-0 top-0 h-[100dvh] w-full max-w-md bg-white shadow-2xl transition-transform duration-300 safe-bottom ${s.cartOpen ? "translate-x-0" : "translate-x-full"}`} role="dialog" aria-label="Your cart">
        <button onClick={() => s.setCartOpen(false)} className="absolute right-3 top-4 z-10 grid h-10 w-10 place-items-center rounded-full hover:bg-char-50" aria-label="Close cart">
          <Icon name="close" />
        </button>
        <CartPanel variant="sheet" onClose={() => s.setCartOpen(false)} />
      </aside>
    </div>
  );
}

/** Floating "view cart" bar on phones while browsing */
export function CartBar() {
  const s = useStore();
  if (!s.count) return null;
  return (
    <button onClick={() => s.setCartOpen(true)} className="fixed inset-x-3 bottom-[calc(74px+env(safe-area-inset-bottom,0px))] z-40 mx-auto flex h-14 max-w-xl items-center justify-between rounded-2xl bg-tomato px-5 font-extrabold text-white shadow-2xl lg:hidden">
      <span className="flex items-center gap-2"><Icon name="bag" className="h-5 w-5" /> {s.count} item{s.count === 1 ? "" : "s"}</span>
      <span>View cart · {money(s.subtotal)}</span>
    </button>
  );
}
