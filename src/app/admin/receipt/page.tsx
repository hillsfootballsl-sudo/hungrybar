import { ReceiptDesigner } from "@/components/admin/ReceiptDesigner";
import { PageHeader } from "@/components/admin/ui";
import { getAllSettings } from "@/lib/settings";

export const metadata = { title: "Receipt designer" };

export default async function ReceiptPage() {
  const s = await getAllSettings();
  return (
    <div>
      <PageHeader title="Receipt designer" sub="What you see here is what the 80mm Bluetooth printer prints. Connect the printer on this device to test." />
      <ReceiptDesigner initial={s.receipt} shop={s.shop} pointName={s.rewards.pointName} />
    </div>
  );
}
