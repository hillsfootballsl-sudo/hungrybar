"use server";
// All admin mutations. Every action re-checks the staff role on the server.
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MANAGERS, requireStaff } from "../auth";
import { db } from "../db";
import { checkLowStock } from "../orders";
import { DEFAULTS, setSetting, type SettingKey } from "../settings";

type Res = { ok: true; id?: string } | { ok: false; error: string };

async function guard<T>(fn: (staffId: string) => Promise<T>, paths: string[]): Promise<Res> {
  const s = await requireStaff(MANAGERS);
  try {
    const r = (await fn(s.sid)) as unknown as { id?: string } | undefined;
    paths.forEach((p) => revalidatePath(p));
    return { ok: true, id: r?.id };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, error: e.issues[0]?.message ?? "Invalid input" };
    const msg = (e as Error).message || "Failed";
    if (msg.includes("Unique constraint")) return { ok: false, error: "That name/code already exists" };
    console.error(e);
    return { ok: false, error: msg };
  }
}

const num = z.coerce.number().finite();
const str = (max = 120) => z.string().trim().max(max);
const optId = z.string().max(40).nullish().transform((v) => v || null);
const bool = z.union([z.boolean(), z.literal("on"), z.literal("true"), z.literal("false"), z.literal("")]).optional().transform((v) => v === true || v === "on" || v === "true");

// ───────── Inventory ─────────
const ingredientSchema = z.object({
  id: z.string().optional(),
  name: str().min(1, "Name required"),
  unit: z.enum(["g", "ml", "pcs"]),
  category: str(20),
  lowStock: num.min(0),
  costPerUnit: num.min(0),
  isPackaging: bool,
  active: bool,
  supplierId: optId,
  openingStock: num.min(0).optional(),
});
export async function saveIngredient(input: unknown) {
  return guard(async (staffId) => {
    const d = ingredientSchema.parse(input);
    const data = { name: d.name, unit: d.unit, category: d.category, lowStock: d.lowStock, costPerUnit: d.costPerUnit, isPackaging: d.isPackaging, active: d.active, supplierId: d.supplierId };
    if (d.id) return db.ingredient.update({ where: { id: d.id }, data });
    const ing = await db.ingredient.create({ data: { ...data, stock: d.openingStock ?? 0 } });
    if (d.openingStock) await db.stockMovement.create({ data: { ingredientId: ing.id, change: d.openingStock, balance: d.openingStock, reason: "OPENING", unitCost: d.costPerUnit, staffId } });
    return ing;
  }, ["/admin/inventory"]);
}

export async function adjustStock(input: unknown) {
  return guard(async (staffId) => {
    const d = z.object({ ingredientId: z.string(), mode: z.enum(["count", "add", "waste"]), qty: num, note: str(200).optional() }).parse(input);
    const ing = await db.ingredient.findUniqueOrThrow({ where: { id: d.ingredientId } });
    const change = d.mode === "count" ? d.qty - ing.stock : d.mode === "add" ? d.qty : -Math.abs(d.qty);
    if (!change) return;
    const after = await db.ingredient.update({ where: { id: ing.id }, data: { stock: { increment: change } } });
    await db.stockMovement.create({
      data: { ingredientId: ing.id, change, balance: after.stock, reason: d.mode === "waste" ? "WASTAGE" : "ADJUSTMENT", unitCost: ing.costPerUnit, note: d.note || (d.mode === "count" ? "Stock count" : null), staffId },
    });
    await checkLowStock();
  }, ["/admin/inventory", "/admin"]);
}

// ───────── Suppliers & purchases ─────────
export async function saveSupplier(input: unknown) {
  return guard(async () => {
    const d = z.object({ id: z.string().optional(), name: str().min(1), phone: str(30).optional(), leadDays: z.coerce.number().int().min(0).max(60), notes: str(300).optional(), active: bool }).parse(input);
    const data = { name: d.name, phone: d.phone || null, leadDays: d.leadDays, notes: d.notes || null, active: d.active };
    return d.id ? db.supplier.update({ where: { id: d.id }, data }) : db.supplier.create({ data });
  }, ["/admin/purchases"]);
}

