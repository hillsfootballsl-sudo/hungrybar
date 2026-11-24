import { fail, handle, ok } from "@/lib/api";
import { FRONT, staffOrNull } from "@/lib/auth";
import { db } from "@/lib/db";
import { balance } from "@/lib/points";
import { normalizePhone } from "@/lib/sms";

export const GET = handle(async (req: Request) => {
  const s = await staffOrNull(FRONT);
  if (!s) return fail("Unauthorized", 401);
  const phone = normalizePhone(new URL(req.url).searchParams.get("phone") || "");
  if (!phone) return ok({ customer: null });
  const c = await db.customer.findUnique({ where: { phone } });
  if (!c) return ok({ customer: null, phone });
  const points = await balance(db, c.id);
  return ok({ customer: { id: c.id, name: c.name, phone: c.phone, points, totalOrders: c.totalOrders, addresses: c.addresses, birthday: c.birthday }, phone });
});
