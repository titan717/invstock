"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function PwaSupport() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [updateReady, setUpdateReady] = useState(false);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    setOffline(!navigator.onLine);
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => setInstallPrompt(null);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("beforeinstallprompt", onInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    let registration: ServiceWorkerRegistration | undefined;
    let disposed = false;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").then((result) => {
        if (disposed) return;
        registration = result;
        if (result.waiting && navigator.serviceWorker.controller) setUpdateReady(true);
        result.addEventListener("updatefound", () => {
          const installing = result.installing;
          installing?.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) setUpdateReady(true);
          });
        });
        void result.update();
      }).catch(() => {
        // The app remains usable if service-worker registration is unavailable.
      });
    }

    const onControllerChange = () => window.location.reload();
    navigator.serviceWorker?.addEventListener("controllerchange", onControllerChange);

    return () => {
      disposed = true;
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("beforeinstallprompt", onInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      navigator.serviceWorker?.removeEventListener("controllerchange", onControllerChange);
      void registration;
    };
  }, []);

  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  const update = () => {
    navigator.serviceWorker?.getRegistration().then((registration) => {
      registration?.waiting?.postMessage({ type: "SKIP_WAITING" });
    });
  };

  if (!offline && !installPrompt && !updateReady) return null;

  return (
    <aside className="pwa-status" aria-live="polite">
      {offline && <span>Offline · showing saved application data</span>}
      {installPrompt && <button type="button" onClick={install}>Install InvStock</button>}
      {updateReady && <button type="button" onClick={update}>Update InvStock</button>}
    </aside>
  );
}
