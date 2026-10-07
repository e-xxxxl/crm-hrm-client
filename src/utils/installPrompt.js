import { useSyncExternalStore } from "react";

// `beforeinstallprompt` fires once, early in the page's life — usually before
// any React component that wants to offer "Install app" has mounted — so it is
// captured here at module load (imported from main.jsx) and read via the hook.
let deferred = null;
let installed = false;
const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    installed = true;
    emit();
  });
}

const isStandalone = () =>
  typeof window !== "undefined" &&
  (window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true);

const isIos = () =>
  typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;

function snapshot() {
  if (installed || isStandalone()) return "none";
  if (deferred) return "prompt";
  return isIos() ? "ios" : "none";
}

/** "prompt" = native install available, "ios" = needs manual Add to Home Screen, "none" = n/a or already installed. */
export function useInstallState() {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    snapshot,
    () => "none",
  );
}

export async function promptInstall() {
  if (!deferred) return false;
  deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null;
  emit();
  return outcome === "accepted";
}
