"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/components/cart";
import { useCatalog } from "@/components/CatalogContext";
import { ItemArt } from "@/components/ItemArt";
import { PizzaArt } from "@/components/PizzaArt";
import { useNowMinutes } from "@/components/site/OpenStatus";
import { money } from "@/lib/pricing";
import { fmtTime12, isOpenAt } from "@/lib/time";
import type { CatProduct } from "@/lib/types";

const TAG_STYLE: Record<string, string> = {
  bestseller: "bg-tomato text-white",
  new: "bg-mustard text-char",
  veg: "bg-basil text-white",
  spicy: "bg-tomato-700 text-white",
  loaded: "bg-char text-cream",
  favourite: "bg-mustard text-char",
};

function PizzaCard({ p, open }: { p: CatProduct; open: boolean }) {
  const cat = useCatalog();
  const cart = useCart();
  const [flash, setFlash] = useState<string | null>(null);
  const first = p.variants[0];
  return (
    <div className="card group flex flex-col overflow-hidden">
      <Link href={`/build?product=${p.slug}`} className="relative block bg-char p-4">
        <div className="absolute inset-0 sunburst" />
        <PizzaArt catalog={cat} sizeId={first?.sizeId} crustId={cat.crusts[0]?.id} toppings={p.toppings} animate={false} scaleBySize={false} className="relative mx-auto aspect-square w-full max-w-[260px] transition duration-500 group-hover:rotate-12 group-hover:scale-105" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1">
          {p.tags.map((t) => (
            <span key={t} className={`chip border-char ${TAG_STYLE[t] ?? "bg-white"}`}>{t}</span>
          ))}
        </div>
        {!open && <span className="chip absolute bottom-3 left-3 border-cream bg-char text-cream">Schedule ahead</span>}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-condensed text-3xl uppercase leading-none">{p.name}</h3>
        <p className="mt-1 flex-1 text-sm text-char-500">{p.description}</p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {p.variants.map((v) => {
            const s = cat.sizes.find((x) => x.id === v.sizeId);
            return (
              <button
                key={v.id}
                onClick={() => {
                  cart.add({ kind: "PIZZA", productId: p.id, sizeId: v.sizeId!, crustId: cat.crusts[0]?.id, toppings: { ...p.toppings }, quantity: 1 });
                  setFlash(v.id);
                  setTimeout(() => setFlash(null), 900);
                }}
                className={`rounded-xl border-2 border-char px-1 py-2 text-center transition hover:bg-char hover:text-cream ${flash === v.id ? "bg-basil text-white" : "bg-cream-100"} ${p.variants.length === 1 ? "col-span-3" : ""}`}
                title={`Add ${s?.name}`}
              >
                <span className="block text-[11px] font-bold uppercase tracking-wide opacity-70">{flash === v.id ? "Added ✓" : s?.name ?? v.name}</span>
                <span className="block font-bold">{money(v.price)}</span>
              </button>
            );
          })}
        </div>
        <Link href={`/build?product=${p.slug}`} className="mt-3 text-center text-sm font-bold text-tomato hover:underline">
          Customise toppings →
        </Link>
      </div>
    </div>
  );
}

