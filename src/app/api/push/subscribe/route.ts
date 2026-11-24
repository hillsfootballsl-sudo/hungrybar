import { z } from "zod";
import { handle, ok } from "@/lib/api";
import { getCustomer } from "@/lib/auth";
import { db } from "@/lib/db";

export const POST = handle(async (req: Request) => {
  const b = z
    .object({ subscription: z.object({ endpoint: z.string().url().max(1000), keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(100) }) }), orderId: z.string().max(40).nullish() })
    .parse(await req.json());
  const c = await getCustomer();
  const existing = await db.pushSubscription.findUnique({ where: { endpoint: b.subscription.endpoint } });
  const orderIds = Array.from(new Set([...(existing?.orderIds ?? []), ...(b.orderId ? [b.orderId] : [])])).slice(-20);
  await db.pushSubscription.upsert({
    where: { endpoint: b.subscription.endpoint },
    create: { endpoint: b.subscription.endpoint, p256dh: b.subscription.keys.p256dh, auth: b.subscription.keys.auth, customerId: c?.id ?? null, orderIds },
    update: { p256dh: b.subscription.keys.p256dh, auth: b.subscription.keys.auth, customerId: c?.id ?? existing?.customerId ?? null, orderIds },
  });
  return ok({ ok: true });
});
