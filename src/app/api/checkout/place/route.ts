import { z } from "zod";
import { fail, handle, ok } from "@/lib/api";
import { getCustomer } from "@/lib/auth";
import { unavailableAt } from "@/lib/availability";
import { loadCatalog } from "@/lib/catalog";
import { db } from "@/lib/db";
import { createOrder } from "@/lib/orders";
import { payhereConfigured } from "@/lib/payhere";
import { linesSchema } from "@/lib/schemas";
import { getSetting } from "@/lib/settings";

const schema = z.object({
  lines: linesSchema,
  type: z.enum(["DELIVERY", "TAKEAWAY", "DINE_IN"]),
  zoneId: z.string().max(40).nullish(),
  address: z.string().max(300).nullish(),
  landmark: z.string().max(200).nullish(),
  lat: z.number().min(-90).max(90).nullish(),
  lng: z.number().min(-180).max(180).nullish(),
  tableToken: z.string().max(40).nullish(),
  scheduledFor: z.string().datetime().nullish(),
  promoCode: z.string().max(30).nullish(),
  redeemLoyalty: z.boolean().optional(),
  paymentMethod: z.enum(["CASH", "PAYHERE"]),
  name: z.string().min(1, "Please tell us your name").max(60),
  note: z.string().max(300).nullish(),
});

export const POST = handle(async (req: Request) => {
  const body = schema.parse(await req.json());
  const settings = await getSetting("orders");
  if (!settings.acceptingOnline) return fail("We're not taking online orders right now — please call us!");

  const customer = await getCustomer();
  let tableId: string | null = null;
  if (body.type === "DINE_IN") {
    const table = body.tableToken ? await db.diningTable.findUnique({ where: { token: body.tableToken } }) : null;
    if (!table || !table.active) return fail("Scan the QR code on your table to order for dine-in");
    tableId = table.id;
  } else if (!customer) {
    return fail("Please verify your phone number to place the order", 401);
  }
  if (body.type === "DELIVERY" && !body.address?.trim()) return fail("Please add your delivery address");
  if (body.paymentMethod === "PAYHERE" && !payhereConfigured()) return fail("Card payments aren't available yet — please choose cash");

  // Opening hours
  const catalog = await loadCatalog();
  let when = new Date();
  if (body.scheduledFor) {
    when = new Date(body.scheduledFor);
    if (when.getTime() < Date.now() - 5 * 60_000) return fail("Pick a time in the future");
    if (when.getTime() > Date.now() + 3 * 86400_000) return fail("You can schedule up to 3 days ahead");
  }
  const closed = unavailableAt(catalog, body.lines, when);
  if (closed.length) return fail(`${closed.join(", ")} ${closed.length > 1 ? "aren't" : "isn't"} available at that time — check our hours or schedule for later`);

  if (customer && body.name && !customer.name) await db.customer.update({ where: { id: customer.id }, data: { name: body.name } });

  const order = await createOrder({
    channel: body.type === "DINE_IN" ? "QR" : "WEB",
    type: body.type,
    lines: body.lines,
    customerId: customer?.id ?? null,
    customerName: body.name,
    customerPhone: customer?.phone ?? null,
    zoneId: body.zoneId ?? null,
    address: body.address ?? null,
    landmark: body.landmark ?? null,
    lat: body.lat ?? null,
    lng: body.lng ?? null,
    tableId,
    scheduledFor: body.scheduledFor ? when : null,
    promoCode: body.promoCode ?? null,
    redeemLoyalty: !!body.redeemLoyalty && !!customer,
    paymentMethod: body.paymentMethod,
    paid: false,
    note: body.note ?? null,
  });
  return ok({ id: order.id, number: order.number, total: order.total, pay: body.paymentMethod === "PAYHERE" });
});
