"use client";
import Link from "next/link";
import { useCart } from "@/components/cart";
import { useCatalog } from "@/components/CatalogContext";
import { PizzaArt } from "@/components/PizzaArt";
import { money } from "@/lib/pricing";

export function FeaturedRail() {
  const cat = useCatalog();
  const cart = useCart();
  const list = cat.products.filter((p) => p.kind === "PIZZA" && p.featured);
  return (
    <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-6">
      {list.map((p, i) => (
        <div key={p.id} className="card w-[78vw] max-w-[320px] shrink-0 snap-center overflow-hidden sm:w-[300px]">
          <div className={`relative p-5 ${i % 2 ? "bg-tomato" : "bg-char"}`}>
            <div className="absolute inset-0 sunburst" />
            <PizzaArt catalog={cat} sizeId={p.variants[0]?.sizeId} crustId={cat.crusts[0]?.id} toppings={p.toppings} animate={false} scaleBySize={false} board={false} className="relative mx-auto h-56 w-56 animate-spin-slow" />
          </div>
          <div className="p-5">
            <h3 className="font-condensed text-3xl uppercase leading-none">{p.name}</h3>
            <p className="mt-1 line-clamp-2 text-sm text-char-500">{p.description}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="whitespace-nowrap font-bold">from <span className="font-display text-xl text-tomato">{money(Math.min(...p.variants.map((v) => v.price)))}</span></span>
              <div className="flex gap-2">
                <Link href={`/build?product=${p.slug}`} className="btn-ghost btn-sm">Edit</Link>
                <button onClick={() => cart.add({ kind: "PIZZA", productId: p.id, sizeId: p.variants[0].sizeId!, crustId: cat.crusts[0]?.id, toppings: { ...p.toppings }, quantity: 1 })} className="btn-primary btn-sm">Add</button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
