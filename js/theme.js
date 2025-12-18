// ============================
// theme.js
// Tema: system / light / dark
// - Salvataggio preferenza in localStorage
// - Attributo data-theme su <html>
// - Sincronizzazione con pannello Impostazioni → Tema
// ============================

(function () {

  // ===================== SPLIT guard_config : START =====================
  if (!window.AppConfig) {
    throw new Error("CONFIG.MISSING: AppConfig non disponibile (theme.js)");
  }

  const { STORAGE_KEYS, UI } = window.AppConfig;
  const THEME_KEY    = STORAGE_KEYS.theme;
  const THEME_LABELS = UI.themeLabels || {};
  // ===================== SPLIT guard_config : END   =====================


  // ===================== SPLIT apply_theme_html : START =====================
  // ============================
  // Applicazione tema a <html>
  // ============================

  // Applica il tema al documento:
  // - "light" / "dark" → data-theme sull’elemento <html>
  // - "system" → rimozione data-theme, usa prefers-color-scheme
  function applyTheme(theme) {
    const root = document.documentElement;

    if (theme === "light" || theme === "dark") {
      root.setAttribute("data-theme", theme);
    } else {
      root.removeAttribute("data-theme");
    }
  }
  // ===================== SPLIT apply_theme_html : END   =====================


  // ===================== SPLIT sync_ui_panel : START =====================
  // ============================
  // Sincronizzazione UI (pannello Tema)
  // ============================

  // Evidenzia il pulsante attivo e aggiorna il riepilogo
  // in riga Impostazioni → Tema (elemento #themeSummary)
  function syncThemeUI(theme) {
    const choices = document.querySelectorAll(".settings-choice");
    choices.forEach(btn => {
      const value = btn.dataset.theme;
      btn.classList.toggle("is-active", value === theme);
    });

    const summary = document.getElementById("themeSummary");
    if (summary) {
      summary.textContent = THEME_LABELS[theme] || "";
    }
  }

  // Riempie le label interne dei pulsanti tema
  // usando AppConfig.UI.themeLabels (system / light / dark)
  function fillThemeLabels() {
    const labels = document.querySelectorAll("[data-theme-label]");
    labels.forEach(el => {
      const key = el.dataset.themeLabel;
      if (!key) return;

      const txt = THEME_LABELS[key];
      if (typeof txt === "string" && txt.trim() !== "") {
        el.textContent = txt;
      } else {
        // fallback dignitoso se manca qualcosa nel config
        el.textContent = key;
      }
    });
  }
  // ===================== SPLIT sync_ui_panel : END   =====================


  // ===================== SPLIT storage_load_save : START =====================
  // ============================
  // Caricamento / salvataggio tema
  // ============================

  // Legge il tema da localStorage (default: "system")
  function loadTheme() {
    let saved = localStorage.getItem(THEME_KEY);
    if (!saved) saved = "system";

    applyTheme(saved);
    syncThemeUI(saved);
  }

  // Gestione click sui pulsanti tema
  function setupThemeControls() {
    const choices = document.querySelectorAll(".settings-choice");
    if (!choices.length) return;

    choices.forEach(btn => {
      btn.addEventListener("click", () => {
        const value = btn.dataset.theme;
        if (!value) return;

        localStorage.setItem(THEME_KEY, value);
        applyTheme(value);
        syncThemeUI(value);

        if (window.Status && typeof Status.markSaved === "function") {
          Status.markSaved();
        }
      });
    });
  }
  // ===================== SPLIT storage_load_save : END   =====================


  // ===================== SPLIT public_init_export : START =====================
  // ============================
  // Init pubblico
  // ============================

  function initTheme() {
    // 1) riempie le etichette dei pulsanti dal config
    // 2) applica il tema salvato
    // 3) aggancia i listener di click
    fillThemeLabels();
    loadTheme();
    setupThemeControls();
  }

  window.Theme = {
    init: initTheme
  };
  // ===================== SPLIT public_init_export : END   =====================

})();
