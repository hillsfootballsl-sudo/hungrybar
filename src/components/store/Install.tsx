"use client";
import { useCallback, useEffect, useState } from "react";
import { Icon, Sheet } from "./ui";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const state: { deferred: BIPEvent | null; iosHelp: boolean } = { deferred: null, iosHelp: false };
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    state.deferred = e as BIPEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    state.deferred = null;
    emit();
  });
}

export function isStandalone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
}
export function isIos() {
  return typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/** Install-the-app support: Android/Chrome uses the native prompt; iPhone gets instructions. */
export function useInstall() {
  const [, force] = useState(0);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const f = () => force((x) => x + 1);
    subs.add(f);
    setMounted(true);
    return () => {
      subs.delete(f);
    };
  }, []);
  const canShow = mounted && !isStandalone() && (!!state.deferred || isIos());
  const prompt = useCallback(async () => {
    if (state.deferred) {
      await state.deferred.prompt();
      await state.deferred.userChoice.catch(() => null);
      state.deferred = null;
      emit();
    } else if (isIos()) {
      state.iosHelp = true;
      emit();
    }
  }, []);
  return { canShow, prompt, iosHelp: state.iosHelp };
}

/** Small "get the app" bar on phones + iPhone instructions sheet */
export function InstallBanner() {
  const i = useInstall();
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = localStorage.getItem("hb2_install_dismissed") === "1";
    } catch {}
    const t = setTimeout(() => setHidden(dismissed), 4000);
    return () => clearTimeout(t);
  }, []);
  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem("hb2_install_dismissed", "1");
    } catch {}
  };
  return (
    <>
      {i.canShow && !hidden && (
        <div className="fixed inset-x-3 bottom-[calc(76px+env(safe-area-inset-bottom,0px))] z-40 mx-auto flex max-w-xl items-center gap-3 rounded-2xl bg-char p-3 text-white shadow-2xl lg:hidden">
          <img src="/icons/icon-192.png" alt="" className="h-11 w-11 rounded-xl bg-white" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">Get the Hungry Bar app</p>
            <p className="text-xs text-white/70">Faster ordering & order alerts</p>
          </div>
          <button onClick={() => { void i.prompt(); dismiss(); }} className="btn-mustard btn-sm">Install</button>
          <button onClick={dismiss} className="p-1 text-white/60" aria-label="Dismiss">
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>
      )}
      <Sheet open={i.iosHelp} onClose={() => { state.iosHelp = false; emit(); }} label="Install on iPhone">
        <h2 className="h-title">Add Hungry Bar to your iPhone</h2>
        <ol className="mt-4 space-y-3 text-char-600">
          <li className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-tomato font-bold text-white">1</span>Open this page in <b>Safari</b>.</li>
          <li className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-tomato font-bold text-white">2</span><span>Tap the <b>Share</b> button <Icon name="share" className="inline h-4 w-4" /> at the bottom.</span></li>
          <li className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-tomato font-bold text-white">3</span>Choose <b>Add to Home Screen</b>, then <b>Add</b>.</li>
        </ol>
        <p className="mt-4 text-sm text-char-400">Hungry Bar then opens full-screen like an app.</p>
      </Sheet>
    </>
  );
}