export async function createPurchase(input: unknown) {
  return guard(async (staffId) => {
    const d = z
      .object({
        supplierId: optId,
        invoiceNo: str(40).optional(),
        date: z.string().optional(),
        paid: z.boolean(),
        note: str(300).optional(),
        updateCost: z.boolean(),
        items: z.array(z.object({ ingredientId: z.string(), quantity: num.positive("Quantity must be > 0"), total: num.min(0) })).min(1, "Add at least one item"),
      })
      .parse(input);
    return db.$transaction(async (tx) => {
      const total = d.items.reduce((s, i) => s + i.total, 0);
      const p = await tx.purchase.create({ data: { supplierId: d.supplierId, invoiceNo: d.invoiceNo || null, date: d.date ? new Date(d.date) : new Date(), paid: d.paid, note: d.note || null, total, staffId } });
      for (const i of d.items) {
        const unitCost = i.total / i.quantity;
        await tx.purchaseItem.create({ data: { purchaseId: p.id, ingredientId: i.ingredientId, quantity: i.quantity, unitCost, total: i.total } });
        const before = await tx.ingredient.findUniqueOrThrow({ where: { id: i.ingredientId } });
        // weighted-average cost keeps food-cost numbers honest when prices change
        const newCost = d.updateCost ? (Math.max(0, before.stock) * before.costPerUnit + i.total) / (Math.max(0, before.stock) + i.quantity) : before.costPerUnit;
        const after = await tx.ingredient.update({ where: { id: i.ingredientId }, data: { stock: { increment: i.quantity }, costPerUnit: Math.round(newCost * 10000) / 10000 } });
        await tx.stockMovement.create({ data: { ingredientId: i.ingredientId, change: i.quantity, balance: after.stock, reason: "PURCHASE", purchaseId: p.id, unitCost, staffId } });
      }
      return p;
    });
  }, ["/admin/purchases", "/admin/inventory"]);
}

// ───────── Sectors ─────────
export async function addSectorEntry(input: unknown) {
  return guard(async (staffId) => {
    const d = z.object({ sector: z.enum(["FOOD", "PACKAGING", "ROYALTY", "CHARITY", "DELIVERY", "PLATFORM", "PROFIT"]), amount: num.refine((v) => v !== 0, "Amount required"), note: str(200).optional(), date: z.string().optional() }).parse(input);
    return db.sectorEntry.create({ data: { sector: d.sector, amount: d.amount, note: d.note || null, date: d.date ? new Date(d.date) : new Date(), staffId } });
  }, ["/admin/sectors"]);
}
export async function deleteSectorEntry(id: string) {
  return guard(() => db.sectorEntry.delete({ where: { id } }), ["/admin/sectors"]);
}

// ───────── Menu ─────────
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export async function saveCategory(input: unknown) {
  return guard(async () => {
    const d = z.object({ id: z.string().optional(), name: str().min(1), tagline: str(120).optional(), icon: str(30).optional(), availableFrom: z.string().regex(/^\d\d:\d\d$/), availableTo: z.string().regex(/^\d\d:\d\d$/), sortOrder: z.coerce.number().int(), active: bool }).parse(input);
    const data = { name: d.name, tagline: d.tagline || null, icon: d.icon || null, availableFrom: d.availableFrom, availableTo: d.availableTo, sortOrder: d.sortOrder, active: d.active };
    return d.id ? db.category.update({ where: { id: d.id }, data }) : db.category.create({ data: { ...data, slug: slugify(d.name) + "-" + randomBytes(2).toString("hex") } });
  }, ["/admin/menu", "/menu", "/"]);
}

const productSchema = z.object({
  id: z.string().optional(),
  name: str().min(1, "Name required"),
  description: str(400).optional(),
  categoryId: z.string(),
  kind: z.enum(["PIZZA", "ITEM"]),
  art: str(40).optional(),
  image: str(400).optional(),
  tags: z.array(str(20)).max(6),
  featured: z.boolean(),
  active: z.boolean(),
  sortOrder: z.coerce.number().int(),
  variants: z
    .array(
      z.object({
        id: z.string().optional(),
        name: str(40).min(1, "Variant name required"),
        sizeId: optId,
        price: num.min(0),
        royalty: num.min(0),
        charity: num.min(0),
        active: z.boolean(),
        recipe: z.array(z.object({ ingredientId: z.string(), quantity: num.positive() })),
      }),
    )
    .min(1, "Add at least one size/variant"),
  toppings: z.record(z.string(), z.number().int().min(0).max(10)),
});

