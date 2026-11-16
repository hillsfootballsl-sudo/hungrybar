import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { z } from "zod";
import { fail, handle, ok } from "@/lib/api";
import { db } from "@/lib/db";
import { homeFor, signToken, STAFF_COOKIE } from "@/lib/jwt";

const attempts = new Map<string, { n: number; t: number }>();

export const POST = handle(async (req: Request) => {
  const { staffId, pin } = z.object({ staffId: z.string(), pin: z.string().min(4).max(8) }).parse(await req.json());
  const a = attempts.get(staffId);
  if (a && a.n >= 5 && Date.now() - a.t < 5 * 60_000) return fail("Too many wrong PINs. Wait 5 minutes.", 429);
  const s = await db.staff.findUnique({ where: { id: staffId } });
  if (!s || !s.active || !(await bcrypt.compare(pin, s.pinHash))) {
    attempts.set(staffId, { n: (a && Date.now() - a.t < 5 * 60_000 ? a.n : 0) + 1, t: Date.now() });
    return fail("Wrong PIN");
  }
  attempts.delete(staffId);
  const token = await signToken({ sid: s.id, name: s.name, role: s.role }, 14);
  (await cookies()).set(STAFF_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 14 * 86400 });
  return ok({ name: s.name, role: s.role, home: homeFor(s.role) });
});
