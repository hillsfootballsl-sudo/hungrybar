// Server-only order engine: quote → create → status transitions, with stock + sector allocation + loyalty.
import type { OrderStatus, Prisma } from "@prisma/client";
import { db } from "./db";
import { loadCatalog } from "./catalog";
import { addUsage, costLine, loadCostCtx, type Usage } from "./costing";
import { loyaltyRewardValue, priceLine, rewardAvailable, round2 } from "./pricing";
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
  redeemLoyalty?: boolean;
  manualDiscount?: { amount: number; note?: string } | null;
}

export interface Quote {
  priced: PricedLine[];
  subtotal: number;
  promoDiscount: number;
  promoError?: string;
  promoCode?: string;
  loyaltyDiscount: number;
  loyaltyAvailable: boolean;
  manualDiscount: number;
  discount: number;
  deliveryFee: number;
  total: number;
  discountNote: string;
}

export async function quoteOrder(input: QuoteInput): Promise<Quote> {
  const catalog = await loadCatalog();
  if (!input.lines?.length) throw new OrderError("Your order is empty");
  const priced = input.lines.map((l) => priceLine(catalog, l));
  const invalid = priced.find((p) => !p.valid);
  if (invalid) throw new OrderError(invalid.error || "An item is unavailable");
  const subtotal = round2(priced.reduce((s, p) => s + p.lineTotal, 0));

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

  // Loyalty
  const loyalty = await getSetting("loyalty");
  let loyaltyAvailable = false;
  let loyaltyDiscount = 0;
  if (input.customerId && loyalty.enabled) {
    const c = await db.customer.findUnique({ where: { id: input.customerId } });
    if (c && rewardAvailable(c.stamps, loyalty)) {
      loyaltyAvailable = true;
      if (input.redeemLoyalty) loyaltyDiscount = loyaltyRewardValue(catalog, priced, loyalty);
    }
  }

  const manualDiscount = Math.max(0, input.manualDiscount?.amount ?? 0);
  const discount = round2(Math.min(subtotal, promoDiscount + loyaltyDiscount + manualDiscount));

  let deliveryFee = 0;
  if (input.type === "DELIVERY" && ["WEB", "QR", "POS"].includes(input.channel)) {
    if (!input.zoneId) throw new OrderError("Choose your delivery area");
    const zone = await db.deliveryZone.findUnique({ where: { id: input.zoneId } });
    if (!zone || !zone.active) throw new OrderError("We don't deliver to that area yet");
    deliveryFee = zone.fee;
  }

  const notes: string[] = [];
  if (promoCode) notes.push(`Promo ${promoCode}`);
  if (loyaltyDiscount) notes.push("Loyalty free pizza");
  if (manualDiscount) notes.push(input.manualDiscount?.note || "Manual discount");

  return {
    priced,
    subtotal,
    promoDiscount: round2(promoDiscount),
    promoError,
    promoCode,
    loyaltyDiscount: round2(loyaltyDiscount),
    loyaltyAvailable,
    manualDiscount: round2(manualDiscount),
    discount,
    deliveryFee,
    total: round2(subtotal - discount + deliveryFee),
    discountNote: notes.join(" + "),
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
      name: p.name,
      sizeName: p.sizeName ?? null,
      crustName: p.crustName ?? null,
      quantity: Math.max(1, Math.floor(p.line.quantity)),
      unitPrice: p.unitPrice,
      lineTotal: p.lineTotal,
      config: { line: p.line, usage: c.usage } as unknown as Prisma.InputJsonValue,
      summary: p.summary || null,
      note: p.line.note || null,
      foodCost: c.foodCost,
      packagingCost: c.packagingCost,
      royalty: c.royalty,
      charity: c.charity,
      sortOrder: i,
    };
  });

  // Carry bags for anything leaving the shop
  if (input.type !== "DINE_IN" && orderSettings.bagIngredientId && orderSettings.bagsPerOrder > 0) {
    const bag = ctx.ingredients.get(orderSettings.bagIngredientId);
    if (bag) {
      addUsage(usage, bag.id, orderSettings.bagsPerOrder);
      pack += bag.cost * orderSettings.bagsPerOrder;
    }
  }

  const platformPct =
    input.channel === "UBER" ? orderSettings.platformCommission.UBER : input.channel === "PICKME" ? orderSettings.platformCommission.PICKME : 0;
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
        loyaltyRedeemed: quote.loyaltyDiscount > 0,
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
    if (quote.loyaltyDiscount > 0 && input.customerId) {
      await tx.customer.update({ where: { id: input.customerId }, data: { stamps: 0, rewardsUsed: { increment: 1 } } });
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
    if (orderSettings.autoAcceptWeb && input.paymentMethod !== "PAYHERE") {
      await setOrderStatus(order.id, "CONFIRMED", null);
    }
  }
  await checkLowStock();
  return order;
}

