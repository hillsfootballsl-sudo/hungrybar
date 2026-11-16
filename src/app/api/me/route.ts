import { cookies } from "next/headers";
import { z } from "zod";
import { fail, handle, ok } from "@/lib/api";
import { getCustomer } from "@/lib/auth";
import { db } from "@/lib/db";
import { CUSTOMER_COOKIE } from "@/lib/jwt";
import { getSetting } from "@/lib/settings";

export const GET = handle(async () => {
  const c = await getCustomer();
  if (!c) return ok({ customer: null });
  const loyalty = await getSetting("loyalty");
  return ok({ customer: { id: c.id, phone: c.phone, name: c.name, email: c.email, stamps: c.stamps, addresses: c.addresses, totalOrders: c.totalOrders }, loyalty });
});

const addressSchema = z.object({ label: z.string().max(30), address: z.string().max(300), landmark: z.string().max(200).optional(), zoneId: z.string().max(40).optional() });

export const PATCH = handle(async (req: Request) => {
  const c = await getCustomer();
  if (!c) return fail("Please sign in", 401);
  const body = z.object({ name: z.string().max(60).optional(), email: z.string().email().max(100).optional().or(z.literal("")), addresses: z.array(addressSchema).max(10).optional() }).parse(await req.json());
  const u = await db.customer.update({ where: { id: c.id }, data: { name: body.name ?? undefined, email: body.email || undefined, addresses: body.addresses ?? undefined } });
  return ok({ customer: { id: u.id, name: u.name, phone: u.phone, addresses: u.addresses } });
});

export const DELETE = handle(async () => {
  (await cookies()).delete(CUSTOMER_COOKIE);
  return ok({ ok: true });
});
