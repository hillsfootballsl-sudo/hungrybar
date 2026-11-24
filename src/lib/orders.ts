// Server-only order engine: quote → create → status transitions, with stock, sector allocation and Hungry Points.
import type { OrderStatus, Prisma } from "@prisma/client";
import { db } from "./db";
import { loadCatalog } from "./catalog";
import { addUsage, costLine, loadCostCtx, type Usage } from "./costing";
import { balance, credit, debit, PointsError } from "./points";
import { pointsFor, priceLine, round2 } from "./pricing";
import { getSetting } from "./settings";
import { sendSms } from "./sms";
import type { CartLine, ChannelT, OrderTypeT, PaymentMethodT, PricedLine } from "./types";

export class OrderError extends Error {}

export const orderCode = (n: number) => String(1000 + n);

export interface QuoteInput {
  channel: ChannelT;
  type: OrderTypeT;
  lines: CartLine[];
  customerId?: string | null;
  zoneId?: string | null;
  promoCode?: string | null;
  manualDiscount?: { amount: number; note?: string } | null;
}

export interface Quote {
  priced: PricedLine[];
  subtotal: number;
  promoDiscount: number;
  promoError?: string;
  promoCode?: string;
  manualDiscount: number;
  discount: number;
  deliveryFee: number;
  total: number;
  discountNote: string;
  pointsNeeded: number;
  pointsBalance: number | null;
  pointsEarnable: number;
}

export async function quoteOrder(input: QuoteInput): Promise<Quote> {
  const catalog = await loadCatalog();
  if (!input.lines?.length) throw new OrderError("Your order is empty");
  const priced = input.lines.map((l) => priceLine(catalog, l));
  const invalid = priced.find((p) => !p.valid);
  if (invalid) throw new OrderError(invalid.error || "An item is unavailable");
  const subtotal = round2(priced.reduce((s, p) => s + p.lineTotal, 0));
  const pointsNeeded = priced.reduce((s, p) => s + p.points, 0);
  const rewards = await getSetting("rewards");

  if (pointsNeeded > 0 && !input.customerId) throw new OrderError("Sign in to use your points");
  if (pointsNeeded > 0 && priced.every((p) => p.points > 0)) throw new OrderError("Add at least one paid item to use a reward");

  let pointsBalance: number | null = null;
  if (input.customerId) {
    pointsBalance = await balance(db, input.customerId);
    if (pointsNeeded > pointsBalance) throw new OrderError(`You need ${pointsNeeded.toLocaleString()} points for these rewards but have ${pointsBalance.toLocaleString()}`);
  }

  // Promo
  let promoDiscount = 0;
  let promoError: string | undefined;
  let promoCode: string | undefined;
  if (input.promoCode?.trim()) {
    const code = input.promoCode.trim().toUpperCase();
    const promo = await db.promo.findUnique({ where: { code } });
    const now = new Date();
    if (!promo || !promo.active) promoError = "That code isn't valid";
    else if (promo.startsAt && promo.startsAt > now) promoError = "That code isn't active yet";
    else if (promo.endsAt && promo.endsAt < now) promoError = "That code has expired";
    else if (promo.maxUses != null && promo.uses >= promo.maxUses) promoError = "That code has been fully used";
    else if (promo.webOnly && !["WEB", "QR"].includes(input.channel)) promoError = "Online-only code";
    else if (subtotal < promo.minOrder) promoError = `Minimum order Rs. ${promo.minOrder} for this code`;
    else {
      promoDiscount = promo.type === "PERCENT" ? (subtotal * promo.value) / 100 : promo.value;
      if (promo.maxDiscount != null) promoDiscount = Math.min(promoDiscount, promo.maxDiscount);
      promoCode = code;
    }
  }

  const manualDiscount = Math.max(0, input.manualDiscount?.amount ?? 0);
  const discount = round2(Math.min(subtotal, promoDiscount + manualDiscount));

  let deliveryFee = 0;
  if (input.type === "DELIVERY" && ["WEB", "QR", "POS"].includes(input.channel)) {
    if (!input.zoneId) throw new OrderError("Choose your delivery area");
    const zone = await db.deliveryZone.findUnique({ where: { id: input.zoneId } });
    if (!zone || !zone.active) throw new OrderError("We don't deliver to that area yet");
    deliveryFee = zone.fee;
  }

  const notes: string[] = [];
  if (promoCode) notes.push(`Promo ${promoCode}`);
  if (manualDiscount) notes.push(input.manualDiscount?.note || "Manual discount");
  const total = round2(subtotal - discount + deliveryFee);
  const earnable = input.channel === "UBER" || input.channel === "PICKME" ? 0 : pointsFor(total - deliveryFee, rewards);

  return {
    priced,
    subtotal,
    promoDiscount: round2(promoDiscount),
    promoError,
    promoCode,
    manualDiscount: round2(manualDiscount),
    discount,
    deliveryFee,
    total,
    discountNote: notes.join(" + "),
    pointsNeeded,
    pointsBalance,
    pointsEarnable: earnable,
  };
}

