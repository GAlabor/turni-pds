// config.js

// ============================
// Config globale app Turni PdS
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
      base: BASE,
      svgBase: `${BASE}/svg`,
      swScope: `${BASE}/`,
      swFile: `${BASE}/service-worker.js`
    },

    // ============================
    // STORAGE KEYS (localStorage)
    // ============================
    STORAGE_KEYS: {
      theme: "turnipds-theme",

      // Turni personalizzati
      turni: "turnipds-turni",

      // Toggle "visualizza turnazione su calendario"
      turniVisualizza: "turnipds-turni-visualizza",

      // ✅ Turnazioni
      turnazioni: "turnipds-turnazioni",
      turnazioniPreferred: "turnipds-turnazioni-preferred",

      // ✅ Imposta turno iniziale (data + indice turno rotazione)
      turniStart: "turnipds-turni-start",

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
      themeLabels: {
        system: "Sistema",
        light: "Chiaro",
        dark: "Scuro"
      }
    },

    // ============================
    // STATO / ANIMAZIONI (Status.js)
    // ============================
    STATUS: {
      savedDelay: 1200,
      spinnerVisibleMs: 800
    },

    // ============================
    // VERSIONE / LABEL
    // ============================
    VERSION: {
      labelElementId: "versionLabel"
    }
  };
})();
