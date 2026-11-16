"use client";
import { useEffect, useState } from "react";
import { useCatalog } from "@/components/CatalogContext";
import { PizzaArt } from "@/components/PizzaArt";

/** Assembles a pizza layer by layer, then swaps to the next signature pizza. */
export function HeroPizza() {
  const cat = useCatalog();
  const pizzas = cat.products.filter((p) => p.kind === "PIZZA" && p.variants.some((v) => cat.sizes.find((s) => s.id === v.sizeId)?.shape !== "RECT"));
  const order = ["SAUCE", "CHEESE", "MEAT", "VEG", "EXTRA"];
  const [idx, setIdx] = useState(0);
  const [stage, setStage] = useState(0);
  const p = pizzas[idx % Math.max(1, pizzas.length)];
  const size = cat.sizes.filter((s) => s.shape !== "RECT").at(-1);

  useEffect(() => {
    const t = setTimeout(
      () => {
        if (stage >= order.length + 1) {
          setStage(0);
          setIdx((i) => i + 1);
        } else setStage((s) => s + 1);
      },
      stage === 0 ? 500 : stage >= order.length ? 2600 : 750,
    );
    return () => clearTimeout(t);
  }, [stage, order.length]);

  if (!p) return null;
  const visibleGroups = new Set(order.slice(0, stage));
  const toppings = Object.fromEntries(
    Object.entries(p.toppings).filter(([id]) => {
      const t = cat.toppings.find((x) => x.id === id);
      return t && visibleGroups.has(t.group);
    }),
  );
  return (
    <div className="relative">
      <PizzaArt catalog={cat} sizeId={size?.id} crustId={cat.crusts[0]?.id} toppings={toppings} scaleBySize={false} sliced={stage > order.length - 1} steam={stage > order.length - 1} className="h-full w-full drop-shadow-2xl" />
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-cream bg-tomato px-5 py-2 font-condensed text-xl uppercase tracking-wide text-white shadow-retro">
        {stage === 0 ? "Fresh dough…" : stage > order.length - 1 ? p.name : `Adding ${order[stage - 1].toLowerCase()}…`}
      </div>
    </div>
  );
}
