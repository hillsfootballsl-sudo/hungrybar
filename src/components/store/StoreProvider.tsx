"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { lineKey, priceLine } from "@/lib/pricing";
import type { HoursSettings, RewardsSettings, ShopSettings } from "@/lib/settings";
import type { CartLine, Catalog, PricedLine } from "@/lib/types";

export type OrderMode = "DELIVERY" | "TAKEAWAY" | "DINE_IN";
export interface Zone { id: string; name: string; fee: number; eta: number }
export interface ModeState { type: OrderMode | null; zoneId: string | null; tableToken: string | null; tableLabel: string | null; when: string } // when: "ASAP" | ISO
export interface Me {
  id: string; phone: string; name: string | null; email: string | null; birthday: string | null; anniversary: string | null;
  addresses: { label: string; address: string; landmark?: string; zoneId?: string }[]; favourites: string[]; points: number; totalOrders: number;
}
export interface StoreConfig {
  shop: ShopSettings; hours: HoursSettings; rewards: RewardsSettings; zones: Zone[]; payhere: boolean; vapidKey: string | null; accepting: boolean; prepMinutes: number;
}
type Customise = { productId?: string; sizeId?: string; editKey?: string; line?: CartLine } | null;

type CartAction =
  | { t: "load"; lines: CartLine[] }
  | { t: "add"; line: Omit<CartLine, "key"> }
  | { t: "replace"; key: string; line: Omit<CartLine, "key"> }
  | { t: "qty"; key: string; qty: number }
  | { t: "clear" };

function cartReducer(lines: CartLine[], a: CartAction): CartLine[] {
  switch (a.t) {
    case "load":
      return a.lines;
    case "add": {
      const key = lineKey(a.line);
      const ex = !a.line.rewardId && lines.find((l) => l.key.split("#")[0] === key && (l.note ?? "") === (a.line.note ?? ""));
      if (ex) return lines.map((l) => (l === ex ? { ...l, quantity: Math.min(50, l.quantity + a.line.quantity) } : l));
      return [...lines, { ...a.line, key: key + "#" + Math.random().toString(36).slice(2, 8) }];
    }
    case "replace":
      return lines.map((l) => (l.key === a.key ? { ...a.line, key: lineKey(a.line) + "#" + Math.random().toString(36).slice(2, 8) } : l));
    case "qty":
      return a.qty <= 0 ? lines.filter((l) => l.key !== a.key) : lines.map((l) => (l.key === a.key ? { ...l, quantity: Math.min(50, a.qty) } : l));
    case "clear":
      return [];
  }
}

const read = <T,>(k: string, d: T): T => {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : d;
  } catch {
    return d;
  }
};
const write = (k: string, v: unknown) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
};

