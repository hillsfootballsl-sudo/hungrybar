// Shared types used by both the browser (builder, POS, cart) and the server.

export type ToppingGroup = "SAUCE" | "CHEESE" | "MEAT" | "VEG" | "EXTRA";

export interface CatSize {
  id: string;
  name: string;
  short: string;
  persons: number;
  shape: "ROUND" | "RECT";
  doughGrams: number;
  basePrice: number;
  inBuilder: boolean;
  sortOrder: number;
}

export interface CatCrust {
  id: string;
  name: string;
  description: string | null;
  extraPrice: number;
}

export interface CatTopping {
  id: string;
  name: string;
  group: ToppingGroup;
  visual: string;
  maxPortions: number;
  unitLabel: string;
  isVeg: boolean;
  /** per size: grams per portion + price per portion */
  sizes: Record<string, { grams: number; price: number }>;
}

export interface CatCategory {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  icon: string | null;
  availableFrom: string;
  availableTo: string;
}

export interface CatVariant {
  id: string;
  name: string;
  sizeId: string | null;
  price: number;
}

export interface CatProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  categoryId: string;
  kind: "PIZZA" | "ITEM";
  art: string | null;
  image: string | null;
  tags: string[];
  featured: boolean;
  variants: CatVariant[];
  /** preset toppings for pizzas: toppingId -> portions */
  toppings: Record<string, number>;
}

export interface CatAddon {
  id: string;
  name: string;
  price: number;
  categoryId: string;
}

export interface Catalog {
  sizes: CatSize[];
  crusts: CatCrust[];
  toppings: CatTopping[];
  categories: CatCategory[];
  products: CatProduct[];
  addons: CatAddon[];
}

/** A line in the cart / POS ticket. Prices are always recomputed from the catalog. */
export interface CartLine {
  key: string;
  kind: "PIZZA" | "ITEM";
  productId?: string; // undefined => fully custom pizza
  variantId?: string; // for ITEM (and resolved for preset pizzas)
  sizeId?: string;
  crustId?: string;
  toppings?: Record<string, number>; // full composition (toppingId -> portions)
  addons?: Record<string, number>; // addonId -> qty
  quantity: number;
  note?: string;
}

export interface PricedLine {
  line: CartLine;
  name: string;
  sizeName?: string;
  crustName?: string;
  unitPrice: number;
  lineTotal: number;
  basePrice: number; // price before extras (used for loyalty reward)
  summary: string; // "+ Chicken · No Onion"
  valid: boolean;
  error?: string;
}

export type OrderTypeT = "DELIVERY" | "TAKEAWAY" | "DINE_IN";
export type ChannelT = "WEB" | "QR" | "POS" | "UBER" | "PICKME";
export type PaymentMethodT = "CASH" | "CARD" | "PAYHERE" | "UBER" | "PICKME";
export type OrderStatusT =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "OUT_FOR_DELIVERY"
  | "COMPLETED"
  | "CANCELLED";

export const GROUP_LABEL: Record<ToppingGroup, string> = {
  SAUCE: "Sauce",
  CHEESE: "Cheese",
  MEAT: "Meats",
  VEG: "Veggies",
  EXTRA: "Extras",
};
