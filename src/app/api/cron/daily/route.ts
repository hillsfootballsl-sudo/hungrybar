import { fail, handle, ok } from "@/lib/api";
import { celebrationBonuses, expireAll } from "@/lib/points";

// Called once a day by Vercel Cron (see vercel.json). Expires old points and drops birthday bonuses.
export const GET = handle(async (req: Request) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return fail("Unauthorized", 401);
  const [expired, bonuses] = await Promise.all([expireAll(), celebrationBonuses()]);
  return ok({ expired, bonuses });
});
