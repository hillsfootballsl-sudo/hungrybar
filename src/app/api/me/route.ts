import { cookies } from "next/headers";
import { z } from "zod";
import { fail, handle, ok } from "@/lib/api";
import { getCustomer } from "@/lib/auth";
import { db } from "@/lib/db";
import { CUSTOMER_COOKIE } from "@/lib/jwt";
import { balance, celebrationBonuses } from "@/lib/points";
import { getSetting } from "@/lib/settings";

export const GET = handle(async () => {
  const c = await getCustomer();
  const rewards = await getSetting("rewards");
  if (!c) return ok({ customer: null, rewards });
  await celebrationBonuses(c.id, rewards).catch(() => 0);
  const points = await balance(db, c.id);
  const [history, expiring] = await Promise.all([
    db.pointsTxn.findMany({ where: { customerId: c.id }, orderBy: { createdAt: "desc" }, take: 40, select: { id: true, change: true, reason: true, note: true, createdAt: true, expiresAt: true } }),
    db.pointsTxn.findFirst({ where: { customerId: c.id, remaining: { gt: 0 }, expiresAt: { gt: new Date() } }, orderBy: { expiresAt: "asc" }, select: { remaining: true, expiresAt: true } }),
  ]);
  return ok({
    customer: { id: c.id, phone: c.phone, name: c.name, email: c.email, birthday: c.birthday, anniversary: c.anniversary, addresses: c.addresses, favourites: c.favourites, points, totalOrders: c.totalOrders, createdAt: c.createdAt },
    history,
    expiring,
    rewards,
  });
});

const addressSchema = z.object({ label: z.string().max(30), address: z.string().max(300), landmark: z.string().max(200).optional(), zoneId: z.string().max(40).optional() });
const mmdd = z.string().regex(/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, "Use the date picker").or(z.literal(""));

export const PATCH = handle(async (req: Request) => {
  const c = await getCustomer();
  if (!c) return fail("Please sign in", 401);
  const body = z
    .object({
      name: z.string().trim().max(60).optional(),
      email: z.string().email("Enter a valid email").max(100).optional().or(z.literal("")),
      birthday: mmdd.optional(),
      anniversary: mmdd.optional(),
      addresses: z.array(addressSchema).max(10).optional(),
      favourites: z.array(z.string().max(40)).max(100).optional(),
      marketingOk: z.boolean().optional(),
    })
    .parse(await req.json());
  // birthday can be set once (stops gaming the bonus)
  const birthday = body.birthday !== undefined && !c.birthday ? body.birthday || null : undefined;
  const anniversary = body.anniversary !== undefined && !c.anniversary ? body.anniversary || null : undefined;
  const u = await db.customer.update({
    where: { id: c.id },
    data: { name: body.name ?? undefined, email: body.email === undefined ? undefined : body.email || null, birthday, anniversary, addresses: body.addresses ?? undefined, favourites: body.favourites ?? undefined, marketingOk: body.marketingOk ?? undefined },
  });
  return ok({ customer: { id: u.id, name: u.name, phone: u.phone, email: u.email, birthday: u.birthday, anniversary: u.anniversary, addresses: u.addresses, favourites: u.favourites, points: u.points } });
});

export const DELETE = handle(async () => {
  (await cookies()).delete(CUSTOMER_COOKIE);
  return ok({ ok: true });
});
