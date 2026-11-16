import type { Metadata } from "next";
import { getCustomer } from "@/lib/auth";
import { db } from "@/lib/db";
import { orderCode } from "@/lib/orders";
import { getSetting } from "@/lib/settings";
import { AccountClient } from "./AccountClient";

export const metadata: Metadata = { title: "My orders & rewards" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const c = await getCustomer();
  const loyalty = await getSetting("loyalty");
  const orders = c
    ? await db.order.findMany({ where: { customerId: c.id }, orderBy: { createdAt: "desc" }, take: 30, include: { items: { orderBy: { sortOrder: "asc" } } } })
    : [];
  return (
    <AccountClient
      customer={c ? { name: c.name, phone: c.phone, stamps: c.stamps, rewardsUsed: c.rewardsUsed, totalOrders: c.totalOrders } : null}
      stampsRequired={loyalty.stampsRequired}
      orders={orders.map((o) => ({
        id: o.id,
        code: orderCode(o.number),
        status: o.status,
        total: o.total,
        createdAt: o.createdAt.toISOString(),
        items: o.items.map((i) => ({ name: i.name, quantity: i.quantity, sizeName: i.sizeName, line: (i.config as { line?: unknown }).line ?? null })),
      }))}
    />
  );
}