export async function saveProduct(input: unknown) {
  return guard(async () => {
    const d = productSchema.parse(input);
    return db.$transaction(async (tx) => {
      const base = { name: d.name, description: d.description || null, categoryId: d.categoryId, kind: d.kind, art: d.art || null, image: d.image || null, tags: d.tags, featured: d.featured, active: d.active, sortOrder: d.sortOrder };
      const p = d.id ? await tx.product.update({ where: { id: d.id }, data: base }) : await tx.product.create({ data: { ...base, slug: slugify(d.name) + "-" + randomBytes(2).toString("hex") } });
      // variants: update existing, create new, deactivate removed (keeps order history intact)
      const keep: string[] = [];
      for (const [i, v] of d.variants.entries()) {
        const data = { name: v.name, sizeId: d.kind === "PIZZA" ? v.sizeId : null, price: v.price, royalty: v.royalty, charity: v.charity, active: v.active, sortOrder: i };
        const row = v.id ? await tx.productVariant.update({ where: { id: v.id }, data }) : await tx.productVariant.create({ data: { ...data, productId: p.id } });
        keep.push(row.id);
        await tx.recipeLine.deleteMany({ where: { variantId: row.id } });
        if (v.recipe.length) await tx.recipeLine.createMany({ data: v.recipe.map((r) => ({ variantId: row.id, ingredientId: r.ingredientId, quantity: r.quantity })) });
      }
      await tx.productVariant.updateMany({ where: { productId: p.id, id: { notIn: keep } }, data: { active: false } });
      await tx.productTopping.deleteMany({ where: { productId: p.id } });
      const tops = Object.entries(d.toppings).filter(([, n]) => n > 0);
      if (d.kind === "PIZZA" && tops.length) await tx.productTopping.createMany({ data: tops.map(([toppingId, portions]) => ({ productId: p.id, toppingId, portions })) });
      return p;
    });
  }, ["/admin/menu", "/menu", "/", "/build"]);
}

export async function toggleProduct(id: string, active: boolean) {
  return guard(() => db.product.update({ where: { id }, data: { active } }), ["/admin/menu", "/menu"]);
}

export async function saveAddon(input: unknown) {
  return guard(async () => {
    const d = z.object({ id: z.string().optional(), name: str().min(1), price: num.min(0), categoryId: z.string(), ingredientId: optId, quantity: num.min(0), active: bool }).parse(input);
    const data = { name: d.name, price: d.price, categoryId: d.categoryId, ingredientId: d.ingredientId, quantity: d.quantity, active: d.active };
    return d.id ? db.addon.update({ where: { id: d.id }, data }) : db.addon.create({ data });
  }, ["/admin/menu"]);
}

// ───────── Pizza builder ─────────
export async function saveSize(input: unknown) {
  return guard(async () => {
    const d = z.object({ id: z.string().optional(), name: str(40).min(1), short: str(4).min(1), persons: z.coerce.number().int().min(1), shape: z.enum(["ROUND", "RECT"]), doughGrams: num.min(0), basePrice: num.min(0), royalty: num.min(0), charity: num.min(0), boxId: optId, inBuilder: bool, active: bool, sortOrder: z.coerce.number().int() }).parse(input);
    const { id, ...data } = d;
    return id ? db.pizzaSize.update({ where: { id }, data }) : db.pizzaSize.create({ data });
  }, ["/admin/builder", "/build", "/menu"]);
}

export async function saveCrust(input: unknown) {
  return guard(async () => {
    const d = z.object({ id: z.string().optional(), name: str(40).min(1), description: str(120).optional(), extraPrice: num.min(0), doughFactor: num.min(0.1).max(3), doughId: optId, active: bool, sortOrder: z.coerce.number().int() }).parse(input);
    const { id, ...data } = d;
    return id ? db.crust.update({ where: { id }, data: { ...data, description: data.description || null } }) : db.crust.create({ data: { ...data, description: data.description || null } });
  }, ["/admin/builder", "/build"]);
}

export async function saveTopping(input: unknown) {
  return guard(async () => {
    const d = z
      .object({
        id: z.string().optional(),
        name: str(40).min(1),
        group: z.enum(["SAUCE", "CHEESE", "MEAT", "VEG", "EXTRA"]),
        visual: str(30).min(1),
        ingredientId: optId,
        maxPortions: z.coerce.number().int().min(1).max(6),
        unitLabel: str(20).min(1),
        isVeg: z.boolean(),
        active: z.boolean(),
        sortOrder: z.coerce.number().int(),
        sizes: z.array(z.object({ sizeId: z.string(), grams: num.min(0), price: num.min(0) })),
      })
      .parse(input);
    return db.$transaction(async (tx) => {
      const { id, sizes, ...data } = d;
      const t = id ? await tx.topping.update({ where: { id }, data }) : await tx.topping.create({ data });
      for (const s of sizes) await tx.toppingSize.upsert({ where: { toppingId_sizeId: { toppingId: t.id, sizeId: s.sizeId } }, create: { toppingId: t.id, ...s }, update: { grams: s.grams, price: s.price } });
      return t;
    });
  }, ["/admin/builder", "/build", "/menu"]);
}

