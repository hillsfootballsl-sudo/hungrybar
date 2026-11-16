import { RiderClient } from "@/components/staff/RiderClient";
import { requireStaff } from "@/lib/auth";
import { getSetting } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const metadata = { title: "Rider" };

export default async function RiderPage() {
  const staff = await requireStaff(["OWNER", "MANAGER", "RIDER"]);
  const shop = await getSetting("shop");
  return <RiderClient me={{ id: staff.sid, name: staff.name }} shopPhone={shop.phone} />;
}
