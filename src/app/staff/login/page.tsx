import { db } from "@/lib/db";
import { LoginClient } from "./LoginClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Staff login" };

export default async function StaffLogin({ searchParams }: { searchParams: Promise<{ next?: string; denied?: string }> }) {
  const sp = await searchParams;
  const staff = await db.staff.findMany({ where: { active: true }, orderBy: [{ role: "asc" }, { name: "asc" }], select: { id: true, name: true, role: true } });
  return <LoginClient staff={staff} next={sp.next} denied={!!sp.denied} />;
}
