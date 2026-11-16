import { createHash } from "crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { fail, handle, ok } from "@/lib/api";
import { db } from "@/lib/db";
import { CUSTOMER_COOKIE, signToken } from "@/lib/jwt";
import { normalizePhone } from "@/lib/sms";

export const POST = handle(async (req: Request) => {
  const body = z.object({ phone: z.string(), code: z.string().min(4).max(8) }).parse(await req.json());
  const phone = normalizePhone(body.phone);
  if (!phone) return fail("Invalid phone number");
  const otp = await db.otpCode.findFirst({ where: { phone, used: false }, orderBy: { createdAt: "desc" } });
  if (!otp || otp.expiresAt < new Date()) return fail("Code expired — request a new one");
  if (otp.attempts >= 5) return fail("Too many wrong attempts — request a new code");
  const hash = createHash("sha256").update(body.code.trim() + (process.env.AUTH_SECRET || "")).digest("hex");
  if (hash !== otp.codeHash) {
    await db.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    return fail("That code doesn't match");
  }
  await db.otpCode.update({ where: { id: otp.id }, data: { used: true } });
  const customer = await db.customer.upsert({ where: { phone }, create: { phone }, update: {} });
  const token = await signToken({ cid: customer.id, phone }, 90);
  (await cookies()).set(CUSTOMER_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 90 * 86400 });
  return ok({ customer: { id: customer.id, phone: customer.phone, name: customer.name, stamps: customer.stamps, addresses: customer.addresses } });
});
