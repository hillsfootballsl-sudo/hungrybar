import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { CUSTOMER_COOKIE, type CustomerSession, STAFF_COOKIE, type StaffRole, type StaffSession, verifyToken } from "./jwt";

export async function getStaff(): Promise<StaffSession | null> {
  const jar = await cookies();
  return verifyToken<StaffSession>(jar.get(STAFF_COOKIE)?.value);
}

export async function requireStaff(roles?: StaffRole[]): Promise<StaffSession> {
  const s = await getStaff();
  if (!s) redirect("/staff/login");
  if (roles && !roles.includes(s.role)) redirect("/staff/login?denied=1");
  return s;
}

/** For API routes: returns the session or null (caller should 401). */
export async function staffOrNull(roles?: StaffRole[]) {
  const s = await getStaff();
  if (!s) return null;
  if (roles && !roles.includes(s.role)) return null;
  const live = await db.staff.findUnique({ where: { id: s.sid }, select: { active: true } });
  return live?.active ? s : null;
}

export async function getCustomer() {
  const jar = await cookies();
  const s = await verifyToken<CustomerSession>(jar.get(CUSTOMER_COOKIE)?.value);
  if (!s) return null;
  return db.customer.findUnique({ where: { id: s.cid } });
}

export const MANAGERS: StaffRole[] = ["OWNER", "MANAGER"];
export const FRONT: StaffRole[] = ["OWNER", "MANAGER", "CASHIER"];

/** Manager override: returns the approving manager if the PIN matches an active OWNER/MANAGER */
export async function verifyManagerPin(pin?: string | null) {
  if (!pin) return null;
  const bcrypt = (await import("bcryptjs")).default;
  const managers = await db.staff.findMany({ where: { active: true, role: { in: ["OWNER", "MANAGER"] } } });
  for (const m of managers) if (await bcrypt.compare(pin, m.pinHash)) return m;
  return null;
}
