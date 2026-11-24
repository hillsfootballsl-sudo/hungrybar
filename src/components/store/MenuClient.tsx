"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { CartBar, CartPanel } from "./CartPanel";
import { useOpenNow } from "./LocationModal";
import { BuildYourOwnCard, ProductCard } from "./ProductCard";
import { useStore } from "./StoreProvider";
import { Icon } from "./ui";
import { fmtTime12 } from "@/lib/time";
import type { CatProduct } from "@/lib/types";

const FILTERS: [string, string, (p: CatProduct, favs: string[], meat: (p: CatProduct, v: string) => boolean) => boolean][] = [
  ["veg", "Veg", (p) => p.isVeg],
  ["nonveg", "Non Veg", (p) => !p.isVeg && p.kind !== "COMBO"],
  ["best", "Bestsellers", (p) => p.featured || p.tags.includes("bestseller")],
  ["chicken", "Chicken", (p, _f, meat) => meat(p, "chicken")],
  ["beef", "Beef", (p, _f, meat) => meat(p, "beef")],
  ["fav", "My Favourites", (p, favs) => favs.includes(p.id)],
];

export function MenuClient({ initialCat, build, q: initialQ }: { initialCat?: string; build?: boolean; q?: string }) {
  const s = useStore();
  const cat = s.catalog;
  const [q, setQ] = useState(initialQ ?? "");
  const [filters, setFilters] = useState<string[]>([]);
  const [active, setActive] = useState(initialCat ?? cat.categories[0]?.slug);
  const tabs = useRef<HTMLDivElement>(null);
  const open = useOpenNow();

  useEffect(() => {
    if (build) s.openCustomise({});
    if (initialCat) setTimeout(() => document.getElementById(`cat-${initialCat}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const obs = new IntersectionObserver((es) => {
      const v = es.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (v) setActive(v.target.id.replace("cat-", ""));
    }, { rootMargin: "-170px 0px -60% 0px" });
    cat.categories.forEach((c) => {
      const el = document.getElementById(`cat-${c.slug}`);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [cat.categories, q, filters]);
  useEffect(() => {
    tabs.current?.querySelector(`[data-slug="${active}"]`)?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [active]);

  const meat = (p: CatProduct, visual: string) => {
    const t = cat.toppings.find((x) => x.visual === visual);
    return (!!t && (p.toppings[t.id] ?? 0) > 0) || p.name.toLowerCase().includes(visual);
  };
  const match = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return (p: CatProduct) =>
      words.every((w) => `${p.name} ${p.description ?? ""}`.toLowerCase().includes(w)) &&
      filters.every((f) => FILTERS.find((x) => x[0] === f)![2](p, s.favourites, meat));
  }, [q, filters, s.favourites]); // eslint-disable-line react-hooks/exhaustive-deps

  const sections = cat.categories.map((c) => ({ c, items: cat.products.filter((p) => p.categoryId === c.id && match(p)) }));
  const total = sections.reduce((n, x) => n + x.items.length, 0);
  const showBuild = !q && !filters.length;

  return (
    <div className="mx-auto max-w-[1400px] md:px-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 pb-28 md:pb-10">
          <div className="sticky top-[124px] z-30 bg-white/95 px-4 pb-2 pt-4 backdrop-blur md:top-[76px] md:px-0">
            <div className="relative max-w-xl">
              <Icon name="search" className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-char-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Try cheese pizza" aria-label="Search the menu" className="h-12 w-full rounded-full bg-char-50 pl-12 pr-4 font-bold outline-none placeholder:font-bold placeholder:text-char-300 focus:bg-white focus:ring-2 focus:ring-char/15" />
            </div>
            <div ref={tabs} className="no-scrollbar mt-3 flex gap-6 overflow-x-auto border-b border-char-100">
              {cat.categories.map((c) => (
                <a key={c.id} data-slug={c.slug} href={`#cat-${c.slug}`} onClick={(e) => { e.preventDefault(); setActive(c.slug); document.getElementById(`cat-${c.slug}`)?.scrollIntoView({ behavior: "smooth", block: "start" }); }} className={`shrink-0 border-b-[3px] pb-2.5 font-extrabold transition ${active === c.slug ? "border-tomato text-tomato" : "border-transparent text-char-600 hover:text-char"}`}>
                  {c.name}
                </a>
              ))}
            </div>
            <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
              {FILTERS.map(([k, label]) => {
                const on = filters.includes(k);
                return (
                  <button key={k} onClick={() => setFilters((f) => (on ? f.filter((x) => x !== k) : [...f, k]))} aria-pressed={on} className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition ${on ? "border-char bg-char text-white" : "border-char-200 bg-white hover:border-char"}`}>
                    {k === "veg" && <span className="veg-mark" />}
                    {k === "nonveg" && <span className="nonveg-mark" />}
                    {k === "best" && "⭐"}
                    {k === "chicken" && "🍗"}
                    {k === "beef" && "🥩"}
                    {k === "fav" && <Icon name="heart" fill className="h-4 w-4 text-tomato" />}
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          {open === false && (
            <p className="mx-4 mt-4 flex items-center gap-2 rounded-2xl bg-mustard/25 p-4 text-sm font-bold md:mx-0">
              <Icon name="clock" className="h-5 w-5" /> We open at {fmtTime12(s.config.hours.open)}. You can still order now for later today.
            </p>
          )}
          {total === 0 && (
            <div className="px-4 py-16 text-center md:px-0">
              <p className="text-xl font-extrabold">No matches</p>
              <p className="text-char-500">Try a different search or clear the filters.</p>
              <button className="btn-ghost mt-4" onClick={() => { setQ(""); setFilters([]); }}>Clear all</button>
            </div>
          )}
          {sections.map(({ c, items }) =>
            items.length || (showBuild && c.icon === "pizza") ? (
              <section key={c.id} id={`cat-${c.slug}`} className="scroll-mt-[260px] px-4 pt-8 md:scroll-mt-[220px] md:px-0">
                <h2 className="text-2xl font-extrabold">{c.name}</h2>
                {c.tagline && <p className="mb-4 text-sm font-bold text-char-400">{c.tagline}</p>}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {showBuild && c.icon === "pizza" && <BuildYourOwnCard />}
                  {items.map((p) => (
                    <ProductCard key={p.id} p={p} />
                  ))}
                </div>
              </section>
            ) : null,
          )}
        </div>
        <aside className="hidden xl:block">
          <div className="sticky top-[92px] h-[calc(100dvh-108px)] overflow-hidden rounded-3xl border border-char-100 bg-white shadow-[0_2px_14px_rgba(0,0,0,.06)]">
            <CartPanel variant="sidebar" />
          </div>
        </aside>
      </div>
      <CartBar />
    </div>
  );
}
