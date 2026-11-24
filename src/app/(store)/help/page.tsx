import { getAllSettings } from "@/lib/settings";
import { fmtTime12 } from "@/lib/time";

export const metadata = { title: "Help & FAQ" };

export default async function Help() {
  const s = await getAllSettings();
  const r = s.rewards;
  const faqs: [string, string, string][] = [
    ["halal", "Is everything halal?", "Yes. Hungry Bar is 100% halal. All our chicken, beef and pepperoni come from halal-certified suppliers."],
    ["hours", "When are you open?", `Every day from ${fmtTime12(s.hours.open)} to ${fmtTime12(s.hours.close)}. You can place an order any time and schedule it for when we're open.`],
    ["delivery", "Where do you deliver?", "Free delivery around Dehiwala, and a small fee for nearby areas. Pick your area when you start an order to see the fee and time."],
    ["points", "How do Hungry Points work?", `Spend Rs. ${r.rupeesPerPoint} and earn 1 point once your order is completed. Points last ${r.expiryMonths} months. Swap them for free items on the rewards menu from your cart.`],
    ["counter", "Can I earn points at the counter?", "Yes. Give your mobile number when you pay at the shop and the points go to the same account."],
    ["pay", "How can I pay?", "Cash on delivery or pickup, or card / eZ Cash online through PayHere when it's available."],
    ["change", "Can I change or cancel my order?", "Call or WhatsApp us straight away. Once your pizza is in the oven we may not be able to change it. Cancelled orders get their points back."],
    ["app", "Is there an app?", "Yes. On Android, tap Install app in the menu. On iPhone, open the site in Safari, tap Share, then Add to Home Screen."],
  ];
  return (
    <div className="mx-auto max-w-3xl px-5 pb-24 pt-8">
      <h1 className="text-3xl font-extrabold md:text-4xl">Help & FAQ</h1>
      <div className="mt-6 space-y-3">
        {faqs.map(([id, q, a]) => (
          <details key={id} id={id} className="card group p-5 open:ring-2 open:ring-char/10">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-lg font-extrabold">{q}<span className="text-2xl transition group-open:rotate-45">+</span></summary>
            <p className="mt-2 text-char-600">{a}</p>
          </details>
        ))}
      </div>
      <section id="ingredients" className="card mt-8 scroll-mt-28 p-6">
        <h2 className="text-xl font-extrabold">Ingredients</h2>
        <p className="mt-2 text-char-600">Fresh dough made in-house, our own tomato sauce, real mozzarella, halal meats cooked in our kitchen, and vegetables bought fresh from the market. Juices are blended to order from whole fruit.</p>
      </section>
      <section id="allergens" className="card mt-4 scroll-mt-28 p-6">
        <h2 className="text-xl font-extrabold">Allergen information</h2>
        <p className="mt-2 text-char-600">Our pizzas, subs, sandwiches, garlic bread and lasagna contain <b>wheat (gluten)</b> and <b>milk</b>. Sauces and mayonnaise may contain <b>egg</b> and <b>soy</b>. Everything is prepared in one kitchen, so we can&apos;t guarantee any item is allergen-free. Tell us about allergies when you order.</p>
      </section>
      <section id="contact" className="card mt-4 scroll-mt-28 p-6">
        <h2 className="text-xl font-extrabold">Contact us</h2>
        <p className="mt-2">Call <span className="select-all font-bold">{s.shop.phone}</span>, or WhatsApp us.</p>
        <a href={`https://wa.me/${s.shop.whatsapp}`} target="_blank" rel="noreferrer" className="btn mt-3 bg-[#25D366] text-white">WhatsApp us</a>
        <p className="mt-3 text-char-500">{s.shop.address}</p>
      </section>
    </div>
  );
}