export interface CreateOrderInput extends QuoteInput {
  customerName?: string | null;
  customerPhone?: string | null;
  address?: string | null;
  landmark?: string | null;
  lat?: number | null;
  lng?: number | null;
  tableId?: string | null;
  scheduledFor?: Date | null;
  paymentMethod: PaymentMethodT;
  paid?: boolean;
  amountTendered?: number | null;
  note?: string | null;
  staffId?: string | null;
  shiftId?: string | null;
  externalRef?: string | null;
  confirm?: boolean; // POS orders are confirmed (and stock deducted) immediately
}

export async function createOrder(input: CreateOrderInput) {
  const quote = await quoteOrder(input);
  if (quote.promoError && input.promoCode) throw new OrderError(quote.promoError);
  const ctx = await loadCostCtx();
  const orderSettings = await getSetting("orders");

  const usage: Usage = {};
  let food = 0,
    pack = 0,
    royalty = 0,
    charity = 0;
  const items = quote.priced.map((p, i) => {
    const c = costLine(ctx, p.line);
    for (const [id, q] of Object.entries(c.usage)) addUsage(usage, id, q);
    food += c.foodCost;
    pack += c.packagingCost;
    royalty += c.royalty;
    charity += c.charity;
    return {
      kind: p.line.kind,
      productId: p.line.productId ?? null,
      variantId: p.line.variantId ?? null,
      name: p.line.rewardId ? `🎁 ${p.name}` : p.name,
      sizeName: p.sizeName ?? null,
      crustName: p.crustName ?? null,
      quantity: Math.max(1, Math.floor(p.line.quantity)),
      unitPrice: p.unitPrice,
      lineTotal: p.lineTotal,
      config: { line: p.line, usage: c.usage, points: p.points } as unknown as Prisma.InputJsonValue,
      summary: p.summary || null,
      note: p.line.note || null,
      foodCost: c.foodCost,
      packagingCost: c.packagingCost,
      royalty: c.royalty,
      charity: c.charity,
      sortOrder: i,
    };
  });

  if (input.type !== "DINE_IN" && orderSettings.bagIngredientId && orderSettings.bagsPerOrder > 0) {
    const bag = ctx.ingredients.get(orderSettings.bagIngredientId);
    if (bag) {
      addUsage(usage, bag.id, orderSettings.bagsPerOrder);
      pack += bag.cost * orderSettings.bagsPerOrder;
    }
  }

  const platformPct = input.channel === "UBER" ? orderSettings.platformCommission.UBER : input.channel === "PICKME" ? orderSettings.platformCommission.PICKME : 0;
  const platformFee = round2((quote.total * platformPct) / 100);
  const profit = round2(quote.total - quote.deliveryFee - food - pack - royalty - charity - platformFee);
  const paid = !!input.paid;
  const confirm = !!input.confirm;

  const order = await db.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        channel: input.channel,
        type: input.type,
        status: confirm ? "CONFIRMED" : "PENDING",
        customerId: input.customerId || null,
        customerName: input.customerName || null,
        customerPhone: input.customerPhone || null,
        address: input.address || null,
        landmark: input.landmark || null,
        lat: input.lat ?? null,
        lng: input.lng ?? null,
        zoneId: input.type === "DELIVERY" ? input.zoneId || null : null,
        tableId: input.tableId || null,
        scheduledFor: input.scheduledFor ?? null,
        externalRef: input.externalRef || null,
        subtotal: quote.subtotal,
        discount: quote.discount,
        discountNote: quote.discountNote || null,
        deliveryFee: quote.deliveryFee,
        total: quote.total,
        promoCode: quote.promoCode ?? null,
        pointsRedeemed: quote.pointsNeeded,
        pointsEarned: quote.pointsEarnable,
        paymentMethod: input.paymentMethod,
        paymentStatus: paid ? "PAID" : "UNPAID",
        paidAt: paid ? new Date() : null,
        amountTendered: input.amountTendered ?? null,
        changeGiven: input.amountTendered != null ? round2(Math.max(0, input.amountTendered - quote.total)) : null,
        foodCost: round2(food),
        packagingCost: round2(pack),
        royalty: round2(royalty),
        charity: round2(charity),
        platformFee,
        profit,
        usage: usage as Prisma.InputJsonValue,
        note: input.note || null,
        staffId: input.staffId || null,
        shiftId: input.shiftId || null,
        confirmedAt: confirm ? new Date() : null,
        items: { create: items },
      },
    });
    if (quote.promoCode) await tx.promo.update({ where: { code: quote.promoCode }, data: { uses: { increment: 1 } } });
    if (quote.pointsNeeded > 0 && input.customerId) {
      try {
        await debit(tx, input.customerId, quote.pointsNeeded, "REDEEM", { note: `Rewards on order #${orderCode(created.number)}`, orderId: created.id });
      } catch (e) {
        if (e instanceof PointsError) throw new OrderError(e.message);
        throw e;
      }
    }
    if (confirm) await deductStock(tx, created.id, input.staffId ?? null);
    return created;
  });

  if (!confirm) {
    await db.notification.create({
      data: {
        type: "NEW_ORDER",
        title: `New ${input.channel === "QR" ? "table" : "online"} order #${orderCode(order.number)}`,
        body: `${input.customerName ?? "Guest"} · Rs. ${quote.total}`,
        link: `/admin/orders/${order.id}`,
      },
    });
    if (orderSettings.autoAcceptWeb && input.paymentMethod !== "PAYHERE") await setOrderStatus(order.id, "CONFIRMED", null);
  }
  await checkLowStock();
  return order;
}

