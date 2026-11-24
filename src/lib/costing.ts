// Server-only: turns cart lines into ingredient usage, food cost, packaging cost, royalty and charity.
import type { Prisma, PrismaClient } from "@prisma/client";
import { db } from "./db";
import type { CartLine } from "./types";

type Tx = PrismaClient | Prisma.TransactionClient;

export interface CostCtx {
  ingredients: Map<string, { id: string; name: string; unit: string; cost: number; isPackaging: boolean }>;
  sizes: Map<string, { doughGrams: number; boxId: string | null; royalty: number; charity: number; shape: string }>;
  crusts: Map<string, { doughId: string | null; doughFactor: number }>;
  defaultCrustId: string | null;
  toppings: Map<string, { ingredientId: string | null; sizes: Map<string, number> }>;
  variants: Map<string, { productId: string; sizeId: string | null; royalty: number; charity: number; recipe: { ingredientId: string; quantity: number }[] }>;
  addons: Map<string, { ingredientId: string | null; quantity: number }>;
  products: Map<string, { kind: string; toppings: Record<string, number>; variants: { id: string; sizeId: string | null }[] }>;
  rewards: Map<string, { productId: string; variantId: string | null }>;
  defaultCrust?: string | null;
}

export async function loadCostCtx(tx: Tx = db): Promise<CostCtx> {
  const [ings, sizes, crusts, toppings, variants, addons, products, rewards] = await Promise.all([
    tx.ingredient.findMany(),
    tx.pizzaSize.findMany(),
    tx.crust.findMany({ orderBy: { sortOrder: "asc" } }),
    tx.topping.findMany({ include: { sizes: true } }),
    tx.productVariant.findMany({ include: { recipe: true } }),
    tx.addon.findMany(),
    tx.product.findMany({ select: { id: true, kind: true, toppings: true, variants: { select: { id: true, sizeId: true }, orderBy: { sortOrder: "asc" } } } }),
    tx.rewardItem.findMany({ select: { id: true, productId: true, variantId: true } }),
  ]);
  return {
    ingredients: new Map(ings.map((i) => [i.id, { id: i.id, name: i.name, unit: i.unit, cost: i.costPerUnit, isPackaging: i.isPackaging }])),
    sizes: new Map(sizes.map((s) => [s.id, { doughGrams: s.doughGrams, boxId: s.boxId, royalty: s.royalty, charity: s.charity, shape: s.shape }])),
    crusts: new Map(crusts.map((c) => [c.id, { doughId: c.doughId, doughFactor: c.doughFactor }])),
    defaultCrustId: crusts.find((c) => c.active)?.id ?? crusts[0]?.id ?? null,
    toppings: new Map(toppings.map((t) => [t.id, { ingredientId: t.ingredientId, sizes: new Map(t.sizes.map((s) => [s.sizeId, s.grams])) }])),
    variants: new Map(
      variants.map((v) => [
        v.id,
        { productId: v.productId, sizeId: v.sizeId, royalty: v.royalty, charity: v.charity, recipe: v.recipe.map((r) => ({ ingredientId: r.ingredientId, quantity: r.quantity })) },
      ]),
    ),
    addons: new Map(addons.map((a) => [a.id, { ingredientId: a.ingredientId, quantity: a.quantity }])),
    products: new Map(products.map((p) => [p.id, { kind: p.kind, toppings: Object.fromEntries(p.toppings.map((t) => [t.toppingId, t.portions])), variants: p.variants }])),
    rewards: new Map(rewards.map((r) => [r.id, { productId: r.productId, variantId: r.variantId }])),
  };
}

export type Usage = Record<string, number>;

export function addUsage(into: Usage, id: string | null | undefined, qty: number) {
  if (!id || !qty) return;
  into[id] = Math.round(((into[id] ?? 0) + qty) * 1000) / 1000;
}

export interface LineCost {
  usage: Usage; // for the full quantity
  foodCost: number;
  packagingCost: number;
  royalty: number;
  charity: number;
}

/** Turn a reward line into the plain item it stands for */
function resolveReward(ctx: CostCtx, line: CartLine): CartLine {
  const r = line.rewardId ? ctx.rewards.get(line.rewardId) : undefined;
  if (!r) return line;
  const p = ctx.products.get(r.productId);
  const v = p?.variants.find((x) => x.id === r.variantId) ?? p?.variants[0];
  if (p?.kind === "PIZZA") return { ...line, rewardId: undefined, kind: "PIZZA", productId: r.productId, sizeId: v?.sizeId ?? undefined, crustId: ctx.defaultCrustId ?? undefined, toppings: p.toppings };
  return { ...line, rewardId: undefined, kind: "ITEM", productId: r.productId, variantId: v?.id };
}