function ItemCard({ p, open }: { p: CatProduct; open: boolean }) {
  const cat = useCatalog();
  const cart = useCart();
  const [vid, setVid] = useState(p.variants[0]?.id);
  const addons = cat.addons.filter((a) => a.categoryId === p.categoryId);
  const [sel, setSel] = useState<Record<string, number>>({});
  const [done, setDone] = useState(false);
  const v = p.variants.find((x) => x.id === vid) ?? p.variants[0];
  const price = v.price + addons.reduce((s, a) => s + (sel[a.id] ? a.price : 0), 0);
  return (
    <div className="card flex gap-4 p-4">
      <div className="relative grid h-28 w-28 shrink-0 place-items-center rounded-xl border-2 border-char bg-cream-200">
        {p.image ? <img src={p.image} alt={p.name} className="h-full w-full rounded-lg object-cover" /> : <ItemArt art={p.art} className="h-24 w-24" />}
        {!open && <span className="absolute -bottom-2 rounded-full bg-char px-2 text-[10px] font-bold uppercase text-cream">Later</span>}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-condensed text-2xl uppercase leading-none">{p.name}</h3>
          {p.tags[0] && <span className={`chip shrink-0 border-char ${TAG_STYLE[p.tags[0]] ?? "bg-white"}`}>{p.tags[0]}</span>}
        </div>
        <p className="mt-1 text-sm text-char-500">{p.description}</p>
        {p.variants.length > 1 && (
          <div className="mt-2 flex gap-1">
            {p.variants.map((x) => (
              <button key={x.id} onClick={() => setVid(x.id)} className={`rounded-lg border-2 border-char px-2 py-1 text-xs font-bold ${x.id === v.id ? "bg-char text-cream" : "bg-white"}`}>
                {x.name} · {money(x.price)}
              </button>
            ))}
          </div>
        )}
        {addons.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {addons.map((a) => (
              <label key={a.id} className="flex cursor-pointer items-center gap-1 text-xs font-bold">
                <input type="checkbox" className="accent-tomato" checked={!!sel[a.id]} onChange={(e) => setSel((s) => ({ ...s, [a.id]: e.target.checked ? 1 : 0 }))} />
                + {a.name} ({money(a.price)})
              </label>
            ))}
          </div>
        )}
        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="font-display text-xl">{money(price)}</span>
          <button
            onClick={() => {
              cart.add({ kind: "ITEM", productId: p.id, variantId: v.id, addons: sel, quantity: 1 });
              setDone(true);
              setTimeout(() => setDone(false), 900);
            }}
            className={`btn-sm btn ${done ? "bg-basil text-white border-2 border-char" : "btn-primary btn-sm"}`}
          >
            {done ? "Added ✓" : "Add +"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function MenuClient() {
  const cat = useCatalog();
  const minutes = useNowMinutes();
  const [active, setActive] = useState(cat.categories[0]?.slug);
  const tabsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (vis) setActive(vis.target.id);
      },
      { rootMargin: "-140px 0px -60% 0px" },
    );
    cat.categories.forEach((c) => {
      const el = document.getElementById(c.slug);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [cat.categories]);

  useEffect(() => {
    tabsRef.current?.querySelector(`[data-slug="${active}"]`)?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [active]);

  return (
    <div className="grain">
      <section className="relative overflow-hidden border-b-2 border-char bg-tomato text-white">
        <div className="absolute inset-0 sunburst" />
        <div className="relative mx-auto flex max-w-7xl flex-col items-start gap-4 px-4 py-10 md:flex-row md:items-end md:justify-between md:py-14">
          <div>
            <p className="font-bold uppercase tracking-[.3em] text-cream">Fresh · Hot · Halal</p>
            <h1 className="h-display text-6xl md:text-8xl">The Menu</h1>
          </div>
          <Link href="/build" className="btn bg-white text-char border-2 border-char shadow-retro text-lg">🍕 Build your own instead</Link>
        </div>
      </section>

      <div ref={tabsRef} className="no-scrollbar sticky top-16 z-30 flex gap-2 overflow-x-auto border-b-2 border-char bg-cream-100/95 px-4 py-3 backdrop-blur md:justify-center">
        {cat.categories.map((c) => (
          <a key={c.id} data-slug={c.slug} href={`#${c.slug}`} className={`shrink-0 rounded-full border-2 border-char px-4 py-1.5 text-sm font-bold transition ${active === c.slug ? "bg-char text-cream" : "bg-white hover:bg-cream-200"}`}>
            {c.name}
          </a>
        ))}
      </div>

      <div className="mx-auto max-w-7xl space-y-16 px-4 py-10">
        {cat.categories.map((c) => {
          const products = cat.products.filter((p) => p.categoryId === c.id);
          if (!products.length) return null;
          const open = minutes == null ? true : isOpenAt(c.availableFrom, c.availableTo, minutes);
          const isPizza = products[0].kind === "PIZZA";
          return (
            <section key={c.id} id={c.slug} className="scroll-mt-36">
              <div className="mb-6 flex flex-wrap items-end justify-between gap-2 border-b-2 border-dashed border-char/30 pb-3">
                <div>
                  <h2 className="h-display text-4xl md:text-5xl">{c.name}</h2>
                  {c.tagline && <p className="font-bold uppercase tracking-widest text-tomato">{c.tagline}</p>}
                </div>
                <span className={`chip ${open ? "bg-white" : "bg-char text-cream"}`}>
                  {fmtTime12(c.availableFrom)} – {fmtTime12(c.availableTo)}
                </span>
              </div>
              <div className={isPizza ? "grid gap-6 sm:grid-cols-2 lg:grid-cols-3" : "grid gap-4 md:grid-cols-2"}>
                {products.map((p) => (p.kind === "PIZZA" ? <PizzaCard key={p.id} p={p} open={open} /> : <ItemCard key={p.id} p={p} open={open} />))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
