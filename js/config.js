
// ============================
// Config globale app Turni PdS
// config.js v 1.0
// ============================

// ===================== SPLIT iife-wrapper : START =====================
(function () {

  // ===================== SPLIT guard-duplicated-load : START =====================
  // Evita di sovrascrivere se per qualche motivo venisse richiamato due volte
  if (window.AppConfig) {
    return;
  }
  // ===================== SPLIT guard-duplicated-load : END =====================


  // ===================== SPLIT base-path : START =====================
  // ============================
  // PATH / BASE URL
  // ============================
  // In locale: base vuota
  // In produzione: /turni-pds
  const BASE = (location.hostname === "localhost") ? "" : "/turni-pds";
  // ===================== SPLIT base-path : END =====================


  // ===================== SPLIT app-config-root : START =====================
  window.AppConfig = {

    // ===================== SPLIT paths-pwa : START =====================
    // ============================
    // PERCORSI / PWA
    // ============================
    PATHS: {
      base: BASE,
      svgBase: `${BASE}/svg`,
      swScope: `${BASE}/`,
      swFile: `${BASE}/service-worker.js`
    },
    // ===================== SPLIT paths-pwa : END =====================


    // ===================== SPLIT storage-keys : START =====================
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

      // ✅ Inizio Turnazione (data + indice turno rotazione)
      turniStart: "turnipds-turni-start",

      // Chiavi future (NON usate al momento)
      indennita: "turnipds-indennita",
      festivita: "turnipds-festivita",
      inspag: "turnipds-inspag",
      preferenze: "turnipds-preferenze"
    },
    // ===================== SPLIT storage-keys : END =====================


    // ===================== SPLIT ui-texts : START =====================
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
    // ===================== SPLIT ui-texts : END =====================


    // ===================== SPLIT status-config : START =====================
    // ============================
    // STATO / ANIMAZIONI (Status.js)
    // ============================
    STATUS: {
      savedDelay: 1200,
      spinnerVisibleMs: 800
    },
    // ===================== SPLIT status-config : END =====================


    // ===================== SPLIT version-label : START =====================
    // ============================
    // VERSIONE / LABEL
    // ============================
    VERSION: {
      labelElementId: "versionLabel"
    }
    // ===================== SPLIT version-label : END =====================

  };
  // ===================== SPLIT app-config-root : END =====================

})();
// ===================== SPLIT iife-wrapper : END =====================
