"use client";
import { useCallback, useEffect, useState } from "react";
import type { Ticket } from "@/lib/orderView";
import { bluetoothSupported, connectBluetooth, getMode, onPrinterChange, type PrintMode, printerState, printOps, setMode } from "@/lib/printer";
import { kotOps, receiptOps } from "@/lib/receipt";
import type { ReceiptTemplate, ShopSettings } from "@/lib/settings";

export interface PrintConfig {
  receipt: ReceiptTemplate;
  shop: ShopSettings;
  pointName: string;
}

export function usePrinter(cfg: PrintConfig, toast: (msg: string, bad?: boolean) => void) {
  const [state, setState] = useState(() => ({ ...printerState(), mode: "bluetooth" as PrintMode }));
  useEffect(() => {
    const upd = () => setState({ ...printerState(), mode: getMode() });
    upd();
    const off = onPrinterChange(upd);
    return () => {
      off();
    };
  }, []);

  const run = useCallback(
    async (fn: () => Promise<void>) => {
      try {
        await fn();
      } catch (e) {
        toast(`Printer: ${(e as Error).message}`, true);
      }
    },
    [toast],
  );

  const printReceipt = useCallback(
    (t: Ticket, opts: { drawer?: boolean } = {}) =>
      run(() =>
        printOps(receiptOps(t, cfg.receipt, cfg.shop, { pointName: cfg.pointName, openDrawer: opts.drawer }), {
          paperWidth: cfg.receipt.paperWidth,
          logoWidth: cfg.receipt.logoWidth,
          copies: cfg.receipt.copies,
        }),
      ),
    [cfg, run],
  );
  const printKot = useCallback((t: Ticket) => run(() => printOps(kotOps(t), { paperWidth: cfg.receipt.paperWidth, logoWidth: 0 })), [cfg, run]);
  const connect = useCallback(
    () =>
      run(async () => {
        const name = await connectBluetooth();
        toast(`Connected to ${name}`);
      }),
    [run, toast],
  );
  return { state, printReceipt, printKot, connect, setMode, supported: bluetoothSupported() };
}

export function PrinterControl({ printer }: { printer: ReturnType<typeof usePrinter> }) {
  const [open, setOpen] = useState(false);
  const { state } = printer;
  const ok = state.mode !== "bluetooth" || state.connected;
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold ${ok ? "bg-white/10" : "animate-pulse bg-tomato"}`}>
        🖨️ {state.mode === "bluetooth" ? (state.connected ? state.name ?? "Printer" : "Connect printer") : state.mode === "rawbt" ? "RawBT" : "Browser print"}
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-72 rounded-xl border border-char-100 bg-white p-4 text-char shadow-2xl">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-char-400">Print using</p>
          {(
            [
              ["bluetooth", "Bluetooth (BLE)", "Chrome on Android → printer directly"],
              ["rawbt", "RawBT app", "For classic Bluetooth printers (install RawBT)"],
              ["browser", "Print dialog", "USB / Wi-Fi printers"],
            ] as const
          ).map(([m, t, d]) => (
            <label key={m} className="mb-2 flex cursor-pointer gap-2 rounded-lg p-2 hover:bg-cream-100">
              <input type="radio" checked={state.mode === m} onChange={() => printer.setMode(m)} className="mt-1 accent-tomato" />
              <span>
                <span className="block text-sm font-bold">{t}</span>
                <span className="text-xs text-char-400">{d}</span>
              </span>
            </label>
          ))}
          {state.mode === "bluetooth" && (
            <button disabled={!printer.supported} onClick={() => { void printer.connect(); setOpen(false); }} className="btn-primary mt-2 w-full">
              {printer.supported ? (state.connected ? "Reconnect / change" : "Find printer") : "Bluetooth not supported here"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