type Tx = Prisma.TransactionClient;

async function moveStock(tx: Tx, orderId: string, usage: Usage, sign: 1 | -1, reason: "SALE" | "VOID", staffId: string | null) {
  for (const [ingredientId, qty] of Object.entries(usage)) {
    if (!qty) continue;
    const ing = await tx.ingredient.update({
      where: { id: ingredientId },
      data: { stock: { increment: sign * qty } },
    }).catch(() => null);
    if (!ing) continue;
    await tx.stockMovement.create({
      data: { ingredientId, change: sign * qty, balance: ing.stock, reason, orderId, staffId, unitCost: ing.costPerUnit },
    });
  }
}

export async function deductStock(tx: Tx, orderId: string, staffId: string | null) {
  const o = await tx.order.findUnique({ where: { id: orderId } });
  if (!o || o.stockDeducted) return;
  await moveStock(tx, orderId, (o.usage ?? {}) as Usage, -1, "SALE", staffId);
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
    data: fresh.map((i) => ({
      type: "LOW_STOCK",
      title: `Low stock: ${i.name}`,
      body: `${Math.max(0, Math.round(i.stock))} ${i.unit} left (alert at ${i.lowStock} ${i.unit})`,
      link: `/admin/inventory#${i.id}`,
    })),
  });
  const s = await getSetting("orders");
  if (s.ownerAlertPhone) {
    void sendSms(
      s.ownerAlertPhone,
      `Hungry Bar low stock: ${fresh.map((i) => `${i.name} ${Math.max(0, Math.round(i.stock))}${i.unit}`).join(", ")}`,
    );
  }
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

export async function setOrderStatus(
  orderId: string,
  to: OrderStatus,
  staffId: string | null,
  extra: { reason?: string; riderId?: string | null; markPaid?: boolean } = {},
) {
  const result = await db.$transaction(async (tx) => {
    const o = await tx.order.findUnique({ where: { id: orderId } });
    if (!o) throw new OrderError("Order not found");
    if (o.status === to) return o;
    if (!FLOW[o.status].includes(to)) throw new OrderError(`Can't move an order from ${o.status} to ${to}`);
    const now = new Date();
    const data: Prisma.OrderUpdateInput = { status: to };

    if (to !== "CANCELLED" && !o.stockDeducted) await deductStock(tx, o.id, staffId);
    if (to === "CONFIRMED" || (!o.confirmedAt && to !== "CANCELLED")) data.confirmedAt = o.confirmedAt ?? now;
    if (to === "READY") data.readyAt = now;
    if (to === "OUT_FOR_DELIVERY" && extra.riderId) data.rider = { connect: { id: extra.riderId } };
    if (to === "COMPLETED") {
      data.completedAt = now;
      if (o.paymentStatus === "UNPAID" && (extra.markPaid || ["CASH", "CARD", "UBER", "PICKME"].includes(o.paymentMethod))) {
        data.paymentStatus = "PAID";
        data.paidAt = now;
      }
      if (o.customerId && !o.stampAwarded) {
        await tx.customer.update({
          where: { id: o.customerId },
          data: {
            totalOrders: { increment: 1 },
            totalSpent: { increment: o.total },
            ...(o.loyaltyRedeemed ? {} : { stamps: { increment: 1 } }),
          },
        });
        data.stampAwarded = true;
      }
    }
    if (to === "CANCELLED") {
      data.cancelledAt = now;
      data.cancelReason = extra.reason || null;
      if (o.stockDeducted) {
        const usage = (o.usage ?? {}) as Usage;
        for (const [ingredientId, qty] of Object.entries(usage)) {
          const ing = await tx.ingredient.update({ where: { id: ingredientId }, data: { stock: { increment: qty } } }).catch(() => null);
          if (ing) await tx.stockMovement.create({ data: { ingredientId, change: qty, balance: ing.stock, reason: "VOID", orderId: o.id, staffId } });
        }
        data.stockDeducted = false;
      }
      if (o.promoCode) await tx.promo.update({ where: { code: o.promoCode }, data: { uses: { decrement: 1 } } }).catch(() => null);
      if (o.customerId) {
        const loyalty = await getSetting("loyalty");
        if (o.loyaltyRedeemed) {
          await tx.customer.update({ where: { id: o.customerId }, data: { stamps: Math.max(0, loyalty.stampsRequired - 1), rewardsUsed: { decrement: 1 } } });
        } else if (o.stampAwarded) {
          await tx.customer.update({ where: { id: o.customerId }, data: { stamps: { decrement: 1 }, totalOrders: { decrement: 1 }, totalSpent: { decrement: o.total } } });
        }
      }
      if (o.paymentStatus === "PAID") data.paymentStatus = "REFUNDED";
    }
    return tx.order.update({ where: { id: orderId }, data });
  });
  if (to === "CONFIRMED" || to === "PREPARING") await checkLowStock();
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
