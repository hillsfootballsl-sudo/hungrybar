# 🍕 Hungry Bar — Website, Ordering App, POS & Back-office

One system for **Hungry Bar, Hill Food Square, Dehiwala**:

| Area | URL | Who |
|---|---|---|
| Customer website + ordering app (installable on phones) | `/`, `/menu`, `/build`, `/checkout`, `/order/…`, `/account` | Customers |
| Dine-in QR ordering | `/t/<table-code>` (printed QR per table) | Customers at tables |
| POS (Android tablet + Bluetooth printer) | `/pos` | Owner, manager, cashier |
| Kitchen display | `/kitchen` | Kitchen (any screen/TV) |
| Rider app | `/rider` | Delivery riders |
| Admin back-office | `/admin` | Owner, manager |
| Staff login (PIN pad) | `/staff/login` | Everyone on staff |

---

## What's inside

### Customer side
- **Live pizza builder.** Pick a size, a base (thick or thin), sauce scoops, cheese, meats and veggies. The pizza is drawn live and each scoop or portion drops onto it. The price updates with every tap, and the "Loaded-o-meter" shows how loaded the pizza is. Detroit Box pizzas are drawn as squares.
- **Menu pizzas are editable too.** Tap "Customise" on any menu pizza and the builder opens with its recipe. Removing a topping shows "No Onion"; adding extras charges the per-size extra price.
- **Menu with serving hours.** Paninis and juices are served 6am–10pm, pizzas 11am–midnight. Outside those hours customers can still schedule an order for later.
- **Checkout.**
  - Delivery is free around Dehiwala; other areas have a fee you set.
  - Pickup and dine-in by table QR.
  - Phone OTP login.
  - "Pin my location" for riders.
  - ASAP or a scheduled time.
  - Cash on delivery or PayHere card / eZ Cash.
  - Promo codes.
- **Rewards.** Every 10th order gets a free 1-person pizza. Stamps are added automatically for web and POS orders that carry a phone number.
- **Live order tracking** with a status timeline, a WhatsApp button, reorder, and an order history page.
- **Mobile first.** App-style bottom bar on phones. It can be installed from the browser ("Add to Home screen").

### POS (tablet)
- **Quick ordering.** Tap a pizza's size to add it; tap the pizza picture to open the full builder. Covers takeaway, dine-in (table), delivery, **Uber** and **PickMe** (with a field for the platform's order ID).
- **Customer and discounts.** Look up a customer by phone to see their stamps and redeem a free pizza. Promo codes work here too. Discounts by a cashier need a **manager PIN**.
- **Payment.** Cash keypad with change calculation, or card (your existing card machine). "Pay later" sends a dine-in tab to the kitchen now and you settle it later.
- **Online orders.** Web and QR orders ring the POS until accepted. Accepting prints the kitchen ticket.
- **Shift and cash drawer.** Opening float, cash in and out, close with a counted amount, and a printed **Z report**. Cash over or short is flagged to the owner.
- **Printing.**
  - **Bluetooth printing** straight from Chrome on Android (BLE ESC/POS printers).
  - For Bluetooth-Classic-only printers, use the **RawBT** app.
  - A normal print dialog works for USB or Wi-Fi printers.
  - Prints the logo, QR code, stamp card, and opens the cash drawer on cash sales.

### Kitchen display & rider app
- **Kitchen display.** Columns are New → In the oven → Ready, each with a timer that turns amber, then red. Each ticket shows a mini picture of the pizza and highlights topping changes and notes. It beeps on new orders.
- **Rider app.** Shows ready deliveries, a Google Maps link (to the pinned location if the customer set one), a call button, and "Delivered · collect Rs X".

### Back-office (admin)
- **Dashboard.** Today's sales, profit and margin, a 14-day sales chart, where today's money goes, low stock, unpaid tabs and best sellers.
- **Stock is automatic.** Every sale deducts the exact recipe from stock:
  - **Pizzas:** dough by size and base, grams per topping portion by size, and the box.
  - **Other items:** each item's own recipe, including cups, wraps and trays.
  - **Bags:** one carry bag per takeaway or delivery order.

  Cancelling an order returns the stock. Each ingredient shows average daily use, **days left**, a **reorder suggestion** and how many pizzas the dough left can make. Low stock creates a notification and can also send an SMS to the owner.
- **Stock adjustments.** Physical count, add stock, and **wastage** (with its value), plus a full movement log.
- **Purchases and suppliers.** Recording a purchase adds stock and updates the cost price by weighted average, so food cost stays accurate. Each supplier has a delivery lead time, which feeds the reorder suggestions.
- **Sectors and money.** Every bill is split automatically:

  | Sector | How it's calculated |
  |---|---|
  | Food cost | Real recipe cost |
  | Packaging | Boxes, bags, cups, wraps, trays |
  | Royalty | Rs 100 / 150 / 200 per pizza by size |
  | Charity | Rs 50 / 75 / 100 per pizza by size |
  | Delivery fees | What the customer paid for delivery |
  | Uber / PickMe fee | The platform's commission % |
  | Profit | Whatever remains |

  You get per-day "set aside" amounts, a stacked chart, and **all-time balances per sector** (collected minus paid out). For example, record "Royalty transferred Rs 15,000" and the royalty balance drops by that much.
- **Menu.** Products, sizes and prices, recipes with a **live cost and profit per size**, add-ons (e.g. a cheese slice), categories with serving hours, and featured items.
- **Pizza builder settings.** Sizes (dough grams, base price, royalty, charity, box), bases, and a toppings grid with grams and price per portion for each size.
- **Other pages.**
  - Customers and stamps
  - Promo codes
  - Delivery areas and fees
  - **Printable table QR cards**
  - Staff with role-based PINs, and shift history with cash over/short
  - **Receipt designer** with a live 80mm preview and test print
  - Settings: shop details, hours, auto-accept, Uber/PickMe commission %, rewards

