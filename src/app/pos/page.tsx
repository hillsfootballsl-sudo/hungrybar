import { PosClient } from "@/components/pos/PosClient";
import { FRONT, requireStaff } from "@/lib/auth";
import { loadCatalog } from "@/lib/catalog";
import { db } from "@/lib/db";
import { getAllSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const metadata = { title: "POS" };

export default async function PosPage() {
  const staff = await requireStaff(FRONT);
  const [catalog, settings, zones, tables, riders] = await Promise.all([
    loadCatalog(),
    getAllSettings(),
    db.deliveryZone.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    db.diningTable.findMany({ where: { active: true }, orderBy: { label: "asc" } }),
    db.staff.findMany({ where: { active: true, role: "RIDER" }, select: { id: true, name: true } }),
  ]);
  return (
    <PosClient
      catalog={catalog}
      staff={staff}
      zones={zones.map((z) => ({ id: z.id, name: z.name, fee: z.fee }))}
      tables={tables.map((t) => ({ id: t.id, label: t.label }))}
      riders={riders}
      print={{ receipt: settings.receipt, shop: settings.shop, stampsRequired: settings.loyalty.stampsRequired }}
      loyaltyEnabled={settings.loyalty.enabled}
    />
  );
}
