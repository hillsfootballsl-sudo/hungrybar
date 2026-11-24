import { db } from "@/lib/db";
import { getAllSettings } from "@/lib/settings";
import { fmtTime12 } from "@/lib/time";

export const metadata = { title: "Store info & delivery areas" };

export default async function StoreInfo() {
  const [s, zones] = await Promise.all([getAllSettings(), db.deliveryZone.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } })]);
  return (
    <div className="mx-auto max-w-4xl px-5 pb-24 pt-8">
      <h1 className="text-3xl font-extrabold md:text-4xl">Hungry Bar, Dehiwala</h1>
      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
        <section className="card p-6">
          <h2 className="text-lg font-extrabold">Find us</h2>
          <p className="mt-2">{s.shop.address}</p>
          <p className="mt-1 select-all font-bold">{s.shop.phone}</p>
          <a href={s.shop.mapUrl} target="_blank" rel="noreferrer" className="btn-dark btn-sm mt-4">Open in Google Maps</a>
        </section>
        <section className="card p-6">
          <h2 className="text-lg font-extrabold">Opening hours</h2>
          <p className="mt-2 text-3xl font-extrabold text-tomato">{fmtTime12(s.hours.open)} – {fmtTime12(s.hours.close)}</p>
          <p className="text-char-500">{s.hours.note}</p>
          <p className="mt-3 text-sm text-char-500">Ordering online outside these hours? Schedule it for later.</p>
        </section>
      </div>
      <section className="card mt-5 p-6">
        <h2 className="text-lg font-extrabold">Delivery areas</h2>
        <ul className="mt-3 divide-y divide-char-100">
          {zones.map((z) => (
            <li key={z.id} className="flex items-center justify-between py-3">
              <span className="font-bold">{z.name} <span className="text-sm font-normal text-char-400">· ~{z.etaMinutes} min</span></span>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${z.fee ? "bg-char-50" : "bg-basil text-white"}`}>{z.fee ? `Rs. ${z.fee}` : "FREE"}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
