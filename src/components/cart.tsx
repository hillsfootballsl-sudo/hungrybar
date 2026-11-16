"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from "react";
import { lineKey } from "@/lib/pricing";
import type { CartLine } from "@/lib/types";

interface CartState {
  lines: CartLine[];
  tableToken: string | null;
  tableLabel: string | null;
}
type Action =
  | { t: "load"; s: CartState }
  | { t: "add"; line: Omit<CartLine, "key"> }
  | { t: "replace"; key: string; line: Omit<CartLine, "key"> }
  | { t: "qty"; key: string; qty: number }
  | { t: "remove"; key: string }
  | { t: "clear" }
  | { t: "table"; token: string | null; label: string | null };

function reducer(s: CartState, a: Action): CartState {
  switch (a.t) {
    case "load":
      return a.s;
    case "add": {
      const key = lineKey(a.line);
      const ex = s.lines.find((l) => l.key === key && (l.note ?? "") === (a.line.note ?? ""));
      if (ex) return { ...s, lines: s.lines.map((l) => (l === ex ? { ...l, quantity: Math.min(50, l.quantity + a.line.quantity) } : l)) };
      return { ...s, lines: [...s.lines, { ...a.line, key: key + "#" + Date.now().toString(36) }] };
    }
    case "replace":
      return { ...s, lines: s.lines.map((l) => (l.key === a.key ? { ...a.line, key: lineKey(a.line) + "#" + Date.now().toString(36) } : l)) };
    case "qty":
      return { ...s, lines: a.qty <= 0 ? s.lines.filter((l) => l.key !== a.key) : s.lines.map((l) => (l.key === a.key ? { ...l, quantity: Math.min(50, a.qty) } : l)) };
    case "remove":
      return { ...s, lines: s.lines.filter((l) => l.key !== a.key) };
    case "clear":
      return { ...s, lines: [] };
    case "table":
      return { ...s, tableToken: a.token, tableLabel: a.label };
  }
}

const STORE = "hb_cart_v1";
const Ctx = createContext<null | {
  lines: CartLine[];
  count: number;
  tableToken: string | null;
  tableLabel: string | null;
  ready: boolean;
  open: boolean;
  setOpen: (v: boolean) => void;
  bump: number;
  add: (l: Omit<CartLine, "key">) => void;
  replace: (key: string, l: Omit<CartLine, "key">) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  setTable: (token: string | null, label: string | null) => void;
}>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { lines: [], tableToken: null, tableLabel: null });
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [bump, setBump] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) dispatch({ t: "load", s: { lines: [], tableToken: null, tableLabel: null, ...JSON.parse(raw) } });
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORE, JSON.stringify(state));
    } catch {}
  }, [state, ready]);

  const add = useCallback((line: Omit<CartLine, "key">) => {
    dispatch({ t: "add", line });
    setBump((b) => b + 1);
  }, []);
  const value = useMemo(
    () => ({
      lines: state.lines,
      count: state.lines.reduce((s, l) => s + l.quantity, 0),
      tableToken: state.tableToken,
      tableLabel: state.tableLabel,
      ready,
      open,
      setOpen,
      bump,
      add,
      replace: (key: string, line: Omit<CartLine, "key">) => dispatch({ t: "replace", key, line }),
      setQty: (key: string, qty: number) => dispatch({ t: "qty", key, qty }),
      remove: (key: string) => dispatch({ t: "remove", key }),
      clear: () => dispatch({ t: "clear" }),
      setTable: (token: string | null, label: string | null) => dispatch({ t: "table", token, label }),
    }),
    [state, ready, open, bump, add],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart outside CartProvider");
  return c;
}
