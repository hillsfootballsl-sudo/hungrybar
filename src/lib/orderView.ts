import type { Prisma } from "@prisma/client";

export const orderInclude = {
  items: { orderBy: { sortOrder: "asc" } },
  zone: { select: { name: true } },
  table: { select: { label: true } },
  staff: { select: { name: true } },
  rider: { select: { id: true, name: true } },
  customer: { select: { stamps: true, name: true } },
} satisfies Prisma.OrderInclude;

export type OrderFull = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

/** Lightweight shape used by POS, kitchen, rider screens and printers */
export function toTicket(o: OrderFull) {
  return {
    id: o.id,
    number: o.number,
    channel: o.channel,
    type: o.type,
    status: o.status,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    address: o.address,
    landmark: o.landmark,
    lat: o.lat,
    lng: o.lng,
    zone: o.zone?.name ?? null,
    table: o.table?.label ?? null,
    scheduledFor: o.scheduledFor?.toISOString() ?? null,
    externalRef: o.externalRef,
    subtotal: o.subtotal,
    discount: o.discount,
    discountNote: o.discountNote,
    deliveryFee: o.deliveryFee,
    total: o.total,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    amountTendered: o.amountTendered,
    changeGiven: o.changeGiven,
    note: o.note,
    staff: o.staff?.name ?? null,
    rider: o.rider?.name ?? null,
    riderId: o.rider?.id ?? null,
    stamps: o.customer?.stamps ?? null,
    loyaltyRedeemed: o.loyaltyRedeemed,
    createdAt: o.createdAt.toISOString(),
    confirmedAt: o.confirmedAt?.toISOString() ?? null,
    readyAt: o.readyAt?.toISOString() ?? null,
    items: o.items.map((i) => ({
      id: i.id,
      name: i.name,
      kind: i.kind,
      sizeName: i.sizeName,
      crustName: i.crustName,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      lineTotal: i.lineTotal,
      summary: i.summary,
      note: i.note,
      line: (i.config as { line?: unknown })?.line ?? null,
    })),
  };
}
export type Ticket = ReturnType<typeof toTicket>;
