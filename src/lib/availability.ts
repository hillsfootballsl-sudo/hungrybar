import { colomboParts, hm, isOpenAt } from "./time";
import type { CartLine, Catalog } from "./types";

export function categoryOpen(cat: Catalog, categoryId: string, at: Date = new Date()) {
  const c = cat.categories.find((x) => x.id === categoryId);
  if (!c) return false;
  return isOpenAt(c.availableFrom, c.availableTo, colomboParts(at).minutes);
}

/** Returns names of items that can't be served at the given time */
export function unavailableAt(cat: Catalog, lines: CartLine[], at: Date = new Date()) {
  const out: string[] = [];
  for (const l of lines) {
    if (!l.productId) {
      // custom pizza follows the pizza category hours
      const pc = cat.categories.find((c) => c.icon === "pizza");
      if (pc && !isOpenAt(pc.availableFrom, pc.availableTo, colomboParts(at).minutes)) out.push("Build Your Own Pizza");
      continue;
    }
    const p = cat.products.find((x) => x.id === l.productId);
    if (p && !categoryOpen(cat, p.categoryId, at)) out.push(p.name);
  }
  return out;
}

export function nextOpening(from: string) {
  return hm(from);
}
