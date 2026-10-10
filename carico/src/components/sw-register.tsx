"use client";

import { useEffect } from "react";

/** Registra il service worker solo in produzione (in sviluppo interferirebbe con l'hot reload). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
