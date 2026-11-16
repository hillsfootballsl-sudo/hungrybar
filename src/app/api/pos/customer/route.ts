import { fail, handle, ok } from "@/lib/api";
import { FRONT, staffOrNull } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { normalizePhone } from "@/lib/sms";

export const GET = handle(async (req: Request) => {
  const s = await staffOrNull(FRONT);
  if (!s) return fail("Unauthorized", 401);
  const phone = normalizePhone(new URL(req.url).searchParams.get("phone") || "");
  if (!phone) return ok({ customer: null });
  const c = await db.customer.findUnique({ where: { phone } });
  const loyalty = await getSetting("loyalty");
  return ok({ customer: c ? { id: c.id, name: c.name, phone: c.phone, stamps: c.stamps, totalOrders: c.totalOrders, addresses: c.addresses } : null, phone, loyalty });
});
