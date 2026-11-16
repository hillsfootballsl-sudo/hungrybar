import { db } from "./db";

export interface ShopSettings {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  whatsapp: string; // digits only, e.g. 94701414516
  instagram: string;
  facebook: string;
  mapUrl: string;
  halal: boolean;
  since: string;
}

export interface HoursSettings {
  cafe: { open: string; close: string; label: string };
  pizza: { open: string; close: string; label: string };
}

export interface OrderSettings {
  acceptingOnline: boolean;
  autoAcceptWeb: boolean;
  bagIngredientId: string | null;
  bagsPerOrder: number;
  platformCommission: { UBER: number; PICKME: number }; // percent
  ownerAlertPhone: string;
  prepMinutes: number;
  freeDeliveryNote: string;
}

export interface LoyaltySettings {
  enabled: boolean;
  stampsRequired: number;
  rewardSizeId: string | null;
}

export interface ReceiptTemplate {
  paperWidth: 58 | 80;
  showLogo: boolean;
  logoWidth: number; // dots
  headerLines: string[];
  showAddress: boolean;
  showPhone: boolean;
  showOrderType: boolean;
  showCustomer: boolean;
  showCashier: boolean;
  showModifiers: boolean;
  showLoyalty: boolean;
  showQr: boolean;
  qrText: string;
  footerLines: string[];
  largeTotal: boolean;
  printKot: boolean;
  autoPrint: boolean;
  copies: number;
}

export const DEFAULTS = {
  shop: {
    name: "Hungry Bar",
    tagline: "Fresh · Hot · Hand-tossed Halal Pizzas",
    address: "Hill Food Square, Dehiwala",
    phone: "+94 70 1414 516",
    whatsapp: "94701414516",
    instagram: "hungrybar.sl",
    facebook: "",
    mapUrl: "https://maps.google.com/?q=Hill+Food+Square+Dehiwala",
    halal: true,
    since: "2021",
  } as ShopSettings,
  hours: {
    cafe: { open: "06:00", close: "22:00", label: "Breakfast · Lunch · Dinner — paninis & fresh juices" },
    pizza: { open: "11:00", close: "24:00", label: "Pizza oven" },
  } as HoursSettings,
  orders: {
    acceptingOnline: true,
    autoAcceptWeb: false,
    bagIngredientId: null,
    bagsPerOrder: 1,
    platformCommission: { UBER: 30, PICKME: 25 },
    ownerAlertPhone: "",
    prepMinutes: 20,
    freeDeliveryNote: "Free delivery around Dehiwala",
  } as OrderSettings,
  loyalty: { enabled: true, stampsRequired: 10, rewardSizeId: null } as LoyaltySettings,
  receipt: {
    paperWidth: 80,
    showLogo: true,
    logoWidth: 300,
    headerLines: ["HUNGRY BAR", "Fresh . Hot . Hand-tossed", "100% HALAL"],
    showAddress: true,
    showPhone: true,
    showOrderType: true,
    showCustomer: true,
    showCashier: true,
    showModifiers: true,
    showLoyalty: true,
    showQr: true,
    qrText: "https://hungrybar.lk",
    footerLines: ["Thank you! Come hungry again :)", "Every 10th order = FREE pizza", "IG @hungrybar.sl"],
    largeTotal: true,
    printKot: true,
    autoPrint: true,
    copies: 1,
  } as ReceiptTemplate,
};

export type SettingKey = keyof typeof DEFAULTS;

export async function getSetting<K extends SettingKey>(key: K): Promise<(typeof DEFAULTS)[K]> {
  const row = await db.setting.findUnique({ where: { key } });
  return { ...DEFAULTS[key], ...((row?.value as object) ?? {}) } as (typeof DEFAULTS)[K];
}

export async function setSetting<K extends SettingKey>(key: K, value: (typeof DEFAULTS)[K]) {
  await db.setting.upsert({
    where: { key },
    create: { key, value: value as object },
    update: { value: value as object },
  });
}

export async function getAllSettings() {
  const [shop, hours, orders, loyalty, receipt] = await Promise.all([
    getSetting("shop"),
    getSetting("hours"),
    getSetting("orders"),
    getSetting("loyalty"),
    getSetting("receipt"),
  ]);
  return { shop, hours, orders, loyalty, receipt };
}
