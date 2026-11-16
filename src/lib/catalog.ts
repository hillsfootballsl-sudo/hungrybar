import { db } from "./db";
import type { Catalog } from "./types";

/** Public catalog (no costs) — safe to send to the browser. */
export async function loadCatalog(opts: { includeInactive?: boolean } = {}): Promise<Catalog> {
  const active = opts.includeInactive ? {} : { active: true };
  const [sizes, crusts, toppings, categories, products, addons] = await Promise.all([
    db.pizzaSize.findMany({ where: active, orderBy: { sortOrder: "asc" } }),
    db.crust.findMany({ where: active, orderBy: { sortOrder: "asc" } }),
    db.topping.findMany({ where: active, orderBy: [{ group: "asc" }, { sortOrder: "asc" }], include: { sizes: true } }),
    db.category.findMany({ where: active, orderBy: { sortOrder: "asc" } }),
    db.product.findMany({
      where: { ...active, category: active },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { variants: { where: active, orderBy: { sortOrder: "asc" } }, toppings: true },
    }),
    db.addon.findMany({ where: active }),
  ]);
  return {
    sizes: sizes.map((s) => ({
      id: s.id,
      name: s.name,
      short: s.short,
      persons: s.persons,
      shape: s.shape === "RECT" ? "RECT" : "ROUND",
      doughGrams: s.doughGrams,
      basePrice: s.basePrice,
      inBuilder: s.inBuilder,
      sortOrder: s.sortOrder,
    })),
    crusts: crusts.map((c) => ({ id: c.id, name: c.name, description: c.description, extraPrice: c.extraPrice })),
    toppings: toppings.map((t) => ({
      id: t.id,
      name: t.name,
      group: t.group,
      visual: t.visual,
      maxPortions: t.maxPortions,
      unitLabel: t.unitLabel,
      isVeg: t.isVeg,
      sizes: Object.fromEntries(t.sizes.map((s) => [s.sizeId, { grams: s.grams, price: s.price }])),
    })),
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      tagline: c.tagline,
      icon: c.icon,
      availableFrom: c.availableFrom,
      availableTo: c.availableTo,
    })),
    products: products
      .filter((p) => p.variants.length > 0)
      .map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        categoryId: p.categoryId,
        kind: p.kind,
        art: p.art,
        image: p.image,
        tags: p.tags,
        featured: p.featured,
        variants: p.variants.map((v) => ({ id: v.id, name: v.name, sizeId: v.sizeId, price: v.price })),
        toppings: Object.fromEntries(p.toppings.map((t) => [t.toppingId, t.portions])),
      })),
    addons: addons.map((a) => ({ id: a.id, name: a.name, price: a.price, categoryId: a.categoryId })),
  };
}
