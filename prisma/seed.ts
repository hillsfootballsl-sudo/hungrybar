/* eslint-disable no-console */
// Seeds Hungry Bar with the real menu (Menu Board 3) + starter recipes/stock.
// Usage:  npm run db:seed            (only seeds an empty database)
//         SEED_RESET=1 npm run db:seed   (wipes everything first — careful!)
//         SEED_DEMO=1 npm run db:seed    (also creates ~3 weeks of demo orders for the dashboard)
import { PrismaClient, type ToppingGroup } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const db = new PrismaClient();

async function reset() {
  const tables = [
    "OrderItem", "Order", "StockMovement", "PurchaseItem", "Purchase", "RecipeLine", "ProductTopping", "ProductVariant",
    "Product", "Addon", "Category", "ToppingSize", "Topping", "Crust", "PizzaSize", "Ingredient", "Supplier", "CashMovement",
    "Shift", "Staff", "Customer", "OtpCode", "DeliveryZone", "DiningTable", "Promo", "SectorEntry", "Notification", "Setting",
  ];
  for (const t of tables) await db.$executeRawUnsafe(`TRUNCATE TABLE "${t}" CASCADE`);
}

async function main() {
  if (process.env.SEED_RESET === "1") {
    console.log("Resetting database…");
    await reset();
  }
  if ((await db.pizzaSize.count()) > 0) {
    console.log("Database already has data — skipping seed (use SEED_RESET=1 to wipe).");
    return;
  }

  // ───────── Suppliers ─────────
  const supMeat = await db.supplier.create({ data: { name: "Halal Meat Supplier", phone: "", leadDays: 2 } });
  const supDairy = await db.supplier.create({ data: { name: "Cheese & Dairy Supplier", phone: "", leadDays: 3 } });
  const supVeg = await db.supplier.create({ data: { name: "Dehiwala Market (Veg & Fruit)", phone: "", leadDays: 1 } });
  const supPack = await db.supplier.create({ data: { name: "Packaging Supplier", phone: "", leadDays: 5 } });

  // ───────── Ingredients (stock in g / ml / pcs; cost in LKR per unit) ─────────
  type I = { name: string; unit?: string; category: string; stock: number; low: number; cost: number; pack?: boolean; sup?: string };
  const ingList: I[] = [
    { name: "Pizza Dough", category: "DOUGH", stock: 25000, low: 5000, cost: 0.35 },
    { name: "Tomato Sauce (home-made)", category: "SAUCE", stock: 8000, low: 1500, cost: 0.8 },
    { name: "Mozzarella Cheese", category: "CHEESE", stock: 12000, low: 2500, cost: 3.2, sup: supDairy.id },
    { name: "Tandoori Chicken", category: "MEAT", stock: 8000, low: 1500, cost: 2.4, sup: supMeat.id },
    { name: "Spicy Chicken", category: "MEAT", stock: 3000, low: 600, cost: 2.4, sup: supMeat.id },
    { name: "Beef", category: "MEAT", stock: 7000, low: 1500, cost: 2.8, sup: supMeat.id },
    { name: "Pepperoni (beef)", category: "MEAT", stock: 5000, low: 1000, cost: 4.5, sup: supMeat.id },
    { name: "Green Bell Pepper", category: "VEG", stock: 3000, low: 500, cost: 1.2, sup: supVeg.id },
    { name: "Red Bell Pepper", category: "VEG", stock: 3000, low: 500, cost: 1.6, sup: supVeg.id },
    { name: "Capsicum", category: "VEG", stock: 3000, low: 500, cost: 0.9, sup: supVeg.id },
    { name: "Onion", category: "VEG", stock: 5000, low: 800, cost: 0.35, sup: supVeg.id },
    { name: "Lasagna Portion (chicken)", unit: "pcs", category: "OTHER", stock: 20, low: 5, cost: 480 },
    { name: "Garlic Bread", unit: "pcs", category: "BAKERY", stock: 60, low: 15, cost: 32 },
    { name: "Panini Bread (Regular)", unit: "pcs", category: "BAKERY", stock: 40, low: 10, cost: 55 },
    { name: "Panini Bread (Large)", unit: "pcs", category: "BAKERY", stock: 30, low: 8, cost: 85 },
    { name: "Cheese Slice", unit: "pcs", category: "CHEESE", stock: 100, low: 20, cost: 45, sup: supDairy.id },
    { name: "Watermelon", category: "FRUIT", stock: 8000, low: 1500, cost: 0.25, sup: supVeg.id },
    { name: "Pineapple", category: "FRUIT", stock: 6000, low: 1200, cost: 0.4, sup: supVeg.id },
    { name: "Mango", category: "FRUIT", stock: 5000, low: 1000, cost: 0.7, sup: supVeg.id },
    { name: "Papaya", category: "FRUIT", stock: 5000, low: 1000, cost: 0.3, sup: supVeg.id },
    { name: "Avocado", category: "FRUIT", stock: 3000, low: 600, cost: 0.9, sup: supVeg.id },
    { name: "Lime", category: "FRUIT", stock: 2000, low: 400, cost: 0.8, sup: supVeg.id },
    { name: "Passion Fruit", category: "FRUIT", stock: 2000, low: 400, cost: 0.9, sup: supVeg.id },
    { name: "Strawberry", category: "FRUIT", stock: 1500, low: 300, cost: 2.5, sup: supVeg.id },
    { name: "Mint Leaves", category: "VEG", stock: 800, low: 150, cost: 1.5, sup: supVeg.id },
    { name: "Sugar Syrup", unit: "ml", category: "BEVERAGE", stock: 5000, low: 1000, cost: 0.15 },
    { name: "Soda Water", unit: "ml", category: "BEVERAGE", stock: 12000, low: 2400, cost: 0.12 },
    { name: "Blue Curacao Syrup (non-alc)", unit: "ml", category: "BEVERAGE", stock: 1500, low: 300, cost: 1.2 },
    { name: "Water Bottle 500ml", unit: "pcs", category: "BEVERAGE", stock: 48, low: 12, cost: 60 },
    { name: "Pizza Box 1 Person", unit: "pcs", category: "PACKAGING", stock: 200, low: 40, cost: 60, pack: true, sup: supPack.id },
    { name: "Pizza Box 2 Person", unit: "pcs", category: "PACKAGING", stock: 150, low: 30, cost: 140, pack: true, sup: supPack.id },
    { name: "Pizza Box 4 Person", unit: "pcs", category: "PACKAGING", stock: 100, low: 20, cost: 140, pack: true, sup: supPack.id },
    { name: "Detroit Box", unit: "pcs", category: "PACKAGING", stock: 100, low: 20, cost: 80, pack: true, sup: supPack.id },
    { name: "Carry Bag", unit: "pcs", category: "PACKAGING", stock: 500, low: 100, cost: 2.5, pack: true, sup: supPack.id },
    { name: "Juice Cup + Lid + Straw", unit: "pcs", category: "PACKAGING", stock: 300, low: 60, cost: 25, pack: true, sup: supPack.id },
    { name: "Panini Wrap Paper", unit: "pcs", category: "PACKAGING", stock: 300, low: 60, cost: 8, pack: true, sup: supPack.id },
    { name: "Lasagna Tray", unit: "pcs", category: "PACKAGING", stock: 60, low: 15, cost: 45, pack: true, sup: supPack.id },
  ];
  const ing: Record<string, string> = {};
  for (const i of ingList) {
    const row = await db.ingredient.create({
      data: { name: i.name, unit: i.unit ?? "g", category: i.category, stock: i.stock, lowStock: i.low, costPerUnit: i.cost, isPackaging: !!i.pack, supplierId: i.sup ?? null },
    });
    ing[i.name] = row.id;
    await db.stockMovement.create({ data: { ingredientId: row.id, change: i.stock, balance: i.stock, reason: "OPENING", unitCost: i.cost, note: "Opening stock (sample — please recount)" } });
  }

  // ───────── Pizza sizes & crusts ─────────
  const s1 = await db.pizzaSize.create({ data: { name: "1 Person", short: "1P", persons: 1, doughGrams: 180, basePrice: 680, royalty: 100, charity: 50, boxId: ing["Pizza Box 1 Person"], sortOrder: 1 } });
  const s2 = await db.pizzaSize.create({ data: { name: "2 Person", short: "2P", persons: 2, doughGrams: 270, basePrice: 1210, royalty: 150, charity: 75, boxId: ing["Pizza Box 2 Person"], sortOrder: 2 } });
  const s4 = await db.pizzaSize.create({ data: { name: "4 Person", short: "4P", persons: 4, doughGrams: 320, basePrice: 1480, royalty: 200, charity: 100, boxId: ing["Pizza Box 4 Person"], sortOrder: 3 } });
  const sD = await db.pizzaSize.create({ data: { name: "Detroit Box", short: "DT", persons: 1, shape: "RECT", doughGrams: 200, basePrice: 540, royalty: 100, charity: 50, boxId: ing["Detroit Box"], sortOrder: 4, inBuilder: true } });

  await db.crust.create({ data: { name: "Thick · Hand-tossed", description: "Soft, airy and golden — our classic", doughFactor: 1, doughId: ing["Pizza Dough"], sortOrder: 1 } });
  await db.crust.create({ data: { name: "Thin & Crispy", description: "Light, crunchy, edge-to-edge toppings", doughFactor: 1, doughId: ing["Pizza Dough"], sortOrder: 2 } });

  // ───────── Toppings: grams + price per portion for 1P / 2P / 4P / Detroit ─────────
  type T = { name: string; group: ToppingGroup; visual: string; ing: string; g: [number, number, number, number]; p: [number, number, number, number]; max?: number; unit?: string; veg?: boolean };
  const tops: T[] = [
    { name: "Tomato Sauce", group: "SAUCE", visual: "sauce", ing: "Tomato Sauce (home-made)", g: [40, 60, 75, 40], p: [60, 90, 110, 60], max: 3, unit: "scoop", veg: true },
    { name: "Mozzarella", group: "CHEESE", visual: "cheese", ing: "Mozzarella Cheese", g: [45, 70, 85, 50], p: [250, 350, 400, 250], max: 3, veg: true },
    { name: "Tandoori Chicken", group: "MEAT", visual: "chicken", ing: "Tandoori Chicken", g: [45, 70, 85, 45], p: [200, 300, 350, 200] },
    { name: "Beef", group: "MEAT", visual: "beef", ing: "Beef", g: [45, 70, 85, 45], p: [250, 350, 400, 250] },
    { name: "Pepperoni", group: "MEAT", visual: "pepperoni", ing: "Pepperoni (beef)", g: [30, 45, 55, 30], p: [200, 300, 350, 200] },
    { name: "Green Bell Pepper", group: "VEG", visual: "pepper_green", ing: "Green Bell Pepper", g: [15, 22, 28, 15], p: [80, 120, 150, 80], veg: true },
    { name: "Red Bell Pepper", group: "VEG", visual: "pepper_red", ing: "Red Bell Pepper", g: [15, 22, 28, 15], p: [80, 120, 150, 80], veg: true },
    { name: "Capsicum", group: "VEG", visual: "capsicum", ing: "Capsicum", g: [15, 22, 28, 15], p: [80, 120, 150, 80], veg: true },
    { name: "Onion Wedges", group: "VEG", visual: "onion", ing: "Onion", g: [20, 30, 36, 20], p: [60, 90, 110, 60], veg: true },
  ];
  const top: Record<string, string> = {};
  let order = 0;
  for (const t of tops) {
    const row = await db.topping.create({
      data: {
        name: t.name, group: t.group, visual: t.visual, ingredientId: ing[t.ing], maxPortions: t.max ?? 3, unitLabel: t.unit ?? "portion", isVeg: !!t.veg, sortOrder: order++,
        sizes: { create: [s1, s2, s4, sD].map((s, i) => ({ sizeId: s.id, grams: t.g[i], price: t.p[i] })) },
      },
    });
    top[t.visual] = row.id;
  }

  // ───────── Categories ─────────
  const cat = async (name: string, slug: string, tagline: string, icon: string, from: string, to: string, sortOrder: number) =>
    db.category.create({ data: { name, slug, tagline, icon, availableFrom: from, availableTo: to, sortOrder } });
  const cPizza = await cat("Original Pizzas", "original-pizzas", "Freshly baked · Served hot · Hand-tossed", "pizza", "11:00", "24:00", 1);
  const cDetroit = await cat("Detroit Style Pizza", "detroit-style", "If my pizza is not box, I don't want it!", "detroit", "11:00", "24:00", 2);
  const cFav = await cat("All Time Favourite", "all-time-favourite", "Freshly made at home", "lasagna", "11:00", "24:00", 3);
  const cSnack = await cat("Snack Attack", "snack-attack", "Spoil yourself while your pizza is getting baked", "garlicbread", "11:00", "24:00", 4);
  const cPanini = await cat("The Toast Theory · Paninis", "paninis", "Breakfast · Lunch · Dinner", "panini", "06:00", "22:00", 5);
  const cJuice = await cat("Fresh Juices", "fresh-juices", "Squeezed to order", "juice", "06:00", "22:00", 6);
  const cMojito = await cat("Mojitos", "mojitos", "Virgin, icy & minty", "mojito", "06:00", "24:00", 7);
  const cDrinks = await cat("Drinks", "drinks", "", "water", "06:00", "24:00", 8);

  // ───────── Pizzas (Menu Board 3) ─────────
  const pizza = async (name: string, desc: string, prices: [number, number, number], preset: Record<string, number>, tags: string[], featured = false, sortOrder = 0) => {
    const p = await db.product.create({
      data: {
        name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), description: desc, categoryId: cPizza.id, kind: "PIZZA", tags, featured, sortOrder,
        variants: { create: [s1, s2, s4].map((s, i) => ({ name: s.name, sizeId: s.id, price: prices[i], sortOrder: i })) },
        toppings: { create: Object.entries(preset).map(([v, n]) => ({ toppingId: top[v], portions: n })) },
      },
    });
    return p;
  };
  const base = "Made with fresh dough, home-made tomato sauce, mozzarella cheese";
  await pizza("Margherita", base, [990, 1650, 1990], { sauce: 1, cheese: 1 }, ["veg"], false, 1);
  await pizza("Tandoori Chicken", `${base}, tandoori chicken, bell pepper, onion, capsicum`, [1350, 1990, 2450], { sauce: 1, cheese: 1, chicken: 1, pepper_green: 1, onion: 1, capsicum: 1 }, ["bestseller", "spicy"], true, 2);
  await pizza("Beef Supreme", `${base}, beef, bell pepper, onion, capsicum`, [1550, 2250, 2690], { sauce: 1, cheese: 1, beef: 1, pepper_green: 1, onion: 1, capsicum: 1 }, [], true, 3);
  await pizza("Pepperoni", `${base}, pepperoni slices`, [1390, 1950, 2490], { sauce: 1, cheese: 1, pepperoni: 1 }, [], true, 4);
  await pizza("Mix Meat Special", `${base}, tandoori chicken, beef, pepperoni slices`, [1750, 2490, 2990], { sauce: 1, cheese: 1, chicken: 1, beef: 1, pepperoni: 1 }, ["loaded"], true, 5);

  const detroit = async (name: string, desc: string, price: number, preset: Record<string, number>, sortOrder: number) =>
    db.product.create({
      data: {
        name, slug: "detroit-" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), description: desc, categoryId: cDetroit.id, kind: "PIZZA", tags: ["new"], sortOrder,
        variants: { create: [{ name: "Detroit Box", sizeId: sD.id, price }] },
        toppings: { create: Object.entries(preset).map(([v, n]) => ({ toppingId: top[v], portions: n })) },
      },
    });
  await detroit("Box Margherita", "Square, deep-pan, crispy caramelised cheese edges", 850, { sauce: 1, cheese: 2 }, 1);
  await detroit("Tandoori Loaded", "Detroit pan loaded with tandoori chicken & cheese", 990, { sauce: 1, cheese: 2, chicken: 1, onion: 1 }, 2);
  await detroit("Beef Supreme", "Detroit pan with beef, peppers & onion", 1100, { sauce: 1, cheese: 2, beef: 1, pepper_green: 1, onion: 1 }, 3);
  await detroit("Loaded Pepperoni", "Detroit pan with cups of pepperoni", 950, { sauce: 1, cheese: 2, pepperoni: 2 }, 4);

  // ───────── Items ─────────
  const item = async (
    categoryId: string, name: string, desc: string, art: string,
    variants: { name: string; price: number; recipe: [string, number][] }[], sortOrder: number, tags: string[] = [], featured = false,
  ) =>
    db.product.create({
      data: {
        name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + (categoryId === cPanini.id ? "-panini" : ""), description: desc, categoryId, kind: "ITEM", art, tags, featured, sortOrder,
        variants: {
          create: variants.map((v, i) => ({ name: v.name, price: v.price, sortOrder: i, recipe: { create: v.recipe.map(([n, q]) => ({ ingredientId: ing[n], quantity: q })) } })),
        },
      },
    });

  await item(cFav.id, "Chicken Lasagna", "Hungry Bar's all time favourite — layered, cheesy, freshly made at home. Personal portion.", "lasagna",
    [{ name: "Personal", price: 1150, recipe: [["Lasagna Portion (chicken)", 1], ["Lasagna Tray", 1]] }], 1, ["favourite"], true);
  await item(cSnack.id, "Garlic Bread", "Warm, buttery, garlicky. 1 piece.", "garlicbread", [{ name: "1 pc", price: 100, recipe: [["Garlic Bread", 1]] }], 1);

  const panini = async (name: string, r: number, l: number, filling: [string, number][], sortOrder: number) =>
    item(cPanini.id, name, "Pressed, toasty, melty — from The Toast Theory", "panini", [
      { name: "Regular", price: r, recipe: [["Panini Bread (Regular)", 1], ["Panini Wrap Paper", 1], ...filling] },
      { name: "Large", price: l, recipe: [["Panini Bread (Large)", 1], ["Panini Wrap Paper", 1], ...filling.map(([n, q]) => [n, Math.round(q * 1.5)] as [string, number])] },
    ], sortOrder);
  await panini("Classic Cheese", 550, 750, [["Mozzarella Cheese", 40], ["Cheese Slice", 1]], 1);
  await panini("Tandoori Chicken", 570, 770, [["Tandoori Chicken", 60], ["Mozzarella Cheese", 25], ["Onion", 10]], 2);
  await panini("Spicy Chicken", 550, 750, [["Spicy Chicken", 60], ["Mozzarella Cheese", 25]], 3);
  await panini("Roast Beef", 590, 790, [["Beef", 60], ["Mozzarella Cheese", 25]], 4);
  await panini("Mix Meat", 620, 820, [["Tandoori Chicken", 30], ["Beef", 30], ["Pepperoni (beef)", 15], ["Mozzarella Cheese", 25]], 5);
  await db.addon.create({ data: { name: "Cheese Slice", price: 200, categoryId: cPanini.id, ingredientId: ing["Cheese Slice"], quantity: 1 } });

  const juice = async (name: string, color: string, price: number, fruit: string, grams: number, sortOrder: number) =>
    item(cJuice.id, `${name} Juice`, "Fresh fruit, blended to order", `juice:${color}`, [{ name: "Glass", price, recipe: [[fruit, grams], ["Sugar Syrup", 20], ["Juice Cup + Lid + Straw", 1]] }], sortOrder);
  await juice("Watermelon", "#F25C54", 450, "Watermelon", 350, 1);
  await juice("Pineapple", "#F7C548", 490, "Pineapple", 300, 2);
  await juice("Mango", "#FFA62B", 590, "Mango", 250, 3);
  await juice("Papaya", "#FF8C42", 450, "Papaya", 300, 4);
  await juice("Avocado", "#A7C957", 650, "Avocado", 200, 5);
  await juice("Lime", "#C5E063", 350, "Lime", 60, 6);

  const mojito = async (name: string, color: string, price: number, extra: [string, number][], sortOrder: number) =>
    item(cMojito.id, `${name} Mojito`, "Virgin mojito — mint, lime, soda, crushed ice", `mojito:${color}`, [
      { name: "Glass", price, recipe: [["Mint Leaves", 8], ["Lime", 30], ["Sugar Syrup", 30], ["Soda Water", 250], ["Juice Cup + Lid + Straw", 1], ...extra] },
    ], sortOrder, sortOrder === 1 ? ["bestseller"] : []);
  await mojito("Classic Mint", "#B8E986", 590, [], 1);
  await mojito("Passion Fruit", "#F9C80E", 650, [["Passion Fruit", 60]], 2);
  await mojito("Strawberry", "#FF5D73", 690, [["Strawberry", 60]], 3);
  await mojito("Watermelon", "#FF6B6B", 650, [["Watermelon", 120]], 4);
  await mojito("Blue Lagoon", "#3AB0FF", 690, [["Blue Curacao Syrup (non-alc)", 25]], 5);

  await item(cDrinks.id, "Water Bottle", "500ml", "water", [{ name: "500ml", price: 100, recipe: [["Water Bottle 500ml", 1]] }], 1);

  // ───────── Delivery zones (free around Dehiwala) ─────────
  const zones: [string, number, number][] = [
    ["Dehiwala", 0, 30], ["Kalubowila", 0, 30], ["Mount Lavinia", 200, 40], ["Wellawatte", 250, 40], ["Kohuwala", 250, 40],
    ["Attidiya", 250, 45], ["Nugegoda", 350, 50], ["Ratmalana", 350, 50], ["Bambalapitiya", 400, 55],
  ];
  for (const [i, [name, fee, eta]] of zones.entries()) await db.deliveryZone.create({ data: { name, fee, etaMinutes: eta, sortOrder: i } });

  // ───────── Tables (QR) ─────────
  for (let i = 1; i <= 6; i++) await db.diningTable.create({ data: { label: `T${i}`, token: randomBytes(6).toString("hex"), seats: i <= 4 ? 4 : 2 } });

  // ───────── Staff (CHANGE THESE PINS) ─────────
  const staff: [string, "OWNER" | "MANAGER" | "CASHIER" | "KITCHEN" | "RIDER", string][] = [
    ["Owner", "OWNER", "1234"], ["Cashier", "CASHIER", "1111"], ["Kitchen", "KITCHEN", "2222"], ["Rider", "RIDER", "3333"],
  ];
  for (const [name, role, pin] of staff) await db.staff.create({ data: { name, role, pinHash: await bcrypt.hash(pin, 10) } });

  // ───────── Promos ─────────
  await db.promo.create({ data: { code: "WELCOME10", description: "10% off your first online order", type: "PERCENT", value: 10, minOrder: 1500, maxDiscount: 500, webOnly: true } });

  // ───────── Settings ─────────
  await db.setting.create({ data: { key: "loyalty", value: { enabled: true, stampsRequired: 10, rewardSizeId: s1.id } } });
  await db.setting.create({
    data: { key: "orders", value: { acceptingOnline: true, autoAcceptWeb: false, bagIngredientId: ing["Carry Bag"], bagsPerOrder: 1, platformCommission: { UBER: 30, PICKME: 25 }, ownerAlertPhone: "", prepMinutes: 20, freeDeliveryNote: "Free delivery around Dehiwala" } },
  });

  console.log("Seeded Hungry Bar ✓");

  if (process.env.SEED_DEMO === "1") await seedDemo();
}