// ───────── Customers, promos ─────────
export async function setStamps(input: unknown) {
  return guard(async () => {
    const d = z.object({ id: z.string(), stamps: z.coerce.number().int().min(0).max(100), name: str(60).optional(), notes: str(300).optional() }).parse(input);
    return db.customer.update({ where: { id: d.id }, data: { stamps: d.stamps, name: d.name || undefined, notes: d.notes ?? undefined } });
  }, ["/admin/customers"]);
}

export async function savePromo(input: unknown) {
  return guard(async () => {
    const d = z
      .object({
        id: z.string().optional(),
        code: str(30).min(2).transform((s) => s.toUpperCase().replace(/\s/g, "")),
        description: str(120).optional(),
        type: z.enum(["PERCENT", "FIXED"]),
        value: num.positive(),
        minOrder: num.min(0),
        maxDiscount: z.union([num.min(0), z.literal("")]).optional(),
        maxUses: z.union([z.coerce.number().int().min(1), z.literal("")]).optional(),
        startsAt: z.string().optional(),
        endsAt: z.string().optional(),
        webOnly: bool,
        active: bool,
      })
      .parse(input);
    const data = {
      code: d.code, description: d.description || null, type: d.type, value: d.value, minOrder: d.minOrder,
      maxDiscount: d.maxDiscount === "" || d.maxDiscount == null ? null : Number(d.maxDiscount),
      maxUses: d.maxUses === "" || d.maxUses == null ? null : Number(d.maxUses),
      startsAt: d.startsAt ? new Date(d.startsAt) : null, endsAt: d.endsAt ? new Date(d.endsAt) : null, webOnly: d.webOnly, active: d.active,
    };
    return d.id ? db.promo.update({ where: { id: d.id }, data }) : db.promo.create({ data });
  }, ["/admin/promos"]);
}

// ───────── Delivery & tables ─────────
export async function saveZone(input: unknown) {
  return guard(async () => {
    const d = z.object({ id: z.string().optional(), name: str(60).min(1), fee: num.min(0), etaMinutes: z.coerce.number().int().min(5).max(180), sortOrder: z.coerce.number().int(), active: bool }).parse(input);
    const { id, ...data } = d;
    return id ? db.deliveryZone.update({ where: { id }, data }) : db.deliveryZone.create({ data });
  }, ["/admin/delivery", "/"]);
}
export async function saveTable(input: unknown) {
  return guard(async () => {
    const d = z.object({ id: z.string().optional(), label: str(10).min(1), seats: z.coerce.number().int().min(1).max(30), active: bool }).parse(input);
    const { id, ...data } = d;
    return id ? db.diningTable.update({ where: { id }, data }) : db.diningTable.create({ data: { ...data, token: randomBytes(6).toString("hex") } });
  }, ["/admin/delivery"]);
}
export async function rotateTableToken(id: string) {
  return guard(() => db.diningTable.update({ where: { id }, data: { token: randomBytes(6).toString("hex") } }), ["/admin/delivery"]);
}

// ───────── Staff ─────────
export async function saveStaff(input: unknown) {
  return guard(async (me) => {
    const d = z
      .object({ id: z.string().optional(), name: str(40).min(1), role: z.enum(["OWNER", "MANAGER", "CASHIER", "KITCHEN", "RIDER"]), phone: str(20).optional(), pin: z.string().regex(/^(\d{4})?$/, "PIN must be exactly 4 digits").optional(), active: bool })
      .parse(input);
    if (!d.id && !d.pin) throw new Error("Set a 4-digit PIN");
    if (d.id === me && !d.active) throw new Error("You can't deactivate yourself");
    const data = { name: d.name, role: d.role, phone: d.phone || null, active: d.active, ...(d.pin ? { pinHash: await bcrypt.hash(d.pin, 10) } : {}) };
    if (d.role !== "OWNER" && d.id) {
      const owners = await db.staff.count({ where: { role: "OWNER", active: true, id: { not: d.id } } });
      const was = await db.staff.findUnique({ where: { id: d.id } });
      if (was?.role === "OWNER" && owners === 0) throw new Error("Keep at least one active owner");
    }
    return d.id ? db.staff.update({ where: { id: d.id }, data }) : db.staff.create({ data: data as typeof data & { pinHash: string } });
  }, ["/admin/staff", "/staff/login"]);
}

// ───────── Settings ─────────
export async function saveSettings(key: SettingKey, value: unknown) {
  return guard(async () => {
    if (!(key in DEFAULTS)) throw new Error("Unknown setting");
    const merged = { ...DEFAULTS[key], ...(value as object) };
    await setSetting(key, merged as never);
  }, ["/admin/settings", "/admin/receipt", "/", "/menu", "/pos"]);
}