export function costLine(ctx: CostCtx, input: CartLine): LineCost {
  const line = resolveReward(ctx, input);
  const qty = Math.max(1, Math.floor(line.quantity || 1));
  const one: Usage = {};
  let royalty = 0;
  let charity = 0;

  if (line.kind === "COMBO") {
    // cost every pick as a single item, then multiply by the combo quantity
    let food = 0, pack = 0, roy = 0, ch = 0;
    const usage: Usage = {};
    for (const pick of line.picks ?? []) {
      const p = ctx.products.get(pick.productId);
      const sub: CartLine =
        p?.kind === "PIZZA"
          ? { key: "p", kind: "PIZZA", productId: pick.productId, sizeId: pick.sizeId, crustId: pick.crustId, toppings: pick.toppings ?? p.toppings, quantity: qty }
          : { key: "p", kind: "ITEM", productId: pick.productId, variantId: pick.variantId ?? p?.variants[0]?.id, quantity: qty };
      const c = costLine(ctx, sub);
      for (const [id, q] of Object.entries(c.usage)) addUsage(usage, id, q);
      food += c.foodCost;
      pack += c.packagingCost;
      roy += c.royalty;
      ch += c.charity;
    }
    const r2 = (n: number) => Math.round(n * 100) / 100;
    return { usage, foodCost: r2(food), packagingCost: r2(pack), royalty: r2(roy), charity: r2(ch) };
  }

  if (line.kind === "PIZZA") {
    const size = line.sizeId ? ctx.sizes.get(line.sizeId) : undefined;
    if (size) {
      const crustId = size.shape === "RECT" ? ctx.defaultCrustId : line.crustId ?? ctx.defaultCrustId;
      const crust = crustId ? ctx.crusts.get(crustId) : undefined;
      if (crust) addUsage(one, crust.doughId, size.doughGrams * crust.doughFactor);
      addUsage(one, size.boxId, 1);
      royalty = size.royalty;
      charity = size.charity;
      for (const [tid, portions] of Object.entries(line.toppings ?? {})) {
        const t = ctx.toppings.get(tid);
        if (!t || portions <= 0) continue;
        addUsage(one, t.ingredientId, (t.sizes.get(line.sizeId!) ?? 0) * portions);
      }
      // extra recipe lines attached to a preset pizza variant (e.g. oregano sachet)
      if (line.productId) {
        for (const v of ctx.variants.values()) {
          if (v.productId === line.productId && v.sizeId === line.sizeId) {
            for (const r of v.recipe) addUsage(one, r.ingredientId, r.quantity);
          }
        }
      }
    }
  } else {
    const v = line.variantId ? ctx.variants.get(line.variantId) : undefined;
    if (v) {
      for (const r of v.recipe) addUsage(one, r.ingredientId, r.quantity);
      royalty = v.royalty;
      charity = v.charity;
    }
    for (const [aid, n] of Object.entries(line.addons ?? {})) {
      const a = ctx.addons.get(aid);
      if (a && n > 0) addUsage(one, a.ingredientId, a.quantity * n);
    }
  }

  const usage: Usage = {};
  let foodCost = 0;
  let packagingCost = 0;
  for (const [id, q] of Object.entries(one)) {
    addUsage(usage, id, q * qty);
    const ing = ctx.ingredients.get(id);
    if (!ing) continue;
    const c = ing.cost * q * qty;
    if (ing.isPackaging) packagingCost += c;
    else foodCost += c;
  }
  const r2 = (n: number) => Math.round(n * 100) / 100;
  return { usage, foodCost: r2(foodCost), packagingCost: r2(packagingCost), royalty: r2(royalty * qty), charity: r2(charity * qty) };
}

export function usageCost(ctx: CostCtx, usage: Usage) {
  let food = 0;
  let packaging = 0;
  for (const [id, q] of Object.entries(usage)) {
    const ing = ctx.ingredients.get(id);
    if (!ing) continue;
    if (ing.isPackaging) packaging += ing.cost * q;
    else food += ing.cost * q;
  }
  return { food, packaging };
}
