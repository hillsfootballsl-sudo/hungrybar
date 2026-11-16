import { fail, handle, ok } from "@/lib/api";
import { db } from "@/lib/db";

export const GET = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const o = await db.order.findUnique({
    where: { id },
    select: {
      id: true, number: true, status: true, type: true, paymentStatus: true, paymentMethod: true, total: true, createdAt: true,
      confirmedAt: true, readyAt: true, completedAt: true, cancelledAt: true, cancelReason: true, scheduledFor: true,
      zone: { select: { etaMinutes: true, name: true } }, table: { select: { label: true } },
    },
  });
  if (!o) return fail("Not found", 404);
  return ok(o);
});
