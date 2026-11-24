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
  email: string;
}

export interface HoursSettings {
  open: string; // "16:00"
  close: string; // "24:00"
  note: string;
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

export interface RewardsSettings {
  enabled: boolean;
  programName: string;
  pointName: string;
  rupeesPerPoint: number; // spend Rs X → earn 1 point
  expiryMonths: number;
  welcomeBonus: number; // after the first completed order
  birthdayBonus: number;
  anniversaryBonus: number;
  bonusValidDays: number;
  bonusDaysBefore: number;
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
  showPoints: boolean;
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
    email: "",
  } as ShopSettings,
  hours: { open: "16:00", close: "24:00", note: "Open daily, 4pm till midnight" } as HoursSettings,
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
  rewards: {
    enabled: true,
    programName: "Hungry Rewards",
    pointName: "Hungry Points",
    rupeesPerPoint: 10,
    expiryMonths: 6,
    welcomeBonus: 100,
    birthdayBonus: 200,
    anniversaryBonus: 200,
    bonusValidDays: 30,
    bonusDaysBefore: 7,
  } as RewardsSettings,
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
    showPoints: true,
    showQr: true,
    qrText: "https://hungrybar.lk",
    footerLines: ["Thank you! Come hungry again :)", "Earn Hungry Points on every order", "IG @hungrybar.sl"],
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
  const [shop, hours, orders, rewards, receipt] = await Promise.all([
    getSetting("shop"),
    getSetting("hours"),
    getSetting("orders"),
    getSetting("rewards"),
    getSetting("receipt"),
  ]);
  return { shop, hours, orders, rewards, receipt };
}
