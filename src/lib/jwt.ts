// Edge-safe JWT helpers (used by middleware and server code)
import { jwtVerify, SignJWT } from "jose";

const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret-change-me-dev-secret-change-me");

export type StaffRole = "OWNER" | "MANAGER" | "CASHIER" | "KITCHEN" | "RIDER";
export interface StaffSession { sid: string; name: string; role: StaffRole }
export interface CustomerSession { cid: string; phone: string }

export const STAFF_COOKIE = "hb_staff";
export const CUSTOMER_COOKIE = "hb_cust";

export async function signToken(payload: Record<string, unknown>, days: number) {
  return new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(`${days}d`).sign(secret());
}

export async function verifyToken<T>(token?: string | null): Promise<T | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as T;
  } catch {
    return null;
  }
}

/** Which roles may open which staff area */
export const AREA_ROLES: Record<string, StaffRole[]> = {
  "/admin": ["OWNER", "MANAGER"],
  "/pos": ["OWNER", "MANAGER", "CASHIER"],
  "/kitchen": ["OWNER", "MANAGER", "CASHIER", "KITCHEN"],
  "/rider": ["OWNER", "MANAGER", "RIDER"],
};

export function homeFor(role: StaffRole) {
  return role === "KITCHEN" ? "/kitchen" : role === "RIDER" ? "/rider" : role === "CASHIER" ? "/pos" : "/admin";
}
