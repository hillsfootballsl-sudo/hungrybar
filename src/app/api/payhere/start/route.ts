import { fail, handle, ok } from "@/lib/api";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/env";
import { orderCode } from "@/lib/orders";
import { checkoutHash, payhereConfigured, payhereEndpoint } from "@/lib/payhere";

export const GET = handle(async (req: Request) => {
  const id = new URL(req.url).searchParams.get("order");
  if (!id || !payhereConfigured()) return fail("Card payments unavailable");
  const o = await db.order.findUnique({ where: { id }, include: { customer: true } });
  if (!o || o.paymentMethod !== "PAYHERE") return fail("Order not found", 404);
  if (o.paymentStatus === "PAID") return fail("Already paid");
  const site = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL ? siteUrl() : new URL(req.url).origin;
  const [first, ...rest] = (o.customerName || "Hungry Customer").split(" ");
  return ok({
    action: payhereEndpoint(),
    fields: {
      merchant_id: process.env.PAYHERE_MERCHANT_ID,
      return_url: `${site}/order/${o.id}?paid=1`,
      cancel_url: `${site}/order/${o.id}?cancelled=1`,
      notify_url: `${site}/api/payhere/notify`,
      order_id: o.id,
      items: `Hungry Bar order #${orderCode(o.number)}`,
      currency: "LKR",
      amount: o.total.toFixed(2),
      first_name: first,
      last_name: rest.join(" ") || "-",
      email: o.customer?.email || "orders@hungrybar.lk",
      phone: o.customerPhone || "",
      address: o.address || "Dehiwala",
      city: "Dehiwala",
      country: "Sri Lanka",
      hash: checkoutHash(o.id, o.total),
    },
  });
});
