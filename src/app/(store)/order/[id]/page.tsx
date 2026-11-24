import { notFound } from "next/navigation";
import { TrackClient } from "@/components/store/TrackClient";
import { db } from "@/lib/db";
import { orderCode } from "@/lib/orders";

export const metadata = { title: "Track order" };

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const o = await db.order.findUnique({ where: { id }, include: { items: { orderBy: { sortOrder: "asc" } }, zone: true, table: true } });
  if (!o) notFound();
  return (
    <TrackClient
      initial={{
        id: o.id, code: orderCode(o.number), status: o.status, type: o.type, paymentStatus: o.paymentStatus, paymentMethod: o.paymentMethod,
        createdAt: o.createdAt.toISOString(), scheduledFor: o.scheduledFor?.toISOString() ?? null, eta: o.zone?.etaMinutes ?? 25, table: o.table?.label ?? null,
        subtotal: o.subtotal, discount: o.discount, deliveryFee: o.deliveryFee, total: o.total, cancelReason: o.cancelReason, pointsEarned: o.pointsEarned, pointsRedeemed: o.pointsRedeemed,
        items: o.items.map((i) => ({ id: i.id, name: i.name, quantity: i.quantity, sizeName: i.sizeName, summary: i.summary, lineTotal: i.lineTotal, kind: i.kind, line: (i.config as { line?: unknown }).line ?? null })),
      }}
    />
  );
}