type Tx = Prisma.TransactionClient;

export async function deductStock(tx: Tx, orderId: string, staffId: string | null) {
  const o = await tx.order.findUnique({ where: { id: orderId } });
  if (!o || o.stockDeducted) return;
  for (const [ingredientId, qty] of Object.entries((o.usage ?? {}) as Usage)) {
    if (!qty) continue;
    const ing = await tx.ingredient.update({ where: { id: ingredientId }, data: { stock: { decrement: qty } } }).catch(() => null);
    if (!ing) continue;
    await tx.stockMovement.create({ data: { ingredientId, change: -qty, balance: ing.stock, reason: "SALE", orderId, staffId, unitCost: ing.costPerUnit } });
  }
  await tx.order.update({ where: { id: orderId }, data: { stockDeducted: true } });
}

/** Create a LOW_STOCK notification (and owner SMS) for ingredients at/below their alert level, once per dip. */
export async function checkLowStock() {
  const low = await db.$queryRaw<{ id: string; name: string; stock: number; lowStock: number; unit: string }[]>`
    SELECT id, name, stock, "lowStock", unit FROM "Ingredient" WHERE active = true AND "lowStock" > 0 AND stock <= "lowStock"`;
  if (!low.length) return;
  const since = new Date(Date.now() - 12 * 3600 * 1000);
  const recent = await db.notification.findMany({ where: { type: "LOW_STOCK", createdAt: { gte: since } }, select: { link: true } });
  const already = new Set(recent.map((r) => r.link));
  const fresh = low.filter((i) => !already.has(`/admin/inventory#${i.id}`));
  if (!fresh.length) return;
  await db.notification.createMany({
    data: fresh.map((i) => ({ type: "LOW_STOCK", title: `Low stock: ${i.name}`, body: `${Math.max(0, Math.round(i.stock))} ${i.unit} left (alert at ${i.lowStock} ${i.unit})`, link: `/admin/inventory#${i.id}` })),
  });
  const s = await getSetting("orders");
  if (s.ownerAlertPhone) void sendSms(s.ownerAlertPhone, `Hungry Bar low stock: ${fresh.map((i) => `${i.name} ${Math.max(0, Math.round(i.stock))}${i.unit}`).join(", ")}`);
}

const FLOW: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "READY", "COMPLETED", "CANCELLED"],
  PREPARING: ["READY", "COMPLETED", "CANCELLED"],
  READY: ["OUT_FOR_DELIVERY", "COMPLETED", "CANCELLED"],
  OUT_FOR_DELIVERY: ["COMPLETED", "CANCELLED"],
  COMPLETED: ["CANCELLED"],
  CANCELLED: [],
};

