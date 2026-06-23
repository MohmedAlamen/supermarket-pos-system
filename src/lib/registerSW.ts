// Guarded service worker registration. Skips Lovable preview, iframe, dev, ?sw=off.
export function registerSW() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const url = new URL(window.location.href);
  const host = window.location.hostname;
  const inIframe = window.self !== window.top;
  const isPreviewHost =
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host === "lovableproject.com" || host.endsWith(".lovableproject.com") ||
    host === "lovableproject-dev.com" || host.endsWith(".lovableproject-dev.com") ||
    host === "beta.lovable.dev" || host.endsWith(".beta.lovable.dev");
  const killSwitch = url.searchParams.get("sw") === "off";
  const refuse = !import.meta.env.PROD || inIframe || isPreviewHost || killSwitch;

  if (refuse) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => {
        const scriptURL = r.active?.scriptURL || "";
        if (scriptURL.endsWith("/sw.js")) r.unregister();
      });
    }).catch(() => {});
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((err) => {
      console.warn("SW registration failed", err);
    });
  });
}
