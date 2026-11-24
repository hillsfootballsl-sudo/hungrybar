import { z } from "zod";
import { fail, handle, ok } from "@/lib/api";
import { FRONT, staffOrNull, verifyManagerPin } from "@/lib/auth";
import { db } from "@/lib/db";
import { createOrder } from "@/lib/orders";
import { orderInclude, toTicket } from "@/lib/orderView";
import { linesSchema } from "@/lib/schemas";
import { currentShift } from "@/lib/shift";
import { normalizePhone } from "@/lib/sms";

const schema = z.object({
  lines: linesSchema,
  channel: z.enum(["POS", "UBER", "PICKME"]),
  type: z.enum(["DELIVERY", "TAKEAWAY", "DINE_IN"]),
  customerPhone: z.string().max(20).nullish(),
  customerName: z.string().max(60).nullish(),
  zoneId: z.string().nullish(),
  address: z.string().max(300).nullish(),
  tableId: z.string().nullish(),
  promoCode: z.string().max(30).nullish(),
  manualDiscount: z.object({ amount: z.number().min(0), note: z.string().max(80).optional() }).nullish(),
  approvalPin: z.string().max(8).nullish(),
  payment: z.object({ method: z.enum(["CASH", "CARD", "UBER", "PICKME"]), tendered: z.number().min(0).nullish() }).nullish(),
  externalRef: z.string().max(40).nullish(),
  note: z.string().max(300).nullish(),
});

export const POST = handle(async (req: Request) => {
  const s = await staffOrNull(FRONT);
  if (!s) return fail("Unauthorized", 401);
  const body = schema.parse(await req.json());
  const shift = await currentShift();
  if (!shift) return fail("Open a shift first (cash drawer)");

  if (body.manualDiscount?.amount && !["OWNER", "MANAGER"].includes(s.role)) {
    const mgr = await verifyManagerPin(body.approvalPin);
    if (!mgr) return fail("Discount needs a manager PIN", 403);
    body.manualDiscount.note = `${body.manualDiscount.note || "Discount"} (approved by ${mgr.name})`;
  }

  let customerId: string | null = null;
  let phone: string | null = null;
  if (body.customerPhone) {
    phone = normalizePhone(body.customerPhone);
    if (!phone) return fail("Invalid customer phone number");
    const c = await db.customer.upsert({ where: { phone }, create: { phone, name: body.customerName || null }, update: body.customerName ? { name: body.customerName } : {} });
    customerId = c.id;
  }
  const platform = body.channel === "UBER" || body.channel === "PICKME";
  const order = await createOrder({
    channel: body.channel,
    type: platform ? "DELIVERY" : body.type,
    lines: body.lines,
    customerId,
    customerName: body.customerName ?? null,
    customerPhone: phone,
    zoneId: body.zoneId ?? null,
    address: body.address ?? null,
    tableId: body.type === "DINE_IN" ? body.tableId ?? null : null,
    promoCode: body.promoCode ?? null,
    manualDiscount: body.manualDiscount ?? null,
    paymentMethod: platform ? (body.channel as "UBER" | "PICKME") : body.payment?.method ?? "CASH",
    paid: platform || !!body.payment,
    amountTendered: body.payment?.method === "CASH" ? body.payment.tendered ?? null : null,
    externalRef: body.externalRef ?? null,
    note: body.note ?? null,
    staffId: s.sid,
    shiftId: shift.id,
    confirm: true,
  });
  const full = await db.order.findUniqueOrThrow({ where: { id: order.id }, include: orderInclude });
  return ok(toTicket(full));
});
