"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useCart } from "@/components/cart";
import { useCatalog } from "@/components/CatalogContext";
import { ItemArt } from "@/components/ItemArt";
import { PizzaArt } from "@/components/PizzaArt";
import { money, priceLine } from "@/lib/pricing";

export function CartDrawer() {
  const cart = useCart();
  const cat = useCatalog();
  const priced = cart.lines.map((l) => priceLine(cat, l));
  const subtotal = priced.reduce((s, p) => s + (p.valid ? p.lineTotal : 0), 0);

  useEffect(() => {
    document.body.style.overflow = cart.open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [cart.open]);

  return (
    <div className={`fixed inset-0 z-[60] ${cart.open ? "" : "pointer-events-none"}`} aria-hidden={!cart.open}>
      <div className={`absolute inset-0 bg-char/60 backdrop-blur-sm transition-opacity ${cart.open ? "opacity-100" : "opacity-0"}`} onClick={() => cart.setOpen(false)} />
      <aside
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-cream-100 shadow-2xl transition-transform duration-300 ${cart.open ? "translate-x-0" : "translate-x-full"}`}
        role="dialog"
        aria-label="Your order"
      >
        <div className="flex items-center justify-between border-b-2 border-char bg-char px-5 py-4 text-cream">
          <h2 className="h-display text-2xl">Your Order</h2>
          <button className="rounded-full p-2 hover:bg-white/10" onClick={() => cart.setOpen(false)} aria-label="Close">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        {cart.tableLabel && <div className="bg-mustard px-5 py-2 text-sm font-bold">Dine-in · Table {cart.tableLabel}</div>}
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {priced.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <PizzaArt catalog={cat} toppings={{}} board={false} className="h-40 w-40" />
              <p className="mt-2 font-condensed text-2xl uppercase">Your box is empty</p>
              <p className="text-char-400">Let&apos;s fix that.</p>
              <Link href="/build" onClick={() => cart.setOpen(false)} className="btn-primary mt-5">Build a pizza</Link>
            </div>
          )}
          {priced.map((p) => {
            const product = cat.products.find((x) => x.id === p.line.productId);
            return (
              <div key={p.line.key} className="card flex gap-3 p-3">
                <div className="h-20 w-20 shrink-0">
                  {p.line.kind === "PIZZA" ? (
                    <PizzaArt catalog={cat} sizeId={p.line.sizeId} crustId={p.line.crustId} toppings={p.line.toppings ?? {}} board={false} animate={false} scaleBySize={false} className="h-full w-full" />
                  ) : (
                    <ItemArt art={product?.art} className="h-full w-full" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold leading-tight">{p.name}</p>
                      <p className="text-xs text-char-400">{[p.sizeName, p.crustName].filter(Boolean).join(" · ")}</p>
                    </div>
                    <p className="whitespace-nowrap font-bold">{money(p.lineTotal)}</p>
                  </div>
                  {p.summary && <p className="mt-1 text-xs text-tomato-700">{p.summary}</p>}
                  {!p.valid && <p className="mt-1 text-xs font-bold text-tomato">{p.error}</p>}
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center rounded-full border-2 border-char bg-white">
                      <button className="px-3 py-1 text-lg font-bold" onClick={() => cart.setQty(p.line.key, p.line.quantity - 1)} aria-label="Less">−</button>
                      <span className="w-6 text-center font-bold">{p.line.quantity}</span>
                      <button className="px-3 py-1 text-lg font-bold" onClick={() => cart.setQty(p.line.key, p.line.quantity + 1)} aria-label="More">+</button>
                    </div>
                    {p.line.kind === "PIZZA" && (
                      <Link href={`/build?edit=${encodeURIComponent(p.line.key)}`} onClick={() => cart.setOpen(false)} className="text-sm font-bold text-tomato underline-offset-2 hover:underline">
                        Edit
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {priced.length > 0 && (
          <div className="border-t-2 border-char bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="mb-3 flex items-baseline justify-between">
              <span className="font-bold uppercase tracking-wide text-char-500">Subtotal</span>
              <span className="font-display text-3xl">{money(subtotal)}</span>
            </div>
            <Link href="/checkout" onClick={() => cart.setOpen(false)} className="btn-primary w-full text-lg">
              Checkout →
            </Link>
          </div>
        )}
      </aside>
    </div>
  );
}
