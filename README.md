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
- A daily job (a Cloudflare scheduled trigger, 6:00 am Sri Lanka time) expires old points and drops birthday bonuses.

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

## Going live on Cloudflare + Supabase (step by step)

Your setup: **hungrybar.lk registered at the LK Domain Registry → nameservers on Cloudflare → the app runs on Cloudflare Workers → data in Supabase.** Everything deploys straight from GitHub.

### 1. Supabase (the database)
1. supabase.com → **New project** → region **South Asia (Mumbai)** → set a strong database password using **only letters and numbers** (symbols like `@ # /` break the connection string).
2. When it's ready click **Connect** and copy two strings (replace `[YOUR-PASSWORD]` in both):
   - **Transaction pooler** (port **6543**) → this is `DATABASE_URL`
   - **Session pooler** (port **5432**) → this is `DIRECT_URL`

### 2. Cloudflare Worker (the app)
1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Import a repository** → choose GitHub → `hungrybar`.
2. **Project name: `hungrybar`** (must match `wrangler.jsonc`). Production branch: `claude/funny-faraday-14ka3e` (the repo's default branch).
3. Build settings:
   - **Build command:** `npm run cf:build`
   - **Deploy command:** `npx opennextjs-cloudflare deploy`
4. **Build variables** (used while building — creates the tables and loads the menu on the first deploy):
   - `DATABASE_URL`, `DIRECT_URL`
5. Click **Deploy**. When it finishes you get a `hungrybar.<your-account>.workers.dev` address.
6. **Settings → Variables and Secrets** (used while the site runs) — add, then redeploy:

Text variables added here are kept on every GitHub deploy (`keep_vars` in `wrangler.jsonc`).

| Name | Type | Value |
|---|---|---|
| `DATABASE_URL` | Secret | the port-6543 string |
| `AUTH_SECRET` | Secret | any long random text (40+ characters) |
| `CRON_SECRET` | Secret | another long random text |
| `SITE_URL` | Text | `https://hungrybar.lk` |
| `SMS_PROVIDER` | Text | `console` until SMS is set up |
| `OTP_TEST_MODE` | Text | `true` **only** for a private trial (shows login codes on screen — remove before going public) |

### 3. Connect hungrybar.lk
1. In Cloudflare **DNS → Records**, delete any old `A`, `AAAA` or `CNAME` records for `hungrybar.lk` and `www` (keep email `MX`/`TXT` records).
2. Worker → **Settings → Domains & Routes → Add → Custom domain** → `hungrybar.lk`. Repeat for `www.hungrybar.lk`.
   Cloudflare creates the DNS records and the HTTPS certificate itself — usually live within minutes.

### 4. First things on the live site
1. `hungrybar.lk/staff/login` → Owner PIN **1234** → Admin → Staff → **change every PIN**.
2. **SMS login codes:** [notify.lk](https://notify.lk) or [text.lk](https://text.lk) account + sender ID (e.g. `HungryBar`) → add `SMS_PROVIDER` (`notifylk`/`textlk`) and its keys as variables/secrets.
3. **Order notifications:** run `npx web-push generate-vapid-keys` once on any computer with Node.js, then add `VAPID_PUBLIC_KEY` (text), `VAPID_PRIVATE_KEY` (secret), `VAPID_SUBJECT` (`mailto:you@example.com`).
4. **PayHere:** merchant account → add `hungrybar.lk` as an approved domain → add `PAYHERE_MERCHANT_ID`, `PAYHERE_MERCHANT_SECRET` (secret), `PAYHERE_SANDBOX` (`true` to test, `false` for real money).
5. **Tablet POS:** Android tablet → Chrome → `hungrybar.lk/pos` → ⋮ → **Add to Home screen** → turn on the 80mm printer → 🖨️ **Connect printer** (or the RawBT app for Bluetooth-Classic printers).
6. **Kitchen screen:** any screen → `hungrybar.lk/kitchen` (Kitchen PIN).
7. **Table QR codes:** Admin → Delivery & tables → **Print QR cards**.
8. Do a stock count (Stock → Adjust → Physical count) and check the placeholder numbers above.

Every push to the GitHub branch redeploys automatically. The nightly points job runs on its own (see `triggers` in `wrangler.jsonc`).

**Plans & cost:** Supabase Free is enough to start (Pro $25/month when you grow). Cloudflare **Workers Free** allows only 10 ms of CPU per request. Measured in Cloudflare's runtime, this app needs about 15 ms for a simple API call and 50–100 ms to render a page or check a staff PIN, so on the free plan visitors and staff would often see *error 1102 (Worker exceeded resource limits)*. Use **Workers Paid ($5/month)** for the live shop: 30 s of CPU per request, with 10 million requests a month included. You can deploy on Free first and upgrade later under Workers & Pages → Plans; nothing in the code or settings changes. The app is about 2.6 MB compressed, under both plans' size limits (3 MB Free, 10 MB Paid).

**Test it on your own computer in Cloudflare's runtime:** create `.dev.vars` with `DATABASE_URL`, `AUTH_SECRET` (see `.env.example`), then `npm run cf:preview`.

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
