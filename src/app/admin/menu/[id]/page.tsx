import { notFound } from "next/navigation";
import { ProductEditor } from "@/components/admin/ProductEditor";
import { PageHeader } from "@/components/admin/ui";
import { loadCatalog } from "@/lib/catalog";
import { db } from "@/lib/db";

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNew = id === "new";
  const [product, cats, ings, catalog, sizes, crusts] = await Promise.all([
    isNew ? null : db.product.findUnique({ where: { id }, include: { variants: { where: { active: true }, orderBy: { sortOrder: "asc" }, include: { recipe: true } }, toppings: true, comboSlots: { orderBy: { sortOrder: "asc" } } } }),
    db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    db.ingredient.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, unit: true, costPerUnit: true, isPackaging: true } }),
    loadCatalog({ includeInactive: false }),
    db.pizzaSize.findMany({ orderBy: { sortOrder: "asc" } }),
    db.crust.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  if (!isNew && !product) notFound();
  const [toppingIng, choiceRows] = await Promise.all([
    db.topping.findMany({ select: { id: true, ingredientId: true } }),
    db.product.findMany({ where: { kind: { not: "COMBO" } }, orderBy: [{ categoryId: "asc" }, { sortOrder: "asc" }], select: { id: true, name: true, kind: true, variants: { where: { active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true, sizeId: true, price: true } } } }),
  ]);
  return (
    <div>
      <PageHeader title={isNew ? "New product" : `Edit ${product!.name}`} sub="Prices, sizes and the exact recipe — stock & food cost follow these numbers." />
      <ProductEditor
        catalog={catalog}
        categories={cats}
        ingredients={ings}
        sizes={sizes.map((s) => ({ id: s.id, name: s.name, doughGrams: s.doughGrams, boxId: s.boxId, royalty: s.royalty, charity: s.charity }))}
        dough={{ id: crusts[0]?.doughId ?? null }}
        toppingIngredient={Object.fromEntries(toppingIng.map((t) => [t.id, t.ingredientId]))}
        choices={choiceRows}
        initial={
          product
            ? {
                id: product.id,
                name: product.name,
                description: product.description ?? "",
                categoryId: product.categoryId,
                kind: product.kind,
                isVeg: product.isVeg,
                slots: product.comboSlots.map((sl) => ({ label: sl.label, quantity: sl.quantity, options: (sl.options as { productId: string; sizeId?: string | null; variantId?: string | null; upcharge: number }[]).map((o) => ({ productId: o.productId, sizeId: o.sizeId ?? null, variantId: o.variantId ?? null, upcharge: o.upcharge })) })),
                art: product.art ?? "",
                image: product.image ?? "",
                tags: product.tags,
                featured: product.featured,
                active: product.active,
                sortOrder: product.sortOrder,
                variants: product.variants.map((v) => ({ id: v.id, name: v.name, sizeId: v.sizeId ?? "", price: v.price, royalty: v.royalty, charity: v.charity, active: v.active, recipe: v.recipe.map((r) => ({ ingredientId: r.ingredientId, quantity: r.quantity })) })),
                toppings: Object.fromEntries(product.toppings.map((t) => [t.toppingId, t.portions])),
              }
            : null
        }
      />
    </div>
  );
}
