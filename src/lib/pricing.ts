// Pure pricing engine — runs identically in the browser (live price) and on the server (trusted price).
import type { CartLine, Catalog, CatProduct, ComboPick, PricedLine } from "./types";

export const round2 = (n: number) => Math.round(n * 100) / 100;

export function findProduct(cat: Catalog, id?: string) {
  return id ? cat.products.find((p) => p.id === id) : undefined;
}

/** Variant of a pizza product for the chosen size */
export function pizzaVariant(product: CatProduct, sizeId?: string) {
  return product.variants.find((v) => v.sizeId === sizeId);
}

export function describeToppings(cat: Catalog, toppings: Record<string, number>, preset: Record<string, number> | null): string {
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

/** Extra charge for toppings added on top of a preset (or all toppings for a custom pizza) */
function toppingExtras(cat: Catalog, sizeId: string, toppings: Record<string, number>, preset: Record<string, number> | null) {
  let extras = 0;
  for (const t of cat.toppings) {
    const n = Math.max(0, Math.min(t.maxPortions, Math.floor(toppings[t.id] ?? 0)));
    const included = preset ? preset[t.id] ?? 0 : 0;
    const extra = Math.max(0, n - included);
    const ts = t.sizes[sizeId];
    if (extra > 0 && ts) extras += ts.price * extra;
  }
  return extras;
}

type Bad = (error: string) => PricedLine;

function pricePizza(cat: Catalog, line: CartLine, qty: number, bad: Bad): PricedLine {
  const size = cat.sizes.find((s) => s.id === line.sizeId);
  if (!size) return bad("Pick a size");
  const crust = size.shape === "RECT" ? cat.crusts[0] : cat.crusts.find((c) => c.id === line.crustId) ?? cat.crusts[0];
  const toppings = line.toppings ?? {};
  let base = 0;
  let name = "Build Your Own Pizza";
  let preset: Record<string, number> | null = null;
  if (line.productId) {
    const product = findProduct(cat, line.productId);
    if (!product || product.kind !== "PIZZA") return bad("This pizza is no longer on the menu");
    const variant = pizzaVariant(product, size.id);
    if (!variant) return bad(`${product.name} isn't available in ${size.name}`);
    preset = product.toppings;
    base = variant.price;
    name = product.name;
  } else {
    if (!size.inBuilder) return bad("This size can't be custom built");
    base = size.basePrice;
  }
  const unit = round2(base + (crust?.extraPrice ?? 0) + toppingExtras(cat, size.id, toppings, preset));
  return {
    line,
    name,
    sizeName: size.name,
    crustName: size.shape === "RECT" ? "Detroit pan" : crust?.name,
    unitPrice: unit,
    lineTotal: round2(unit * qty),
    basePrice: base,
    points: 0,
    summary: describeToppings(cat, toppings, preset),
    valid: true,
  };
}

/** Find the combo option a pick matches */
export function matchOption(cat: Catalog, combo: CatProduct, pick: ComboPick) {
  const slot = combo.slots.find((s) => s.id === pick.slotId);
  if (!slot) return null;
  const product = findProduct(cat, pick.productId);
  if (!product) return null;
  const opt = slot.options.find(
    (o) =>
      o.productId === pick.productId &&
      (product.kind === "PIZZA" ? !o.sizeId || o.sizeId === pick.sizeId : !o.variantId || o.variantId === (pick.variantId ?? product.variants[0]?.id)),
  );
  return opt ? { slot, product, opt } : null;
}

/** Human-readable name of a combo pick, e.g. "Tandoori Chicken (2 Person)" */
export function pickLabel(cat: Catalog, pick: ComboPick) {
  const p = findProduct(cat, pick.productId);
  if (!p) return "Item";
  if (p.kind === "PIZZA") {
    const s = cat.sizes.find((x) => x.id === pick.sizeId);
    const extra = describeToppings(cat, pick.toppings ?? p.toppings, p.toppings);
    return `${p.name}${s ? ` (${s.short})` : ""}${extra ? ` [${extra}]` : ""}`;
  }
  const v = p.variants.find((x) => x.id === pick.variantId);
  return `${p.name}${v && p.variants.length > 1 ? ` (${v.name})` : ""}`;
}

function priceCombo(cat: Catalog, line: CartLine, qty: number, bad: Bad): PricedLine {
  const combo = findProduct(cat, line.productId);
  if (!combo || combo.kind !== "COMBO") return bad("This deal is no longer available");
  const base = combo.variants[0]?.price ?? 0;
  const picks = line.picks ?? [];
  let extra = 0;
  for (const slot of combo.slots) {
    const mine = picks.filter((p) => p.slotId === slot.id);
    if (mine.length !== slot.quantity) return bad(`Choose ${slot.quantity > 1 ? `${slot.quantity} items` : "an item"} for “${slot.label}”`);
  }
  for (const pick of picks) {
    const m = matchOption(cat, combo, pick);
    if (!m) return bad("One of the choices isn't part of this deal");
    extra += m.opt.upcharge;
    if (m.product.kind === "PIZZA" && pick.sizeId) extra += toppingExtras(cat, pick.sizeId, pick.toppings ?? m.product.toppings, m.product.toppings);
  }
  const unit = round2(base + extra);
  return {
    line,
    name: combo.name,
    unitPrice: unit,
    lineTotal: round2(unit * qty),
    basePrice: base,
    points: 0,
    summary: picks.map((p) => pickLabel(cat, p)).join(" + "),
    valid: true,
  };
}

export function priceLine(cat: Catalog, line: CartLine): PricedLine {
  const qty = Math.max(1, Math.floor(line.quantity || 1));
  const bad: Bad = (error) => ({ line, name: "Unavailable item", unitPrice: 0, lineTotal: 0, basePrice: 0, points: 0, summary: "", valid: false, error });

  // Reward claimed with points: the item is free, fixed recipe, one per line
  if (line.rewardId) {
    const r = cat.rewards.find((x) => x.id === line.rewardId);
    if (!r) return bad("This reward is no longer available");
    const product = findProduct(cat, r.productId);
    if (!product) return bad("This reward is no longer available");
    const v = product.variants.find((x) => x.id === r.variantId) ?? product.variants[0];
    const size = cat.sizes.find((s) => s.id === v?.sizeId);
    return {
      line,
      name: `${product.name}`,
      sizeName: size?.name ?? (product.variants.length > 1 ? v?.name : undefined),
      unitPrice: 0,
      lineTotal: 0,
      basePrice: v?.price ?? 0,
      points: r.points * qty,
      summary: `Reward · ${r.points.toLocaleString()} pts`,
      valid: true,
    };
  }
  if (line.kind === "PIZZA") return pricePizza(cat, line, qty, bad);
  if (line.kind === "COMBO") return priceCombo(cat, line, qty, bad);

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
    points: 0,
    summary: addonNames.join(" · "),
    valid: true,
  };
}

/** Lowest price shown on menu cards ("from Rs …") */
export function fromPrice(p: CatProduct) {
  return Math.min(...p.variants.map((v) => v.price));
}

export interface PointsConfig {
  enabled: boolean;
  rupeesPerPoint: number; // spend this many rupees to earn 1 point
}
export function pointsFor(amount: number, cfg: PointsConfig) {
  if (!cfg.enabled || cfg.rupeesPerPoint <= 0) return 0;
  return Math.floor(Math.max(0, amount) / cfg.rupeesPerPoint);
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
  const picks = (line.picks ?? []).map((p) => `${p.slotId}=${p.productId}/${p.sizeId ?? p.variantId ?? ""}`).join(";");
  return [line.kind, line.rewardId ? `R${line.rewardId}` : "", line.productId ?? "custom", line.variantId ?? "", line.sizeId ?? "", line.crustId ?? "", tops, adds, picks].join("|");
}

export const money = (n: number) => "Rs. " + (Math.round(n * 100) / 100).toLocaleString("en-LK", { maximumFractionDigits: 2 });
