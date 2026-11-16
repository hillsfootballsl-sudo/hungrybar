import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { orderCode } from "@/lib/orders";
import { getSetting } from "@/lib/settings";
import { TrackClient } from "./TrackClient";

export const dynamic = "force-dynamic";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const o = await db.order.findUnique({ where: { id }, include: { items: { orderBy: { sortOrder: "asc" } }, zone: true, table: true, customer: { select: { stamps: true } } } });
  if (!o) notFound();
  const [shop, loyalty] = await Promise.all([getSetting("shop"), getSetting("loyalty")]);
  return (
    <TrackClient
      initial={{
        id: o.id,
        code: orderCode(o.number),
        status: o.status,
        type: o.type,
        paymentStatus: o.paymentStatus,
        paymentMethod: o.paymentMethod,
        createdAt: o.createdAt.toISOString(),
        scheduledFor: o.scheduledFor?.toISOString() ?? null,
        eta: o.zone?.etaMinutes ?? 25,
        table: o.table?.label ?? null,
        subtotal: o.subtotal,
        discount: o.discount,
        deliveryFee: o.deliveryFee,
        total: o.total,
        cancelReason: o.cancelReason,
        stamps: o.customer?.stamps ?? null,
        items: o.items.map((i) => ({ id: i.id, name: i.name, quantity: i.quantity, sizeName: i.sizeName, summary: i.summary, lineTotal: i.lineTotal, kind: i.kind, line: (i.config as { line?: unknown }).line ?? null })),
      }}
      shop={{ phone: shop.phone, whatsapp: shop.whatsapp }}
      stampsRequired={loyalty.stampsRequired}
    />
  );
}
