import { db } from "./db";

export async function currentShift() {
  return db.shift.findFirst({ where: { closedAt: null }, orderBy: { openedAt: "desc" }, include: { staff: { select: { name: true } }, movements: true } });
}

export async function shiftSummary(shiftId: string) {
  const shift = await db.shift.findUnique({ where: { id: shiftId }, include: { movements: true, staff: { select: { name: true } } } });
  if (!shift) return null;
  const orders = await db.order.findMany({
    where: { shiftId, status: { not: "CANCELLED" }, paymentStatus: "PAID" },
    select: { total: true, paymentMethod: true, discount: true },
  });
  const by: Record<string, { count: number; total: number }> = {};
  let sales = 0;
  let discounts = 0;
  for (const o of orders) {
    by[o.paymentMethod] ??= { count: 0, total: 0 };
    by[o.paymentMethod].count++;
    by[o.paymentMethod].total += o.total;
    sales += o.total;
    discounts += o.discount;
  }
  const cancelled = await db.order.count({ where: { shiftId, status: "CANCELLED" } });
  const cashIn = shift.movements.filter((m) => m.type === "IN").reduce((s, m) => s + m.amount, 0);
  const cashOut = shift.movements.filter((m) => m.type === "OUT").reduce((s, m) => s + m.amount, 0);
  const expectedCash = shift.openingCash + (by.CASH?.total ?? 0) + cashIn - cashOut;
  return { shift, by, sales, discounts, orders: orders.length, cancelled, cashIn, cashOut, expectedCash };
}
