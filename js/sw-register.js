// ============================
// Service worker + versione
// ============================

(function () {
  if (!("serviceWorker" in navigator)) return;
  if (!window.AppConfig) {
    throw new Error("CONFIG.MISSING: AppConfig non disponibile (sw-register.js)");
  }

  const { PATHS, VERSION } = window.AppConfig;
  const BASE      = PATHS.base;
  const SCOPE     = PATHS.swScope || `${BASE}/`;
  const SW_URL_RAW = PATHS.swFile;

  async function getSWVersion() {
    const url = SW_URL_RAW;
    const res = await fetch(url, { cache: "no-store", credentials: "same-origin" });
    const text = await res.text();
    const m = text.match(/const\s+VERSION\s*=\s*['"]([^'"]+)['"]/);
    if (!m) throw new Error("VERSION non trovata");
    return m[1];
  }

  function setVersionLabel(fullVersion) {
    const m = fullVersion.match(/V\s*([0-9.]+)/i);
    const label = m ? m[1] : "";
    const elId = VERSION.labelElementId || "versionLabel";
    const el = document.getElementById(elId);
    if (el) el.textContent = label;
  }

  async function registerSW() {
    try {
      const swVersion = await getSWVersion();
      setVersionLabel(swVersion);
      const SW_URL = `${SW_URL_RAW}?v=${encodeURIComponent(swVersion)}`;

      const reg = await navigator.serviceWorker.register(SW_URL, { scope: SCOPE });
      if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });

      reg.addEventListener("updatefound", () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener("statechange", () => {
          if (nw.state === "installed" && navigator.serviceWorker.controller) {
            nw.postMessage({ type: "SKIP_WAITING" });
          }
        });
      });

      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!window.__reloadedForSW) {
          window.__reloadedForSW = true;
          location.reload();
        }
      });

      reg.update().catch(() => {});
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          reg.update().catch(() => {});
        }
      });
    } catch (e) {
      console.warn("SW registration failed:", e);
      const elId = VERSION.labelElementId || "versionLabel";
      const el = document.getElementById(elId);
      if (el) el.textContent = "";
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", registerSW);
  } else {
    registerSW();
  }
})();