interface Store {
  catalog: Catalog;
  config: StoreConfig;
  ready: boolean;
  // cart
  lines: CartLine[];
  priced: PricedLine[];
  count: number;
  subtotal: number;
  pointsInCart: number;
  add: (l: Omit<CartLine, "key">, opts?: { silent?: boolean }) => void;
  replace: (key: string, l: Omit<CartLine, "key">) => void;
  setQty: (key: string, qty: number) => void;
  clear: () => void;
  // order mode
  mode: ModeState;
  setMode: (m: Partial<ModeState>) => void;
  zone: Zone | null;
  // account
  me: Me | null | undefined;
  refreshMe: () => Promise<void>;
  logout: () => Promise<void>;
  favourites: string[];
  toggleFavourite: (productId: string) => void;
  // ui
  cartOpen: boolean;
  setCartOpen: (v: boolean) => void;
  locationOpen: boolean;
  openLocation: (after?: () => void) => void;
  closeLocation: (done: boolean) => void;
  loginOpen: boolean;
  openLogin: (after?: () => void) => void;
  closeLogin: (done: boolean) => void;
  customise: Customise;
  openCustomise: (c: Customise) => void;
  combo: { productId: string; editKey?: string; line?: CartLine } | null;
  openCombo: (c: { productId: string; editKey?: string; line?: CartLine } | null) => void;
  toast: string | null;
  showToast: (msg: string) => void;
  /** Run an action that needs delivery/pickup chosen first */
  requireMode: (fn: () => void) => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ catalog, config, children }: { catalog: Catalog; config: StoreConfig; children: React.ReactNode }) {
  const [lines, dispatch] = useReducer(cartReducer, []);
  const [mode, setModeState] = useState<ModeState>({ type: null, zoneId: null, tableToken: null, tableLabel: null, when: "ASAP" });
  const [ready, setReady] = useState(false);
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [localFavs, setLocalFavs] = useState<string[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [customise, setCustomise] = useState<Customise>(null);
  const [combo, setCombo] = useState<Store["combo"]>(null);
  const [toast, setToast] = useState<string | null>(null);
  const afterLocation = useRef<(() => void) | null>(null);
  const afterLogin = useRef<(() => void) | null>(null);

  useEffect(() => {
    dispatch({ t: "load", lines: read<CartLine[]>("hb2_cart", []) });
    setModeState((m) => ({ ...m, ...read<Partial<ModeState>>("hb2_mode", {}), when: "ASAP" }));
    setLocalFavs(read<string[]>("hb2_favs", []));
    setReady(true);
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  useEffect(() => {
    if (ready) write("hb2_cart", lines);
  }, [lines, ready]);
  useEffect(() => {
    if (ready) write("hb2_mode", { ...mode, when: "ASAP" });
  }, [mode, ready]);

  const refreshMe = useCallback(async () => {
    const r = await fetch("/api/me").then((x) => x.json()).catch(() => ({ customer: null }));
    setMe(r.customer ?? null);
  }, []);
  useEffect(() => {
    void refreshMe();
  }, [refreshMe]);

  const logout = useCallback(async () => {
    await fetch("/api/me", { method: "DELETE" });
    setMe(null);
    dispatch({ t: "load", lines: [] });
  }, []);

  const favourites = me ? me.favourites : localFavs;
  const toggleFavourite = useCallback(
    (pid: string) => {
      const next = favourites.includes(pid) ? favourites.filter((x) => x !== pid) : [...favourites, pid];
      if (me) {
        setMe({ ...me, favourites: next });
        void fetch("/api/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ favourites: next }) });
      } else {
        setLocalFavs(next);
        write("hb2_favs", next);
      }
    },
    [favourites, me],
  );

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((t) => (t === msg ? null : t)), 2200);
  }, []);

  const priced = useMemo(() => lines.map((l) => priceLine(catalog, l)), [lines, catalog]);
  const zone = config.zones.find((z) => z.id === mode.zoneId) ?? null;

  const value: Store = {
    catalog,
    config,
    ready,
    lines,
    priced,
    count: lines.reduce((s, l) => s + l.quantity, 0),
    subtotal: priced.reduce((s, p) => s + (p.valid ? p.lineTotal : 0), 0),
    pointsInCart: priced.reduce((s, p) => s + p.points, 0),
    add: (l, opts) => {
      dispatch({ t: "add", line: l });
      if (!opts?.silent) showToast("Added to your cart");
    },
    replace: (key, l) => dispatch({ t: "replace", key, line: l }),
    setQty: (key, qty) => dispatch({ t: "qty", key, qty }),
    clear: () => dispatch({ t: "clear" }),
    mode,
    setMode: (m) => setModeState((x) => ({ ...x, ...m })),
    zone,
    me,
    refreshMe,
    logout,
    favourites,
    toggleFavourite,
    cartOpen,
    setCartOpen,
    locationOpen,
    openLocation: (after) => {
      afterLocation.current = after ?? null;
      setLocationOpen(true);
    },
    closeLocation: (done) => {
      setLocationOpen(false);
      const f = afterLocation.current;
      afterLocation.current = null;
      if (done && f) setTimeout(f, 50);
    },
    loginOpen,
    openLogin: (after) => {
      afterLogin.current = after ?? null;
      setLoginOpen(true);
    },
    closeLogin: (done) => {
      setLoginOpen(false);
      const f = afterLogin.current;
      afterLogin.current = null;
      if (done && f) setTimeout(f, 50);
    },
    customise,
    openCustomise: setCustomise,
    combo,
    openCombo: setCombo,
    toast,
    showToast,
    requireMode: (fn) => {
      if (mode.type && (mode.type !== "DELIVERY" || mode.zoneId)) fn();
      else {
        afterLocation.current = fn;
        setLocationOpen(true);
      }
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useStore outside StoreProvider");
  return c;
}