export async function setOrderStatus(orderId: string, to: OrderStatus, staffId: string | null, extra: { reason?: string; riderId?: string | null; markPaid?: boolean } = {}) {
  const rewards = await getSetting("rewards");
  const result = await db.$transaction(async (tx) => {
    const o = await tx.order.findUnique({ where: { id: orderId } });
    if (!o) throw new OrderError("Order not found");
    if (o.status === to) return o;
    if (!FLOW[o.status].includes(to)) throw new OrderError(`Can't move an order from ${o.status} to ${to}`);
    const now = new Date();
    const data: Prisma.OrderUpdateInput = { status: to };

    if (to !== "CANCELLED" && !o.stockDeducted) await deductStock(tx, o.id, staffId);
    if (to !== "CANCELLED" && !o.confirmedAt) data.confirmedAt = now;
    if (to === "READY") data.readyAt = now;
    if (to === "OUT_FOR_DELIVERY" && extra.riderId) data.rider = { connect: { id: extra.riderId } };
    if (to === "COMPLETED") {
      data.completedAt = now;
      if (o.paymentStatus === "UNPAID" && (extra.markPaid || ["CASH", "CARD", "UBER", "PICKME"].includes(o.paymentMethod))) {
        data.paymentStatus = "PAID";
        data.paidAt = now;
      }
      if (o.customerId && !o.pointsAwarded) {
        const c = await tx.customer.findUniqueOrThrow({ where: { id: o.customerId } });
        await tx.customer.update({ where: { id: o.customerId }, data: { totalOrders: { increment: 1 }, totalSpent: { increment: o.total } } });
        if (rewards.enabled && o.pointsEarned > 0) await credit(tx, o.customerId, o.pointsEarned, "EARN", { note: `Order #${orderCode(o.number)}`, orderId: o.id });
        if (rewards.enabled && c.totalOrders === 0 && rewards.welcomeBonus > 0) await credit(tx, o.customerId, rewards.welcomeBonus, "WELCOME", { note: "Welcome bonus for your first order", orderId: o.id });
        data.pointsAwarded = true;
      }
    }
    if (to === "CANCELLED") {
      data.cancelledAt = now;
      data.cancelReason = extra.reason || null;
      if (o.stockDeducted) {
        for (const [ingredientId, qty] of Object.entries((o.usage ?? {}) as Usage)) {
          const ing = await tx.ingredient.update({ where: { id: ingredientId }, data: { stock: { increment: qty } } }).catch(() => null);
          if (ing) await tx.stockMovement.create({ data: { ingredientId, change: qty, balance: ing.stock, reason: "VOID", orderId: o.id, staffId } });
        }
        data.stockDeducted = false;
      }
      if (o.promoCode) await tx.promo.update({ where: { code: o.promoCode }, data: { uses: { decrement: 1 } } }).catch(() => null);
      if (o.customerId) {
        if (o.pointsRedeemed > 0) await credit(tx, o.customerId, o.pointsRedeemed, "REVERSAL", { note: `Refund for cancelled order #${orderCode(o.number)}`, orderId: o.id });
        if (o.pointsAwarded) {
          const earned = await tx.pointsTxn.aggregate({ where: { orderId: o.id, reason: { in: ["EARN", "WELCOME"] } }, _sum: { change: true } });
          const take = earned._sum.change ?? 0;
          if (take > 0) await debit(tx, o.customerId, take, "REVERSAL", { note: `Points removed: order #${orderCode(o.number)} cancelled`, orderId: o.id, partial: true });
          await tx.customer.update({ where: { id: o.customerId }, data: { totalOrders: { decrement: 1 }, totalSpent: { decrement: o.total } } });
        }
      }
      if (o.paymentStatus === "PAID") data.paymentStatus = "REFUNDED";
    }
    return tx.order.update({ where: { id: orderId }, data });
  });
  if (to === "CONFIRMED" || to === "PREPARING") await checkLowStock();
  // fire-and-forget push to the customer's phone
  void import("./push").then((m) => m.notifyOrder(orderId)).catch(() => {});
  return result;
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Waiting for confirmation",
  CONFIRMED: "Order confirmed",
  PREPARING: "In the oven",
  READY: "Ready",
  OUT_FOR_DELIVERY: "On the way",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};
