import { z } from "zod";
import { fail, handle, ok } from "@/lib/api";
import { FRONT, staffOrNull } from "@/lib/auth";
import { db } from "@/lib/db";
import { quoteOrder } from "@/lib/orders";
import { linesSchema } from "@/lib/schemas";
import { normalizePhone } from "@/lib/sms";

export const POST = handle(async (req: Request) => {
  const s = await staffOrNull(FRONT);
  if (!s) return fail("Unauthorized", 401);
  const b = z
    .object({
      lines: linesSchema,
      channel: z.enum(["POS", "UBER", "PICKME"]),
      type: z.enum(["DELIVERY", "TAKEAWAY", "DINE_IN"]),
      zoneId: z.string().nullish(),
      customerPhone: z.string().nullish(),
      promoCode: z.string().max(30).nullish(),
      redeemLoyalty: z.boolean().optional(),
      manualDiscount: z.number().min(0).nullish(),
    })
    .parse(await req.json());
  const phone = b.customerPhone ? normalizePhone(b.customerPhone) : null;
  const c = phone ? await db.customer.findUnique({ where: { phone } }) : null;
  const platform = b.channel !== "POS";
  const q = await quoteOrder({
    channel: b.channel,
    type: platform ? "DELIVERY" : b.type,
    lines: b.lines,
    zoneId: b.type === "DELIVERY" && !platform ? b.zoneId || null : null,
    customerId: c?.id,
    promoCode: b.promoCode,
    redeemLoyalty: b.redeemLoyalty,
    manualDiscount: b.manualDiscount ? { amount: b.manualDiscount } : null,
  }).catch((e) => ({ error: (e as Error).message }));
  if ("error" in q) return ok({ error: q.error });
  return ok({ subtotal: q.subtotal, promoDiscount: q.promoDiscount, promoError: q.promoError, loyaltyAvailable: q.loyaltyAvailable, loyaltyDiscount: q.loyaltyDiscount, manualDiscount: q.manualDiscount, discount: q.discount, deliveryFee: q.deliveryFee, total: q.total });
});
