// sw-register.js

// ============================
// Service worker + versione
// ============================

(function () {
  if (!("serviceWorker" in navigator)) return;
  if (!window.AppConfig) {
    throw new Error("CONFIG.MISSING: AppConfig non disponibile (sw-register.js)");
  }

  const { PATHS, VERSION } = window.AppConfig;
  const BASE       = PATHS.base;
  const SCOPE      = PATHS.swScope || `${BASE}/`;
  const SW_URL_RAW = PATHS.swFile;

  // ----------------------------
  // Lettura versione dal file SW
  // ----------------------------
  async function getSWVersion() {
    try {
      const res = await fetch(SW_URL_RAW, {
        cache: "no-store",
        credentials: "same-origin"
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const text = await res.text();
      const m = text.match(/const\s+VERSION\s*=\s*['"]([^'"]+)['"]/);
      if (!m) throw new Error("VERSION non trovata nel file service-worker.js");
      return m[1];
    } catch {
      // NESSUN console.error / warn qui: silenzio in offline
      return null;
    }
  }

  // ----------------------------
  // Gestione label versione
  // ----------------------------
  function setVersionLabel(fullVersion) {
    const elId = VERSION.labelElementId || "versionLabel";
    const el = document.getElementById(elId);
    if (!el) return;

    if (!fullVersion) {
      el.textContent = "";
      return;
    }

    const m = fullVersion.match(/V\s*([0-9.]+)/i);
    const label = m ? m[1] : "";
    el.textContent = label;
  }

  // ----------------------------
  // Registrazione SW
  // ----------------------------
  async function registerSW() {
    const swVersion = await getSWVersion();

    // Se non ho potuto leggere la versione (offline o errore),
    // non registro niente e non sporco la console.
    if (!swVersion) {
      setVersionLabel("");
      return;
    }

    setVersionLabel(swVersion);
    const SW_URL = `${SW_URL_RAW}?v=${encodeURIComponent(swVersion)}`;

    try {
      const reg = await navigator.serviceWorker.register(SW_URL, { scope: SCOPE });

      if (reg.waiting) {
        reg.waiting.postMessage({ type: "SKIP_WAITING" });
      }

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

      // Aggiornamenti periodici
      reg.update().catch(() => {});
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          reg.update().catch(() => {});
        }
      });
    } catch {
      // Anche qui: niente casino in console in caso di errori
      setVersionLabel("");
    }
  }

  // ----------------------------
  // Wrapper che RISPETTA l’offline
  // ----------------------------
  function scheduleSWRegistration() {
    // Se il browser segnala offline, NON facciamo nessuna fetch
    if (navigator && navigator.onLine === false) {
      setVersionLabel("");
      // Quando torni online, registriamo una sola volta
      window.addEventListener("online", () => {
        registerSW();
      }, { once: true });
      return;
    }

    // Online → procedi normalmente
    registerSW();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleSWRegistration);
  } else {
    scheduleSWRegistration();
  }
})();
