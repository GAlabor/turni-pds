// config.js

// ============================
// Config globale app Turni PDS
// ============================

(function () {
  // Evita di sovrascrivere se per qualche motivo venisse richiamato due volte
  if (window.AppConfig) {
    return;
  }

  // ============================
  // PATH / BASE URL
  // ============================
  // In locale: base vuota
  // In produzione: /turni-pds
  const BASE = (location.hostname === "localhost") ? "" : "/turni-pds";

  window.AppConfig = {
    // ============================
    // PERCORSI / PWA
    // ============================
    PATHS: {
      // Base del sito ("" in locale, "/turni-pds" in produzione)
      base: BASE,

      // Cartella SVG per icone
      svgBase: `${BASE}/svg`,

      // Scope e file del service worker
      swScope: `${BASE}/`,
      swFile: `${BASE}/service-worker.js`
    },

    // ============================
    // STORAGE KEYS (localStorage)
    // ============================
    STORAGE_KEYS: {
      // Tema: system / light / dark
      theme: "turnipds-theme",

      // Turni personalizzati
      turni: "turnipds-turni",

      // Toggle "visualizza turnazione su calendario"
      turniVisualizza: "turnipds-turni-visualizza",

      // Chiavi future (NON usate al momento)
      indennita: "turnipds-indennita",
      festivita: "turnipds-festivita",
      inspag: "turnipds-inspag",
      preferenze: "turnipds-preferenze"
    },

    // ============================
    // TESTI UI GLOBALI (usati dai JS)
    // ============================
    UI: {
      // Label usate dal modulo theme.js per il riepilogo
      themeLabels: {
        system: "Sistema",
        light: "Chiaro",
        dark: "Scuro"
      }
      // In futuro puoi aggiungere qui altre label condivise usate dallo script
    },

    // ============================
    // STATO / ANIMAZIONI (Status.js)
    // ============================
    STATUS: {
      // ms di durata stato "OK" prima di tornare idle
      savedDelay: 1200,

      // ms di "saving" prima di passare a OK
      spinnerVisibleMs: 800
    },

    // ============================
    // VERSIONE / LABEL
    // ============================
    VERSION: {
      // id dello span che mostra la versione in UI
      labelElementId: "versionLabel"
    }
  };
})();
