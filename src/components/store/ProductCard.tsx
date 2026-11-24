"use client";
import { useState } from "react";
import { fromPrice, money, priceLine } from "@/lib/pricing";
import type { CatProduct } from "@/lib/types";
import { useStore } from "./StoreProvider";
import { Icon, ProductPhoto, VegMark } from "./ui";

function Select({ label, value, onChange, options, disabled }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; disabled?: boolean }) {
  return (
    <label className="relative block min-w-0 flex-1">
      <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-bold text-char-500">{label}</span>
      <select disabled={disabled} value={value} onChange={(e) => onChange(e.target.value)} className="h-11 w-full appearance-none truncate rounded-xl border border-char-200 bg-white pl-3 pr-8 text-sm font-bold outline-none focus:border-char disabled:bg-char-50 disabled:text-char-500">
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <Icon name="down" className="pointer-events-none absolute right-2.5 top-3 h-5 w-5 text-char-400" />
    </label>
  );
}

export function ProductCard({ p }: { p: CatProduct }) {
  const s = useStore();
  const cat = s.catalog;
  const sizes = cat.sizes.filter((sz) => p.variants.some((v) => v.sizeId === sz.id));
  const [sizeId, setSizeId] = useState(sizes[Math.min(1, sizes.length - 1)]?.id ?? "");
  const [crustId, setCrustId] = useState(cat.crusts[0]?.id ?? "");
  const [variantId, setVariantId] = useState(p.variants[0]?.id ?? "");
  const [added, setAdded] = useState(false);
  const fav = s.favourites.includes(p.id);
  const size = sizes.find((x) => x.id === sizeId);

  const line =
    p.kind === "PIZZA"
      ? ({ kind: "PIZZA", productId: p.id, sizeId, crustId: size?.shape === "RECT" ? cat.crusts[0]?.id : crustId, toppings: { ...p.toppings }, quantity: 1 } as const)
      : ({ kind: "ITEM", productId: p.id, variantId, quantity: 1 } as const);
  const price = p.kind === "COMBO" ? fromPrice(p) : priceLine(cat, { ...line, key: "x" }).unitPrice;

  // savings for combos: cheapest separate price vs deal price
  let save = 0;
  if (p.kind === "COMBO") {
    let sep = 0;
    for (const slot of p.slots) {
      const o = slot.options[0];
      const op = cat.products.find((x) => x.id === o?.productId);
      const v = op?.kind === "PIZZA" ? op.variants.find((x) => x.sizeId === o?.sizeId) : op?.variants.find((x) => x.id === o?.variantId) ?? op?.variants[0];
      sep += (v?.price ?? 0) * slot.quantity;
    }
    save = Math.max(0, sep - fromPrice(p));
  }

  const add = () =>
    s.requireMode(() => {
      if (p.kind === "COMBO") return s.openCombo({ productId: p.id });
      s.add(line);
      setAdded(true);
      setTimeout(() => setAdded(false), 1200);
    });

  return (
    <article className="card group flex flex-col overflow-hidden">
      <div className="relative aspect-[4/3] overflow-hidden">
        <button onClick={() => (p.kind === "PIZZA" ? s.openCustomise({ productId: p.id, sizeId }) : p.kind === "COMBO" ? s.openCombo({ productId: p.id }) : add())} className="block h-full w-full" aria-label={`${p.name} details`}>
          <ProductPhoto product={p} catalog={cat} sizeId={sizeId} className="transition duration-500 group-hover:scale-[1.04]" />
        </button>
        <button onClick={() => s.toggleFavourite(p.id)} className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-white/90 shadow" aria-label={fav ? "Remove from favourites" : "Add to favourites"} aria-pressed={fav}>
          <Icon name="heart" fill={fav} className={`h-5 w-5 ${fav ? "text-tomato" : "text-char-300"}`} />
        </button>
        {p.tags.filter((t) => ["bestseller", "new", "spicy", "family", "save"].includes(t)).slice(0, 1).map((t) => (
          <span key={t} className="absolute left-3 top-3 rounded-full bg-mustard px-2.5 py-1 text-[11px] font-extrabold uppercase text-char">{t === "save" ? "Best value" : t}</span>
        ))}
        {save > 0 && <span className="absolute left-3 top-3 rounded-full bg-tomato px-2.5 py-1 text-[11px] font-extrabold uppercase text-white">Save {money(save)}</span>}
        {p.kind === "PIZZA" && (
          <button onClick={() => s.openCustomise({ productId: p.id, sizeId })} className="absolute bottom-3 right-3 rounded-full bg-white px-4 py-2 text-sm font-bold shadow-lg hover:bg-char hover:text-white">Customise</button>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-extrabold uppercase leading-tight">{p.name}</h3>
          <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
            {p.kind !== "COMBO" && <VegMark veg={p.isVeg} />}
            {p.kind === "PIZZA" && (
              <button onClick={() => s.openCustomise({ productId: p.id, sizeId })} aria-label="See ingredients" className="text-char-400 hover:text-char">
                <Icon name="info" className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
        {p.kind === "PIZZA" && size && (
          <p className="mt-1 flex items-center justify-end gap-1 text-sm font-bold text-char-500">
            <Icon name="user" className="h-4 w-4" /> {size.shape === "RECT" ? "1-2" : size.persons === 1 ? "1" : size.persons === 2 ? "2-3" : "3-4"}
          </p>
        )}
        <p className="mt-1 line-clamp-2 text-sm text-char-500">{p.description}</p>
        <div className="mt-auto pt-4">
          {p.kind === "PIZZA" && (
            <div className="mb-3 flex gap-2">
              <Select label="Select Size" value={sizeId} onChange={setSizeId} disabled={sizes.length < 2} options={sizes.map((x) => ({ value: x.id, label: x.name }))} />
              {size?.shape !== "RECT" && cat.crusts.length > 1 && <Select label="Select Crust" value={crustId} onChange={setCrustId} options={cat.crusts.map((x) => ({ value: x.id, label: x.name.replace(" · Hand-tossed", "") }))} />}
            </div>
          )}
          {p.kind === "ITEM" && p.variants.length > 1 && (
            <div className="mb-3 flex gap-2">
              <Select label="Select Size" value={variantId} onChange={setVariantId} options={p.variants.map((v) => ({ value: v.id, label: v.name }))} />
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <p className="text-xl font-extrabold">{p.kind === "COMBO" ? <span className="text-sm font-bold text-char-400">from </span> : null}{money(price)}</p>
            <button onClick={add} className={`btn h-11 px-5 text-sm ${added ? "bg-basil text-white" : "bg-tomato text-white hover:bg-tomato-600"}`}>
              {added ? "Added ✓" : p.kind === "COMBO" ? "Choose items" : "Add To Cart"}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

/** Special first card: build your own */
export function BuildYourOwnCard() {
  const s = useStore();
  const cat = s.catalog;
  const sauce = cat.toppings.find((t) => t.group === "SAUCE");
  const cheese = cat.toppings.find((t) => t.group === "CHEESE");
  const from = Math.min(...cat.sizes.filter((x) => x.inBuilder && x.shape !== "RECT").map((x) => x.basePrice + (sauce?.sizes[x.id]?.price ?? 0) + (cheese?.sizes[x.id]?.price ?? 0)));
  const demo = Object.fromEntries(cat.toppings.filter((t) => ["sauce", "cheese", "pepperoni", "pepper_green", "onion"].includes(t.visual)).map((t) => [t.id, 1]));
  const pizza = cat.products.find((p) => p.kind === "PIZZA" && p.variants.some((v) => cat.sizes.find((x) => x.id === v.sizeId)?.shape !== "RECT"));
  const round = cat.sizes.find((x) => x.inBuilder && x.shape !== "RECT" && x.persons >= 2) ?? cat.sizes[0];
  return (
    <article className="card flex flex-col overflow-hidden border-2 border-dashed border-tomato/40">
      <button onClick={() => s.openCustomise({})} className="relative aspect-[4/3] overflow-hidden">
        {pizza && <ProductPhoto product={{ ...pizza, image: null, toppings: demo }} catalog={cat} sizeId={round?.id} live />}
        <span className="absolute left-3 top-3 rounded-full bg-tomato px-2.5 py-1 text-[11px] font-extrabold uppercase text-white">Live builder</span>
      </button>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-lg font-extrabold uppercase leading-tight">Build Your Own</h3>
        <p className="mt-1 text-sm text-char-500">Choose every scoop of sauce, cheese and topping, and watch your pizza come alive as you go.</p>
        <div className="mt-auto flex items-center justify-between pt-4">
          <p className="text-xl font-extrabold"><span className="text-sm font-bold text-char-400">from </span>{money(from)}</p>
          <button onClick={() => s.openCustomise({})} className="btn-dark h-11 px-5 text-sm">Start building</button>
        </div>
      </div>
    </article>
  );
}
