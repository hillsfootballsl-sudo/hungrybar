import { SettingsForm } from "@/components/admin/SettingsForm";
import { PageHeader } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { getAllSettings } from "@/lib/settings";

export const metadata = { title: "Settings" };

export default async function Settings() {
  const [s, packaging] = await Promise.all([
    getAllSettings(),
    db.ingredient.findMany({ where: { isPackaging: true, active: true }, select: { id: true, name: true } }),
  ]);
  const integrations = [
    ["SMS (OTP + alerts)", process.env.SMS_PROVIDER && process.env.SMS_PROVIDER !== "console" ? `✅ ${process.env.SMS_PROVIDER}` : "⚠️ Test mode — codes shown on screen"],
    ["PayHere card payments", process.env.PAYHERE_MERCHANT_ID ? (process.env.PAYHERE_SANDBOX === "false" ? "✅ Live" : "🧪 Sandbox") : "⚠️ Not configured"],
    ["Order notifications (push)", process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ? "✅ Ready" : "⚠️ Not configured"],
    ["Daily points job (expiry & birthdays)", process.env.CRON_SECRET ? "✅ Scheduled" : "⚠️ Set CRON_SECRET"],
    ["Website address", process.env.NEXT_PUBLIC_SITE_URL ?? "not set"],
  ];
  return (
    <div>
      <PageHeader title="Settings" />
      <SettingsForm shop={s.shop} hours={s.hours} orders={s.orders} rewards={s.rewards} packaging={packaging} />
      <section className="card mt-4 p-4">
        <h2 className="mb-2 font-bold">Integrations</h2>
        <ul className="space-y-1 text-sm">
          {integrations.map(([k, v]) => (
            <li key={k} className="flex justify-between border-b border-char-50 py-1"><span>{k}</span><span className="font-bold">{v}</span></li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-char-400">These are set as environment variables on the hosting (see README → Going live).</p>
      </section>
    </div>
  );
}
