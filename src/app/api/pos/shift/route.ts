import { z } from "zod";
import { fail, handle, ok } from "@/lib/api";
import { FRONT, staffOrNull } from "@/lib/auth";
import { db } from "@/lib/db";
import { currentShift, shiftSummary } from "@/lib/shift";

export const GET = handle(async () => {
  const s = await staffOrNull(FRONT);
  if (!s) return fail("Unauthorized", 401);
  const shift = await currentShift();
  return ok({ summary: shift ? await shiftSummary(shift.id) : null });
});

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("open"), openingCash: z.number().min(0) }),
  z.object({ action: z.literal("close"), closingCash: z.number().min(0), note: z.string().max(300).optional() }),
  z.object({ action: z.literal("move"), type: z.enum(["IN", "OUT"]), amount: z.number().positive(), reason: z.string().min(1).max(120) }),
]);

export const POST = handle(async (req: Request) => {
  const s = await staffOrNull(FRONT);
  if (!s) return fail("Unauthorized", 401);
  const body = schema.parse(await req.json());
  const open = await currentShift();
  if (body.action === "open") {
    if (open) return fail("A shift is already open");
    const shift = await db.shift.create({ data: { staffId: s.sid, openingCash: body.openingCash } });
    return ok({ summary: await shiftSummary(shift.id) });
  }
  if (!open) return fail("No open shift");
  if (body.action === "move") {
    await db.cashMovement.create({ data: { shiftId: open.id, type: body.type, amount: body.amount, reason: body.reason, staffId: s.sid } });
    return ok({ summary: await shiftSummary(open.id) });
  }
  const sum = await shiftSummary(open.id);
  await db.shift.update({ where: { id: open.id }, data: { closedAt: new Date(), closingCash: body.closingCash, expectedCash: sum?.expectedCash ?? 0, note: body.note } });
  const diff = body.closingCash - (sum?.expectedCash ?? 0);
  if (Math.abs(diff) >= 1) {
    await db.notification.create({ data: { type: "SHIFT", title: `Cash ${diff > 0 ? "over" : "short"} by Rs. ${Math.abs(Math.round(diff))}`, body: `Shift closed by ${s.name}`, link: "/admin/shifts" } });
  }
  return ok({ closed: true, summary: await shiftSummary(open.id), diff });
});
