import { z } from "zod";
import { handle, ok } from "@/lib/api";
import { getCustomer } from "@/lib/auth";
import { quoteOrder } from "@/lib/orders";
import { linesSchema } from "@/lib/schemas";

export const POST = handle(async (req: Request) => {
  const body = z.object({ lines: linesSchema, type: z.enum(["DELIVERY", "TAKEAWAY", "DINE_IN"]), zoneId: z.string().nullish(), promoCode: z.string().max(30).nullish() }).parse(await req.json());
  const customer = await getCustomer();
  const q = await quoteOrder({ channel: "WEB", type: body.type, lines: body.lines, zoneId: body.type === "DELIVERY" ? body.zoneId || null : null, promoCode: body.promoCode, customerId: customer?.id });
  return ok({
    subtotal: q.subtotal,
    promoDiscount: q.promoDiscount,
    promoError: q.promoError,
    discount: q.discount,
    deliveryFee: q.deliveryFee,
    total: q.total,
    pointsNeeded: q.pointsNeeded,
    pointsBalance: q.pointsBalance,
    pointsEarnable: q.pointsEarnable,
  });
});
