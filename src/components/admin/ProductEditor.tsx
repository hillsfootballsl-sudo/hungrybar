"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ItemArt } from "@/components/ItemArt";
import { PizzaArt, ToppingIcon } from "@/components/PizzaArt";
import { saveProduct } from "@/lib/actions/admin";
import type { Catalog } from "@/lib/types";

type Ing = { id: string; name: string; unit: string; costPerUnit: number; isPackaging: boolean };
type Variant = { id?: string; name: string; sizeId: string; price: number; royalty: number; charity: number; active: boolean; recipe: { ingredientId: string; quantity: number }[] };
type P = { id?: string; name: string; description: string; categoryId: string; kind: "PIZZA" | "ITEM"; art: string; image: string; tags: string[]; featured: boolean; active: boolean; sortOrder: number; variants: Variant[]; toppings: Record<string, number> };

const ARTS = ["juice:#F25C54", "juice:#F7C548", "juice:#FFA62B", "juice:#A7C957", "mojito:#B8E986", "mojito:#FF5D73", "mojito:#3AB0FF", "panini", "lasagna", "garlicbread", "water"];

export function ProductEditor({ catalog, categories, ingredients, sizes, dough, toppingIngredient, initial }: {
  catalog: Catalog; categories: { id: string; name: string }[]; ingredients: Ing[];
  sizes: { id: string; name: string; doughGrams: number; boxId: string | null; royalty: number; charity: number }[];
  dough: { id: string | null }; toppingIngredient: Record<string, string | null>; initial: P | null;
}) {
  const [p, setP] = useState<P>(
    initial ?? { name: "", description: "", categoryId: categories[0]?.id ?? "", kind: "ITEM", art: "juice:#F25C54", image: "", tags: [], featured: false, active: true, sortOrder: 0, variants: [{ name: "Regular", sizeId: "", price: 0, royalty: 0, charity: 0, active: true, recipe: [] }], toppings: {} },
  );
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const cost = (id: string) => ingredients.find((i) => i.id === id)?.costPerUnit ?? 0;
  const setV = (k: number, patch: Partial<Variant>) => setP((x) => ({ ...x, variants: x.variants.map((v, i) => (i === k ? { ...v, ...patch } : v)) }));

  const variantCost = (v: Variant) => {
    let c = v.recipe.reduce((s, r) => s + cost(r.ingredientId) * r.quantity, 0);
    let roy = v.royalty, ch = v.charity;
    if (p.kind === "PIZZA") {
      const s = sizes.find((x) => x.id === v.sizeId);
      if (s) {
        if (dough.id) c += cost(dough.id) * s.doughGrams;
        if (s.boxId) c += cost(s.boxId);
        roy = s.royalty;
        ch = s.charity;
        for (const [tid, n] of Object.entries(p.toppings)) {
          const g = catalog.toppings.find((t) => t.id === tid)?.sizes[s.id]?.grams ?? 0;
          const ing = toppingIngredient[tid];
          if (ing) c += cost(ing) * g * n;
        }
      }
    }
    return { c, roy, ch, profit: v.price - c - roy - ch };
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <section className="card grid gap-3 p-4 md:grid-cols-2">
          <label className="md:col-span-2"><span className="label">Name</span><input className="input" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></label>
          <label className="md:col-span-2"><span className="label">Description</span><textarea className="input" value={p.description} onChange={(e) => setP({ ...p, description: e.target.value })} /></label>
          <label><span className="label">Category</span>
            <select className="input" value={p.categoryId} onChange={(e) => setP({ ...p, categoryId: e.target.value })}>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          </label>
          <label><span className="label">Type</span>
            <select className="input" value={p.kind} onChange={(e) => setP({ ...p, kind: e.target.value as P["kind"] })}>
              <option value="PIZZA">Pizza (uses builder, sizes & toppings)</option>
              <option value="ITEM">Item (own recipe)</option>
            </select>
          </label>
          <label><span className="label">Tags (comma separated)</span><input className="input" value={p.tags.join(", ")} placeholder="bestseller, spicy, veg, new" onChange={(e) => setP({ ...p, tags: e.target.value.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean) })} /></label>
          <label><span className="label">Sort order</span><input className="input" type="number" value={p.sortOrder} onChange={(e) => setP({ ...p, sortOrder: Number(e.target.value) })} /></label>
          {p.kind === "ITEM" && (
            <>
              <div className="md:col-span-2">
                <span className="label">Illustration</span>
                <div className="flex flex-wrap gap-2">
                  {ARTS.map((a) => (
                    <button key={a} type="button" onClick={() => setP({ ...p, art: a })} className={`rounded-lg border-2 p-1 ${p.art === a ? "border-tomato" : "border-transparent"}`}><ItemArt art={a} className="h-10 w-10" /></button>
                  ))}
                </div>
              </div>
              <label className="md:col-span-2"><span className="label">Photo URL (optional — overrides illustration)</span><input className="input" value={p.image} onChange={(e) => setP({ ...p, image: e.target.value })} placeholder="https://…" /></label>
            </>
          )}
          <div className="flex gap-6 md:col-span-2">
            <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" className="accent-tomato" checked={p.featured} onChange={(e) => setP({ ...p, featured: e.target.checked })} /> Featured on homepage</label>
            <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" className="accent-tomato" checked={p.active} onChange={(e) => setP({ ...p, active: e.target.checked })} /> Visible</label>
          </div>
        </section>

        <section className="card p-4">
          <p className="mb-2 font-bold">{p.kind === "PIZZA" ? "Sizes & prices" : "Variants, prices & recipe"}</p>
          <div className="space-y-3">
            {p.variants.map((v, k) => {
              const m = variantCost(v);
              const pct = v.price ? (m.c / v.price) * 100 : 0;
              return (
                <div key={k} className="rounded-lg border border-char-100 p-3">
                  <div className="grid items-end gap-2 md:grid-cols-[1fr_1fr_120px_auto]">
                    {p.kind === "PIZZA" ? (
                      <label><span className="label">Size</span>
                        <select className="input" value={v.sizeId} onChange={(e) => setV(k, { sizeId: e.target.value, name: sizes.find((s) => s.id === e.target.value)?.name ?? v.name })}>
                          <option value="">Choose…</option>
                          {sizes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </label>
                    ) : (
                      <label><span className="label">Variant name</span><input className="input" value={v.name} onChange={(e) => setV(k, { name: e.target.value })} /></label>
                    )}
                    <label><span className="label">Price (Rs)</span><input className="input" type="number" value={v.price} onChange={(e) => setV(k, { price: Number(e.target.value) })} /></label>
                    <div className="text-xs">
                      <p>Cost <b>Rs {Math.round(m.c)}</b> ({pct.toFixed(0)}%)</p>
                      <p className={m.profit < 0 ? "font-bold text-tomato" : "text-basil"}>Profit Rs {Math.round(m.profit)}</p>
                    </div>
                    <button type="button" className="text-sm text-tomato" onClick={() => setP({ ...p, variants: p.variants.filter((_, i) => i !== k) })}>Remove</button>
                  </div>
                  {p.kind === "ITEM" && (
                    <div className="mt-2 grid grid-cols-2 gap-2 md:w-1/2">
                      <label><span className="label">Royalty / unit</span><input className="input" type="number" value={v.royalty} onChange={(e) => setV(k, { royalty: Number(e.target.value) })} /></label>
                      <label><span className="label">Charity / unit</span><input className="input" type="number" value={v.charity} onChange={(e) => setV(k, { charity: Number(e.target.value) })} /></label>
                    </div>
                  )}
                  <div className="mt-2">
                    <p className="text-xs font-bold uppercase text-char-400">{p.kind === "PIZZA" ? "Extra recipe lines (dough, box & toppings are automatic)" : "Recipe (incl. cups, wraps, packaging)"}</p>
                    {v.recipe.map((r, ri) => {
                      const ing = ingredients.find((i) => i.id === r.ingredientId);
                      return (
                        <div key={ri} className="mt-1 flex items-center gap-2">
                          <select className="input" value={r.ingredientId} onChange={(e) => setV(k, { recipe: v.recipe.map((x, i) => (i === ri ? { ...x, ingredientId: e.target.value } : x)) })}>
                            {ingredients.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                          </select>
                          <input className="input w-28" type="number" step="any" value={r.quantity} onChange={(e) => setV(k, { recipe: v.recipe.map((x, i) => (i === ri ? { ...x, quantity: Number(e.target.value) } : x)) })} />
                          <span className="w-10 text-xs">{ing?.unit}</span>
                          <span className="w-16 text-right text-xs text-char-400">Rs {Math.round(cost(r.ingredientId) * r.quantity)}</span>
                          <button type="button" className="text-tomato" onClick={() => setV(k, { recipe: v.recipe.filter((_, i) => i !== ri) })}>✕</button>
                        </div>
                      );
                    })}
                    <button type="button" className="mt-1 text-sm font-bold text-tomato" onClick={() => setV(k, { recipe: [...v.recipe, { ingredientId: ingredients[0]?.id ?? "", quantity: 1 }] })}>+ ingredient</button>
                  </div>
                </div>
              );
            })}
          </div>
          <button type="button" className="btn-ghost btn-sm mt-3" onClick={() => setP({ ...p, variants: [...p.variants, { name: p.kind === "PIZZA" ? "" : "Large", sizeId: "", price: 0, royalty: 0, charity: 0, active: true, recipe: [] }] })}>+ {p.kind === "PIZZA" ? "Size" : "Variant"}</button>
        </section>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
        {p.kind === "PIZZA" && (
          <section className="card p-4">
            <p className="mb-2 font-bold">Recipe toppings (portions)</p>
            <div className="mx-auto h-44 w-44">
              <PizzaArt catalog={catalog} sizeId={p.variants[0]?.sizeId || catalog.sizes[0]?.id} toppings={p.toppings} board={false} />
            </div>
            <div className="mt-2 space-y-1">
              {catalog.toppings.map((t) => {
                const n = p.toppings[t.id] ?? 0;
                return (
                  <div key={t.id} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2"><ToppingIcon visual={t.visual} className="h-6 w-6" />{t.name}</span>
                    <span className="flex items-center gap-1">
                      <button type="button" className="h-7 w-7 rounded bg-char-50 font-bold" onClick={() => setP({ ...p, toppings: { ...p.toppings, [t.id]: Math.max(0, n - 1) } })}>−</button>
                      <span className="w-5 text-center font-bold">{n}</span>
                      <button type="button" className="h-7 w-7 rounded bg-char-50 font-bold" onClick={() => setP({ ...p, toppings: { ...p.toppings, [t.id]: Math.min(t.maxPortions, n + 1) } })}>+</button>
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-char-400">Grams per portion for each size are set in Pizza builder & recipes.</p>
          </section>
        )}
        {err && <p className="rounded-lg bg-tomato-50 p-3 text-sm font-bold text-tomato-700">{err}</p>}
        <button
          className="btn-primary w-full"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setErr(null);
              const r = await saveProduct({ ...p, variants: p.variants.map((v) => ({ ...v, sizeId: v.sizeId || null })) });
              if (!r.ok) return setErr(r.error);
              router.push("/admin/menu");
              router.refresh();
            })
          }
        >
          {pending ? "Saving…" : "Save product"}
        </button>
      </aside>
    </div>
  );
}
