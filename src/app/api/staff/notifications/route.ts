import { fail, handle, ok } from "@/lib/api";
import { staffOrNull } from "@/lib/auth";
import { db } from "@/lib/db";

export const GET = handle(async () => {
  const s = await staffOrNull();
  if (!s) return fail("Unauthorized", 401);
  const [items, unread] = await Promise.all([
    db.notification.findMany({ orderBy: { createdAt: "desc" }, take: 25 }),
    db.notification.count({ where: { read: false } }),
  ]);
  return ok({ items, unread });
});

export const POST = handle(async () => {
  const s = await staffOrNull();
  if (!s) return fail("Unauthorized", 401);
  await db.notification.updateMany({ where: { read: false }, data: { read: true } });
  return ok({ ok: true });
});
