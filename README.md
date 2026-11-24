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

### Customer website & app (mobile first, installable)
- **Big-chain layout in Hungry Bar colours.**
  - **Header:** menu drawer, logo, a **delivery/pickup + time selector**, the **Hungry Rewards** badge, and Sign Up.
  - **Homepage:** a sliding banner carousel, "Explore Our Menu" category tiles, Hungry Deals, Our Favourites, bestsellers, a rewards band and an install-the-app band.
- **Ordering starts with delivery or pickup.** Customers choose their area first (free around Dehiwala) or pickup, then "as soon as possible" or a scheduled time. Everything is open **4pm–midnight**. Outside those hours customers can still schedule.
- **Menu page.**
  - Search box, category tabs and filter chips (Veg / Non Veg / Bestsellers / Chicken / Beef / My Favourites).
  - Product cards with photo, ♥ favourite, **Customise**, veg/non-veg mark, serves, **size and crust choices**, price and **Add To Cart**.
  - A live **cart sidebar** on desktop and a "View cart" bar on phones.
- **"Customise Your Style" popup.**
  - Change the size and crust.
  - Included toppings and extra toppings, each with a **None / Regular / Extra / Triple** stepper.
  - A **live drawing of the pizza** that changes with every tap, next to the photo.
  - Also covers **Build Your Own** and Detroit squares.
- **Hungry Deals (combos).** Customers pick each item in the deal, and pricier picks show a small top-up. The deal price is never more than ordering separately.
- **Cart.** Edit items, apply a coupon, **use points to claim free rewards**, and see delivery fees.
- **Checkout.**
  - Sign in with a phone code.
  - Saved addresses and "pin my exact location".
  - Cash on delivery or pickup, or PayHere card / eZ Cash.
- **Order tracking** with a live timeline, plus **push notifications** to the phone ("In the oven 🔥", "On the way 🛵").
- **My account:** orders with reorder and track, points history and expiry, profile (birthday and anniversary can be set once), saved addresses, favourites.
- **Hungry Rewards page:** how points work, perks and the rewards menu, with progress bars once signed in.
- **Installable app (PWA).** "Install app" on Android, Add-to-Home-Screen steps on iPhone, an offline page, and app shortcuts.
- **Info pages:** store info and delivery areas, help/FAQ (halal, allergens, contact), about, terms, privacy, and table QR ordering.

### Hungry Rewards (points)
- **Earning.** Customers earn **1 point per Rs. 10**. Points are credited when the order is **completed** and **expire after 6 months** (oldest spent first).
- **Bonuses.**
  - **100 bonus points** after the first order.
  - **200 points a week before a birthday or anniversary**, valid for 30 days.
- **Rewards menu**, edited in admin:

  | Reward | Points |
  |---|---|
  | Garlic bread | 150 |
  | Mint mojito | 600 |
  | Mini sub | 700 |
  | Detroit margherita | 850 |
  | 1-person margherita | 1,000 |
  | 2-person margherita | 1,650 |

- **Works at the counter too.** The POS looks the customer up by phone, shows their points and claims rewards.
- **Cancelling** gives back the points that were spent and takes back the points that were earned.
- A daily job (Vercel Cron) expires old points and drops birthday bonuses.

### POS (tablet)
- **Taking orders.** Tap a size to add a pizza, tap the picture to customise, tap a **combo** to choose its items. Covers takeaway, dine-in (table), delivery, **Uber** and **PickMe**.
- **Customers and points.** Look up the customer by phone to see their **points** and tap "Use points" to claim rewards. Points to be earned show on the ticket.
- **Payments.** Cash keypad with change, card, and pay-later tabs. A manager PIN approves discounts and voids. Shifts track the cash drawer and print a Z report.
- **Printing.** Bluetooth (Chrome on Android), the RawBT app, or the normal print dialog. Prints receipts with points, kitchen tickets, and opens the cash drawer.

### Kitchen display & rider app
- **Kitchen display:** New → In the oven → Ready, with timers and combo items spelled out.
- **Rider app:** maps link, call button, collect cash, mark delivered.

### Back-office (admin)
- **Dashboard:** sales, profit, where today's money goes, low stock, best sellers.
- **Automatic stock.** Every sale deducts exact recipe grams: dough, every topping portion by size, boxes, cups, wraps, bags. **Combos and free reward items deduct stock too.**
- **Sectors & money:** food cost, packaging, royalty, charity, delivery fees, Uber/PickMe fee and profit, per day and as running balances, with payouts.
- **Menu.**
  - Products, sizes, prices, recipes with live cost and profit.
  - **Combo editor** (choices, options, top-ups).
  - **Photo upload** for each item and category tile. Photos are resized and compressed automatically, and the drawing is used until a photo is added.
  - Serving hours and the veg flag.
- **Other pages.**
  - Pizza builder grams and prices per size
  - Purchases with weighted-average costing
  - Suppliers
  - Wastage
  - **Homepage banners**
  - **Customers & rewards** (rewards menu, add or remove points with a reason)
  - Promo codes
  - Delivery areas
  - Printable table QR codes
  - Staff PINs and shifts
  - **Receipt designer**
  - Settings (hours, ordering, points rules)

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
| Mini sub & sandwich recipes | Admin → Menu → each item | 70g meat, 15g sauce, 20g mayo per 8" sub; sub roll Rs 70 |
| Combo deals & top-ups | Admin → Menu → Hungry Deals | Suggested: Solo Hungry 1,490 · Couple's 2,750 · Family Feast 4,790 · Sub Squad 1,690 · Detroit Duo 2,590 |
| Rewards menu & bonuses | Admin → Customers & rewards / Settings | 150–1,650 pts; welcome 100; birthday 200 |
| Veg topping extra prices | Pizza builder | Rs 80 (peppers/capsicum), Rs 60 (onion) on 1P |
| Custom-pizza base price | Sizes | Set so base + 1 sauce + 1 cheese = your Margherita price |
| Detroit royalty/charity | Sizes | Rs 100 / 50 |
| Food photos | Admin → Menu → each item → Upload photo | The site shows drawn art until you add photos |
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
5. **Order notifications:** generate keys once with `npx web-push generate-vapid-keys` and set `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` (e.g. `mailto:you@example.com`).
6. **Daily points job:** set `CRON_SECRET` to a long random string. `vercel.json` already schedules `/api/cron/daily` every night, which expires old points and gives birthday bonuses.
7. **PayHere:** create a merchant account and add `hungrybar.lk` as an approved domain. Test with `PAYHERE_SANDBOX="true"`, then switch to `"false"`.
8. **Tablet POS:** use an Android tablet with **Chrome**.
   - Open `https://hungrybar.lk/pos`, then ⋮ → **Add to Home screen**, so it opens full-screen like an app.
   - Turn the 80mm printer on and tap 🖨️ **Connect printer**.
   - If your printer doesn't show up, it's Bluetooth-Classic-only. Install **RawBT** from the Play Store, pair the printer in RawBT, and choose "RawBT app" in the POS printer menu.
   - Most 80mm printers with an RJ11 cash-drawer port will pop the drawer on cash sales.
9. **Kitchen screen:** any phone, tablet or smart TV browser → `/kitchen`, logged in with the Kitchen PIN.
10. **Table QR codes:** Admin → Delivery & tables → **Print QR cards**, then stick them on the tables.
11. **Change all PINs**, do a stock count (Stock → Adjust → Physical count), and check the placeholder numbers above.

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
