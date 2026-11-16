import { fail, handle, ok } from "@/lib/api";
import { staffOrNull } from "@/lib/auth";
import { db } from "@/lib/db";
import { orderInclude, toTicket } from "@/lib/orderView";

// Active orders for POS / kitchen / rider screens (polled every few seconds)
export const GET = handle(async (req: Request) => {
  const s = await staffOrNull();
  if (!s) return fail("Unauthorized", 401);
  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") || "active";
  const since = new Date(Date.now() - 18 * 3600_000);
  const where =
    scope === "kitchen"
      ? { status: { in: ["CONFIRMED", "PREPARING", "READY"] as const } }
      : scope === "rider"
        ? { type: "DELIVERY" as const, channel: { in: ["WEB", "POS"] as ("WEB" | "POS")[] }, status: { in: ["CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY"] as const } }
        : scope === "recent"
          ? { createdAt: { gte: since } }
          : { OR: [{ status: { in: ["PENDING", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY"] as const } }, { paymentStatus: "UNPAID" as const, status: { not: "CANCELLED" as const }, createdAt: { gte: since } }] };
  const orders = await db.order.findMany({ where: where as never, include: orderInclude, orderBy: { createdAt: "asc" }, take: 150 });
  return ok({ orders: orders.map(toTicket), now: new Date().toISOString() });
});
