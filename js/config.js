// config.js

// ============================
// Config globale app
// ============================

(function () {
  // Evita di sovrascrivere se per qualche motivo venisse richiamato due volte
  if (window.AppConfig) {
    return;
  }

  // Base path: vuoto in locale, /turni-pds in produzione
  const BASE = (location.hostname === "localhost") ? "" : "/turni-pds";

  window.AppConfig = {
    PATHS: {
      base: BASE,
      svgBase: `${BASE}/svg`,
      swScope: `${BASE}/`,
      swFile: `${BASE}/service-worker.js`
    },

    STORAGE_KEYS: {
      theme: "turnipds-theme",
      turni: "turnipds-turni",
      turniVisualizza: "turnipds-turni-visualizza"
    },

    UI: {
      themeLabels: {
        system: "Tema corrente",
        light: "Tema chiaro",
        dark: "Tema scuro"
      }
    },

    STATUS: {
      // ms di durata stato "OK" prima di tornare idle
      savedDelay: 1200,
      // ms di "saving" prima di passare a OK
      spinnerVisibleMs: 800
    },

    VERSION: {
      // id dello span che mostra la versione
      labelElementId: "versionLabel"
    }
  };
})();