---

## ⚠️ Numbers you must check (sample data)

The menu and prices come from **Menu Board 3**. These are **placeholders** — edit them in admin:

| What | Where to fix | Placeholder |
|---|---|---|
| Grams per topping for 2P / 4P | Admin → Pizza builder & recipes | 1P uses your numbers (chicken/cheese 45g). 2P ≈ ×1.5, 4P ≈ ×1.9 |
| Sauce | same | 40g scoop, Rs 60 on 1P; 60g/Rs 90 on 2P; 75g/Rs 110 on 4P |
| Dough | Sizes | 180 / 270 / 320 g (yours). Detroit 200 g (guess) |
| Ingredient costs & opening stock | Admin → Stock | All guesses — **do a full stock count first** |
| Fresh juice & mojito names/prices | Admin → Menu | Guesses (e.g. Watermelon 450, Mojito 590) |
| Veg topping extra prices | Pizza builder | Rs 80 (peppers/capsicum), Rs 60 (onion) on 1P |
| Custom-pizza base price | Sizes | Set so base + 1 sauce + 1 cheese = your Margherita price |
| Detroit royalty/charity | Sizes | Rs 100 / 50 |
| Delivery areas outside Dehiwala | Delivery & tables | Rs 200–400 |
| Uber / PickMe commission | Settings | 30% / 25% |
| Staff PINs | Staff | **Owner 1234, Cashier 1111, Kitchen 2222, Rider 3333 — change them!** |

---

## Running it on a computer (for testing)

Needs Node.js 20+ and PostgreSQL.

```bash
npm install
cp .env.example .env        # then set DATABASE_URL / DIRECT_URL to your local Postgres
npx prisma migrate deploy
npm run db:seed             # real menu + sample stock
# or: npm run db:seed:demo  # also adds ~3 weeks of fake orders so the dashboard has data
npm run dev
```

Open http://localhost:3000. Staff login is at http://localhost:3000/staff/login.

While `SMS_PROVIDER="console"`, OTP codes are shown on screen. Real SMS is sent only once a provider is set.

---

## Going live (step by step)

1. **Database — Supabase** (free to start): create a project in the **Mumbai (ap-south-1)** region, which is closest to Sri Lanka. Copy the two connection strings into `DATABASE_URL` (port 6543, add `?pgbouncer=true&connection_limit=1`) and `DIRECT_URL` (port 5432).
2. **Hosting — Vercel:** import this GitHub repo, then add every variable from `.env.example`.
   - The build command `npm run vercel-build` runs the database migrations automatically.
   - Then seed once from your computer: `DATABASE_URL=… DIRECT_URL=… npm run db:seed`.
3. **Domain:** renew **hungrybar.lk** with your registrar and add it in Vercel → Domains, following Vercel's DNS records. Set `NEXT_PUBLIC_SITE_URL=https://hungrybar.lk`.
4. **SMS OTP:** create a [notify.lk](https://notify.lk) or [text.lk](https://text.lk) account. Request a sender ID (e.g. `HungryBar`), set `SMS_PROVIDER` and its keys, and add credit. Each OTP is one SMS.
5. **PayHere:** create a merchant account and add `hungrybar.lk` as an approved domain. Test with `PAYHERE_SANDBOX="true"`, then switch to `"false"`.
6. **Tablet POS:** use an Android tablet with **Chrome**.
   - Open `https://hungrybar.lk/pos`, then ⋮ → **Add to Home screen**, so it opens full-screen like an app.
   - Turn the 80mm printer on and tap 🖨️ **Connect printer**.
   - If your printer doesn't show up, it's Bluetooth-Classic-only. Install **RawBT** from the Play Store, pair the printer in RawBT, and choose "RawBT app" in the POS printer menu.
   - Most 80mm printers with an RJ11 cash-drawer port will pop the drawer on cash sales.
7. **Kitchen screen:** any phone, tablet or smart TV browser → `/kitchen`, logged in with the Kitchen PIN.
8. **Table QR codes:** Admin → Delivery & tables → **Print QR cards**, then stick them on the tables.
9. **Change all PINs**, do a stock count (Stock → Adjust → Physical count), and check the placeholder numbers above.

**Monthly cost estimate:** Vercel Hobby and Supabase Free are $0 at the start. Once you grow, Vercel Pro is $20 and Supabase Pro is $25. Add SMS credit and PayHere's per-transaction fee.

---

## Project structure

```
prisma/schema.prisma      data model (menu, recipes, stock, orders, sectors, staff, shifts, loyalty…)
prisma/seed.ts            Hungry Bar menu + starter data
src/lib/pricing.ts        one pricing engine for website, POS & server
src/lib/costing.ts        recipe → ingredient usage, food & packaging cost, royalty, charity
src/lib/orders.ts         quote/create orders, status flow, stock deduction & return, stamps, low-stock alerts
src/lib/sectors.ts        per-day & all-time sector reports
src/lib/receipt.ts        receipt & kitchen-ticket layout  →  src/lib/escpos.ts (printer bytes)
src/lib/printer.ts        Web Bluetooth / RawBT / browser printing, logo dithering
src/components/PizzaArt.tsx            the live pizza illustration
src/components/builder/PizzaBuilder.tsx the step-by-step builder (website + POS)
src/app/(site)/…          customer website
src/app/pos, kitchen, rider, admin     staff apps
```
