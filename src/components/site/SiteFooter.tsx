import Image from "next/image";
import Link from "next/link";
import type { HoursSettings, ShopSettings } from "@/lib/settings";
import { fmtTime12 } from "@/lib/time";

export function SiteFooter({ shop, hours }: { shop: ShopSettings; hours: HoursSettings }) {
  return (
    <footer className="mt-20 border-t-2 border-char bg-char pb-24 text-cream md:pb-0">
      <div className="checker-strip h-3" />
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-4">
        <div className="md:col-span-1">
          <Image src="/brand/logo.png" alt="Hungry Bar" width={120} height={120} className="h-28 w-28" />
          <p className="mt-3 text-cream/70">{shop.tagline}</p>
          {shop.halal && <p className="chip mt-3 border-cream bg-basil text-white">100% Halal</p>}
        </div>
        <div>
          <h3 className="h-cond text-xl text-tomato-300">Find us</h3>
          <p className="mt-2">{shop.address}</p>
          <a href={shop.mapUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block underline">Open in Google Maps ↗</a>
          <p className="mt-3"><a href={`tel:${shop.phone.replace(/\s/g, "")}`} className="font-bold">{shop.phone}</a></p>
          <a href={`https://wa.me/${shop.whatsapp}`} target="_blank" rel="noreferrer" className="mt-1 inline-block underline">WhatsApp us ↗</a>
        </div>
        <div>
          <h3 className="h-cond text-xl text-tomato-300">Hours</h3>
          <p className="mt-2 font-bold">Pizza</p>
          <p className="text-cream/70">{fmtTime12(hours.pizza.open)} – {fmtTime12(hours.pizza.close)} daily</p>
          <p className="mt-2 font-bold">Café · Paninis & Juices</p>
          <p className="text-cream/70">{fmtTime12(hours.cafe.open)} – {fmtTime12(hours.cafe.close)} daily</p>
        </div>
        <div>
          <h3 className="h-cond text-xl text-tomato-300">Explore</h3>
          <ul className="mt-2 space-y-1">
            <li><Link href="/menu" className="hover:underline">Full menu</Link></li>
            <li><Link href="/build" className="hover:underline">Build your own pizza</Link></li>
            <li><Link href="/account" className="hover:underline">Track my order</Link></li>
            {shop.instagram && <li><a href={`https://instagram.com/${shop.instagram}`} className="hover:underline" target="_blank" rel="noreferrer">Instagram @{shop.instagram}</a></li>}
            <li><Link href="/staff/login" className="text-cream/40 hover:underline">Staff login</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-cream/10 py-5 text-center text-sm text-cream/50">© {new Date().getFullYear()} {shop.name} · Est. {shop.since} · Dehiwala, Sri Lanka</div>
    </footer>
  );
}
