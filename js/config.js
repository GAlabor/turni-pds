// config.js

// ============================
// Turni PDS — Mappa utilizzo AppConfig
// ============================
//
// Questo file espone window.AppConfig e viene usato dai moduli JS.
// Qui sotto la mappa di chi usa cosa, per evitare chiavi duplicate o sparse.
//
// SEZIONI PRINCIPALI
// ------------------
//
// PATHS
//   - Contiene i percorsi di base dell’app (root, svg, service worker).
//
//   Usato da:
//     • icons.js
//         - PATHS.svgBase
//           → base URL per caricare le icone SVG della tabbar e dell’icona stato.
//
//     • sw-register.js
//         - PATHS.base
//           → base path dell’app ("" in locale, "/turni-pds" in produzione).
//         - PATHS.swScope
//           → scope di registrazione del service worker.
//         - PATHS.swFile
//           → percorso del file service-worker.js da registrare.
//
// STORAGE_KEYS
//   - Contiene TUTTE le chiavi usate in localStorage per Turni PDS.
//   - Regola: ogni nuova feature deve usare una chiave definita qui,
//             con prefisso "turnipds-*".
//
//   Usato da:
//     • theme.js
//         - STORAGE_KEYS.theme
//           → salva/carica il tema selezionato ("system", "light", "dark").
//
//     • turni.js
//         - STORAGE_KEYS.turni
//           → array dei turni personalizzati definiti dall’utente.
//         - STORAGE_KEYS.turniVisualizza
//           → stato del toggle "Visualizza turnazione su calendario".
//
//   Chiavi pronte ma NON ancora usate (riservate per feature future):
//     - STORAGE_KEYS.indennita   → per la sezione Indennità
//     - STORAGE_KEYS.festivita   → per la sezione Festività
//     - STORAGE_KEYS.inspag      → per inserimenti/pagamenti
//     - STORAGE_KEYS.preferenze  → per eventuali preferenze generali
//
//
// UI
//   - Contiene label testuali condivise usate dai JS (non tutto il testo dell’interfaccia).
//
//   Usato da:
//     • theme.js
//         - UI.themeLabels
//           → testo riassuntivo mostrato nella riga "Tema" (settings).
//
//
// STATUS
//   - Parametri per la gestione dell’icona di stato/salvataggio.
//
//   Usato da:
//     • status.js
//         - STATUS.savedDelay
//           → durata (ms) dello stato "OK" prima di tornare "idle".
//         - STATUS.spinnerVisibleMs
//           → durata (ms) dello stato "saving" prima di passare a "OK".
//
//
// VERSION
//   - Config per mostrare la versione letta dal service worker.
//
//   Usato da:
//     • sw-register.js
//         - VERSION.labelElementId
//           → id dell’elemento che visualizza la versione (span#versionLabel).
//
// ------------------
// Nota:
// - I moduli che NON leggono AppConfig (calendar.js, settings.js, app.js, ecc.)
//   non dipendono da questo file.
// - Ogni nuova feature che usa localStorage o percorsi condivisi
//   deve prima aggiungere la chiave/sezione qui, poi usarla nel proprio modulo.
// ============================


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
