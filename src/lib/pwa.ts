// Guarded service worker registration. Never registers in Lovable preview/dev/iframe.
const APP_SW = "/sw.js";

function isPreviewHost(h: string) {
  return (
    h.startsWith("id-preview--") ||
    h.startsWith("preview--") ||
    h === "lovableproject.com" || h.endsWith(".lovableproject.com") ||
    h === "lovableproject-dev.com" || h.endsWith(".lovableproject-dev.com") ||
    h === "beta.lovable.dev" || h.endsWith(".beta.lovable.dev")
  );
}

async function unregisterApp() {
  if (!("serviceWorker" in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    regs
      .filter((r) => r.active?.scriptURL?.endsWith(APP_SW) || r.installing?.scriptURL?.endsWith(APP_SW) || r.waiting?.scriptURL?.endsWith(APP_SW))
      .map((r) => r.unregister()),
  );
}

export async function registerPwa() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  const inIframe = window.top !== window.self;
  const url = new URL(window.location.href);
  const killSwitch = url.searchParams.get("sw") === "off";
  const refuse =
    !import.meta.env.PROD ||
    inIframe ||
    isPreviewHost(window.location.hostname) ||
    killSwitch;
  if (refuse) { await unregisterApp(); return; }
  try { await navigator.serviceWorker.register(APP_SW, { scope: "/" }); } catch {}
}