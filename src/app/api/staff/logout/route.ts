import { cookies } from "next/headers";
import { ok } from "@/lib/api";
import { STAFF_COOKIE } from "@/lib/jwt";

export async function POST() {
  (await cookies()).delete(STAFF_COOKIE);
  return ok({ ok: true });
}
