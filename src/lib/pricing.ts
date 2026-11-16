// Pure pricing engine — runs identically in the browser (live price) and on the server (trusted price).
import type { CartLine, Catalog, CatProduct, PricedLine } from "./types";

export const round2 = (n: number) => Math.round(n * 100) / 100;

export function findProduct(cat: Catalog, id?: string) {
  return id ? cat.products.find((p) => p.id === id) : undefined;
}

/** Variant of a pizza product for the chosen size */
export function pizzaVariant(product: CatProduct, sizeId?: string) {
  return product.variants.find((v) => v.sizeId === sizeId);
}

export function describeToppings(
  cat: Catalog,
  toppings: Record<string, number>,
  preset: Record<string, number> | null,
): string {
  const parts: string[] = [];
  for (const t of cat.toppings) {
    const n = toppings[t.id] ?? 0;
    const base = preset ? preset[t.id] ?? 0 : 0;
    if (preset) {
      if (n === 0 && base > 0) parts.push(`No ${t.name}`);
      else if (n > base) parts.push(`+${n - base > 1 ? `${n - base}× ` : ""}${t.name}`);
      else if (n < base) parts.push(`Less ${t.name}`);
    } else if (n > 0) {
      parts.push(`${n > 1 ? `${n}× ` : ""}${t.name}`);
    }
  }
  return parts.join(" · ");
}

export function priceLine(cat: Catalog, line: CartLine): PricedLine {
  const qty = Math.max(1, Math.floor(line.quantity || 1));
  const bad = (error: string): PricedLine => ({
    line,
    name: "Unavailable item",
    unitPrice: 0,
    lineTotal: 0,
    basePrice: 0,
    summary: "",
    valid: false,
    error,
  });

  if (line.kind === "PIZZA") {
    const size = cat.sizes.find((s) => s.id === line.sizeId);
    if (!size) return bad("Pick a size");
    const crust =
      size.shape === "RECT" ? cat.crusts[0] : cat.crusts.find((c) => c.id === line.crustId) ?? cat.crusts[0];
    const toppings = line.toppings ?? {};
    let base = 0;
    let extras = 0;
    let name = "Build Your Own Pizza";
    let preset: Record<string, number> | null = null;

    if (line.productId) {
      const product = findProduct(cat, line.productId);
      if (!product) return bad("This pizza is no longer on the menu");
      const variant = pizzaVariant(product, size.id);
      if (!variant) return bad(`${product.name} isn't available in ${size.name}`);
      preset = product.toppings;
      base = variant.price;
      name = product.name;
    } else {
      if (!size.inBuilder) return bad("This size can't be custom built");
      base = size.basePrice;
    }

    for (const t of cat.toppings) {
      const n = Math.max(0, Math.min(t.maxPortions, Math.floor(toppings[t.id] ?? 0)));
      const included = preset ? preset[t.id] ?? 0 : 0;
      const extra = Math.max(0, n - included);
      const ts = t.sizes[size.id];
      if (extra > 0 && ts) extras += ts.price * extra;
    }
    const unit = round2(base + (crust?.extraPrice ?? 0) + extras);
    return {
      line,
      name,
      sizeName: size.name,
      crustName: size.shape === "RECT" ? "Detroit pan" : crust?.name,
      unitPrice: unit,
      lineTotal: round2(unit * qty),
      basePrice: base,
      summary: describeToppings(cat, toppings, preset),
      valid: true,
    };
  }

  const product = findProduct(cat, line.productId);
  if (!product) return bad("This item is no longer on the menu");
  const variant = product.variants.find((v) => v.id === line.variantId) ?? product.variants[0];
  if (!variant) return bad("Unavailable");
  let addonTotal = 0;
  const addonNames: string[] = [];
  for (const [aid, n] of Object.entries(line.addons ?? {})) {
    const a = cat.addons.find((x) => x.id === aid);
    if (!a || n <= 0) continue;
    addonTotal += a.price * n;
    addonNames.push(`+${n > 1 ? `${n}× ` : ""}${a.name}`);
  }
  const unit = round2(variant.price + addonTotal);
  return {
    line,
    name: product.name,
    sizeName: product.variants.length > 1 ? variant.name : undefined,
    unitPrice: unit,
    lineTotal: round2(unit * qty),
    basePrice: variant.price,
    summary: addonNames.join(" · "),
    valid: true,
  };
}

export interface LoyaltyConfig {
  enabled: boolean;
  stampsRequired: number; // e.g. 10 => every 10th order gets the reward
  rewardSizeId: string | null;
}

/** Value of the "free pizza" reward for a cart: the most expensive eligible pizza's base price. */
export function loyaltyRewardValue(cat: Catalog, priced: PricedLine[], cfg: LoyaltyConfig): number {
  if (!cfg.enabled) return 0;
  let best = 0;
  for (const p of priced) {
    if (!p.valid || p.line.kind !== "PIZZA") continue;
    if (cfg.rewardSizeId && p.line.sizeId !== cfg.rewardSizeId) continue;
    best = Math.max(best, p.basePrice);
  }
  return best;
}

export function stampsUntilReward(stamps: number, cfg: LoyaltyConfig) {
  // stampsRequired - 1 paid orders unlock the reward on the next order
  return Math.max(0, cfg.stampsRequired - 1 - stamps);
}

export function rewardAvailable(stamps: number, cfg: LoyaltyConfig) {
  return cfg.enabled && stamps >= cfg.stampsRequired - 1;
}

export function lineKey(line: Omit<CartLine, "key" | "quantity" | "note">) {
  const tops = Object.entries(line.toppings ?? {})
    .filter(([, n]) => n > 0)
    .sort()
    .map(([k, n]) => `${k}:${n}`)
    .join(",");
  const adds = Object.entries(line.addons ?? {})
    .filter(([, n]) => n > 0)
    .sort()
    .map(([k, n]) => `${k}:${n}`)
    .join(",");
  return [line.kind, line.productId ?? "custom", line.variantId ?? "", line.sizeId ?? "", line.crustId ?? "", tops, adds].join("|");
}

export const money = (n: number) =>
  "Rs. " + (Math.round(n * 100) / 100).toLocaleString("en-LK", { maximumFractionDigits: 2 });
