import { z } from "zod";

const pickSchema = z.object({
  slotId: z.string().max(40),
  productId: z.string().max(40),
  sizeId: z.string().max(40).optional(),
  variantId: z.string().max(40).optional(),
  crustId: z.string().max(40).optional(),
  toppings: z.record(z.string(), z.number().int().min(0).max(10)).optional(),
});

export const cartLineSchema = z.object({
  key: z.string().max(600),
  kind: z.enum(["PIZZA", "ITEM", "COMBO"]),
  picks: z.array(pickSchema).max(20).optional(),
  rewardId: z.string().max(40).optional(),
  productId: z.string().max(40).optional(),
  variantId: z.string().max(40).optional(),
  sizeId: z.string().max(40).optional(),
  crustId: z.string().max(40).optional(),
  toppings: z.record(z.string(), z.number().int().min(0).max(10)).optional(),
  addons: z.record(z.string(), z.number().int().min(0).max(10)).optional(),
  quantity: z.number().int().min(1).max(50),
  note: z.string().max(200).optional(),
});

export const linesSchema = z.array(cartLineSchema).min(1, "Your cart is empty").max(60);
