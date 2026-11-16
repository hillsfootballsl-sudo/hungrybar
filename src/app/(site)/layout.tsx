import { CartProvider } from "@/components/cart";
import { CatalogProvider } from "@/components/CatalogContext";
import { CartDrawer } from "@/components/site/CartDrawer";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { loadCatalog } from "@/lib/catalog";
import { getSetting } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [catalog, shop, hours] = await Promise.all([loadCatalog(), getSetting("shop"), getSetting("hours")]);
  return (
    <CatalogProvider catalog={catalog}>
      <CartProvider>
        <SiteHeader hours={hours} />
        <main className="min-h-[60vh]">{children}</main>
        <SiteFooter shop={shop} hours={hours} />
        <CartDrawer />
      </CartProvider>
    </CatalogProvider>
  );
}
