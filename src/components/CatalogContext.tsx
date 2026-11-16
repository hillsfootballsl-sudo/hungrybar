"use client";
import { createContext, useContext } from "react";
import type { Catalog } from "@/lib/types";

const Ctx = createContext<Catalog | null>(null);
export function CatalogProvider({ catalog, children }: { catalog: Catalog; children: React.ReactNode }) {
  return <Ctx.Provider value={catalog}>{children}</Ctx.Provider>;
}
export function useCatalog() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCatalog outside provider");
  return c;
}
