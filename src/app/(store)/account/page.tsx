import type { Metadata } from "next";
import { AccountClient } from "@/components/store/AccountClient";
import { getCustomer } from "@/lib/auth";
import { db } from "@/lib/db";
import { orderCode } from "@/lib/orders";

export const metadata: Metadata = { title: "My account" };
export const dynamic = "force-dynamic";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const sp = await searchParams;
  const c = await getCustomer();
  const orders = c ? await db.order.findMany({ where: { customerId: c.id }, orderBy: { createdAt: "desc" }, take: 40, include: { items: { orderBy: { sortOrder: "asc" } } } }) : [];
  return (
    <AccountClient
      tab={sp.tab ?? "orders"}
      orders={orders.map((o) => ({ id: o.id, code: orderCode(o.number), status: o.status, total: o.total, createdAt: o.createdAt.toISOString(), pointsEarned: o.pointsEarned, items: o.items.map((i) => ({ name: i.name, quantity: i.quantity, sizeName: i.sizeName, line: (i.config as { line?: unknown }).line ?? null })) }))}
    />
  );
}
