import { z } from "zod";
import { fail, handle, ok } from "@/lib/api";
import { staffOrNull, verifyManagerPin } from "@/lib/auth";
import { db } from "@/lib/db";
import { setOrderStatus } from "@/lib/orders";
import { orderInclude, toTicket } from "@/lib/orderView";

export const GET = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const s = await staffOrNull();
  if (!s) return fail("Unauthorized", 401);
  const { id } = await params;
  const o = await db.order.findUnique({ where: { id }, include: orderInclude });
  if (!o) return fail("Not found", 404);
  return ok(toTicket(o));
});

const schema = z.object({
  status: z.enum(["CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "COMPLETED", "CANCELLED"]).optional(),
  reason: z.string().max(200).optional(),
  riderId: z.string().nullish(),
  approvalPin: z.string().max(8).nullish(),
  pay: z.object({ method: z.enum(["CASH", "CARD", "PAYHERE", "UBER", "PICKME"]), tendered: z.number().nullish() }).optional(),
});

export const POST = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const s = await staffOrNull();
  if (!s) return fail("Unauthorized", 401);
  const { id } = await params;
  const body = schema.parse(await req.json());

  if (body.status === "CANCELLED" && !["OWNER", "MANAGER"].includes(s.role)) {
    const o = await db.order.findUnique({ where: { id } });
    // cashiers may only reject web orders that haven't been accepted yet
    if (!o) return fail("Not found", 404);
    if (o.status !== "PENDING") {
      const mgr = await verifyManagerPin(body.approvalPin);
      if (!mgr) return fail("Voiding an accepted order needs a manager PIN", 403);
      body.reason = `${body.reason ?? "Void"} (approved by ${mgr.name})`;
    }
  }
  if (s.role === "KITCHEN" && body.status && !["PREPARING", "READY"].includes(body.status)) return fail("Not allowed", 403);
  if (s.role === "RIDER" && body.status && !["OUT_FOR_DELIVERY", "COMPLETED"].includes(body.status)) return fail("Not allowed", 403);

  if (body.pay) {
    const o = await db.order.findUnique({ where: { id } });
    if (!o) return fail("Not found", 404);
    const shift = await db.shift.findFirst({ where: { closedAt: null }, orderBy: { openedAt: "desc" } });
    await db.order.update({
      where: { id },
      data: {
        paymentMethod: body.pay.method,
        paymentStatus: "PAID",
        paidAt: new Date(),
        amountTendered: body.pay.tendered ?? null,
        changeGiven: body.pay.tendered != null ? Math.max(0, body.pay.tendered - o.total) : null,
        shiftId: o.shiftId ?? shift?.id ?? null,
        staffId: o.staffId ?? s.sid,
      },
    });
  }
  if (body.status) {
    await setOrderStatus(id, body.status, s.sid, { reason: body.reason, riderId: body.status === "OUT_FOR_DELIVERY" ? body.riderId ?? (s.role === "RIDER" ? s.sid : null) : null });
  }
  const o = await db.order.findUnique({ where: { id }, include: orderInclude });
  return ok(o ? toTicket(o) : null);
});
