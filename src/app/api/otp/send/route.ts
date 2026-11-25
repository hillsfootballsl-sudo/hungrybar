import { createHash, randomInt } from "crypto";
import { z } from "zod";
import { fail, handle, ok } from "@/lib/api";
import { db } from "@/lib/db";
import { normalizePhone, sendSms } from "@/lib/sms";

export const POST = handle(async (req: Request) => {
  const { phone: raw } = z.object({ phone: z.string() }).parse(await req.json());
  const phone = normalizePhone(raw);
  if (!phone) return fail("Enter a valid Sri Lankan mobile number (07X XXX XXXX)");
  const recent = await db.otpCode.findFirst({ where: { phone }, orderBy: { createdAt: "desc" } });
  if (recent && Date.now() - recent.createdAt.getTime() < 45_000) return fail("Please wait a few seconds before requesting another code", 429);
  const hourCount = await db.otpCode.count({ where: { phone, createdAt: { gte: new Date(Date.now() - 3600_000) } } });
  if (hourCount >= 5) return fail("Too many attempts. Try again in an hour.", 429);
  const code = String(randomInt(100000, 999999));
  const codeHash = createHash("sha256").update(code + (process.env.AUTH_SECRET || "")).digest("hex");
  await db.otpCode.create({ data: { phone, codeHash, expiresAt: new Date(Date.now() + 5 * 60_000) } });
  const r = await sendSms(phone, `${code} is your Hungry Bar code. It expires in 5 minutes.`);
  if (!r.ok) return fail("Couldn't send the SMS. Please try again.", 502);
  // Test mode: show the code on screen instead of texting it. Never on the live site unless
  // OTP_TEST_MODE="true" is set deliberately (e.g. for a private trial before SMS is set up).
  const testMode = (process.env.SMS_PROVIDER || "console") === "console" && (process.env.NODE_ENV !== "production" || process.env.OTP_TEST_MODE === "true");
  if ((process.env.SMS_PROVIDER || "console") === "console" && !testMode) return fail("Sign-in by SMS isn't switched on yet. Please call us to order.", 503);
  const devCode = testMode ? code : undefined;
  return ok({ sent: true, phone, devCode });
});
