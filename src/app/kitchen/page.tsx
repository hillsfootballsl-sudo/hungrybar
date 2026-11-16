import { KitchenClient } from "@/components/staff/KitchenClient";
import { requireStaff } from "@/lib/auth";
import { loadCatalog } from "@/lib/catalog";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kitchen" };

export default async function KitchenPage() {
  const staff = await requireStaff(["OWNER", "MANAGER", "CASHIER", "KITCHEN"]);
  const catalog = await loadCatalog();
  return <KitchenClient catalog={catalog} staffName={staff.name} />;
}
