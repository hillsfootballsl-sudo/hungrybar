import { CartSheet } from "@/components/store/CartPanel";
import { Footer, Header, MobileNav, Toast } from "@/components/store/Chrome";
import { ComboModal } from "@/components/store/ComboModal";
import { CustomiseModal } from "@/components/store/CustomiseModal";
import { InstallBanner } from "@/components/store/Install";
import { LocationModal } from "@/components/store/LocationModal";
import { LoginSheet } from "@/components/store/LoginSheet";
import { StoreProvider } from "@/components/store/StoreProvider";
import { loadCatalog } from "@/lib/catalog";
import { db } from "@/lib/db";
import { vapidKeys } from "@/lib/env";
import { payhereConfigured } from "@/lib/payhere";
import { getAllSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [catalog, s, zones] = await Promise.all([loadCatalog(), getAllSettings(), db.deliveryZone.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } })]);
  return (
    <StoreProvider
      catalog={catalog}
      config={{
        shop: s.shop,
        hours: s.hours,
        rewards: s.rewards,
        zones: zones.map((z) => ({ id: z.id, name: z.name, fee: z.fee, eta: z.etaMinutes })),
        payhere: payhereConfigured(),
        vapidKey: vapidKeys()?.publicKey ?? null,
        accepting: s.orders.acceptingOnline,
        prepMinutes: s.orders.prepMinutes,
      }}
    >
      <Header />
      <main className="min-h-[60vh]">{children}</main>
      <Footer />
      <MobileNav />
      <CartSheet />
      <LocationModal />
      <LoginSheet />
      <CustomiseModal />
      <ComboModal />
      <InstallBanner />
      <Toast />
    </StoreProvider>
  );
}