async function seedDemo() {
  const { createOrder, setOrderStatus } = await import("../src/lib/orders");
  const { loadCatalog } = await import("../src/lib/catalog");
  const cat = await loadCatalog();
  const owner = await db.staff.findFirstOrThrow({ where: { role: "OWNER" } });
  const zones = await db.deliveryZone.findMany();
  const names = ["Ayesha", "Rizwan", "Nimal", "Fathima", "Kasun", "Shazna", "Dilan", "Imran", "Sachini", "Hafeez"];
  const customers = [];
  for (const [i, n] of names.entries()) customers.push(await db.customer.create({ data: { name: n, phone: `9477${String(1000000 + i * 7919).slice(0, 7)}` } }));
  const pizzas = cat.products.filter((p) => p.kind === "PIZZA");
  const items = cat.products.filter((p) => p.kind === "ITEM");
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
  const channels = ["POS", "POS", "POS", "WEB", "WEB", "UBER", "PICKME", "QR"] as const;
  for (let day = 20; day >= 0; day--) {
    const n = 8 + Math.floor(rnd() * 10);
    for (let k = 0; k < n; k++) {
      const p = pick(pizzas);
      const v = pick(p.variants);
      const lines = [{ key: "a", kind: "PIZZA" as const, productId: p.id, sizeId: v.sizeId!, crustId: cat.crusts[0].id, toppings: { ...p.toppings }, quantity: 1 }];
      if (rnd() > 0.5) {
        const it = pick(items);
        lines.push({ key: "b", kind: "ITEM" as never, productId: it.id, variantId: it.variants[0].id, quantity: 1 + Math.floor(rnd() * 2) } as never);
      }
      const channel = pick([...channels]);
      const type = channel === "QR" ? "DINE_IN" : channel === "UBER" || channel === "PICKME" ? "DELIVERY" : pick(["TAKEAWAY", "DELIVERY", "DINE_IN"] as const);
      const cust = channel === "WEB" || rnd() > 0.6 ? pick(customers) : null;
      const o = await createOrder({
        channel, type, lines,
        customerId: cust?.id, customerName: cust?.name, customerPhone: cust?.phone,
        zoneId: type === "DELIVERY" ? pick(zones).id : null, address: type === "DELIVERY" ? "Demo address, Dehiwala" : null,
        paymentMethod: channel === "UBER" ? "UBER" : channel === "PICKME" ? "PICKME" : pick(["CASH", "CASH", "CARD"]), paid: true, confirm: true, staffId: owner.id,
      });
      if (day > 0 || k < n - 3) await setOrderStatus(o.id, "COMPLETED", owner.id);
      const when = new Date(Date.now() - day * 86400000 - Math.floor(rnd() * 9) * 3600000);
      await db.order.update({ where: { id: o.id }, data: { createdAt: when, confirmedAt: when, completedAt: day > 0 || k < n - 3 ? new Date(when.getTime() + 30 * 60000) : null } });
      await db.stockMovement.updateMany({ where: { orderId: o.id }, data: { createdAt: when } });
    }
  }
  // Restock via a demo purchase so the inventory looks realistic (leave a couple of items low to show alerts)
  const ings = await db.ingredient.findMany();
  const keepLow = new Set(["Mozzarella Cheese", "Panini Bread (Regular)", "Lime"]);
  const purchase = await db.purchase.create({ data: { invoiceNo: "DEMO-001", note: "Demo restock", date: new Date(Date.now() - 86400000) } });
  let total = 0;
  for (const i of ings) {
    const target = keepLow.has(i.name) ? i.lowStock * 0.6 : i.lowStock * 4;
    const qty = Math.round(target - i.stock);
    if (qty <= 0) continue;
    total += qty * i.costPerUnit;
    const after = await db.ingredient.update({ where: { id: i.id }, data: { stock: { increment: qty } } });
    await db.purchaseItem.create({ data: { purchaseId: purchase.id, ingredientId: i.id, quantity: qty, unitCost: i.costPerUnit, total: qty * i.costPerUnit } });
    await db.stockMovement.create({ data: { ingredientId: i.id, change: qty, balance: after.stock, reason: "PURCHASE", purchaseId: purchase.id, unitCost: i.costPerUnit, createdAt: new Date(Date.now() - 86400000) } });
  }
  await db.purchase.update({ where: { id: purchase.id }, data: { total: Math.round(total) } });
  await db.sectorEntry.create({ data: { sector: "ROYALTY", amount: 15000, note: "Royalty transfer (demo)", date: new Date(Date.now() - 7 * 86400000) } });
  await db.sectorEntry.create({ data: { sector: "CHARITY", amount: 5000, note: "Donation to local school (demo)", date: new Date(Date.now() - 5 * 86400000) } });
  console.log("Demo orders created ✓");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
