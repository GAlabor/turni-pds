// theme.js

// ============================
// Tema: system / light / dark
// ============================

(function () {
  if (!window.AppConfig) {
    throw new Error("CONFIG.MISSING: AppConfig non disponibile (theme.js)");
  }
  const { STORAGE_KEYS, UI } = window.AppConfig;
  const THEME_KEY    = STORAGE_KEYS.theme;
  const THEME_LABELS = UI.themeLabels || {};

  // Applica il tema al <html>
  function applyTheme(theme) {
    const root = document.documentElement;

    if (theme === "light" || theme === "dark") {
      root.setAttribute("data-theme", theme);
    } else {
      // "system" → nessun data-theme, usa prefers-color-scheme
      root.removeAttribute("data-theme");
    }
  }

  // Allinea UI: pulsanti tema + riepilogo in riga impostazioni
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

  // Riempie le label dei bottoni tema usando AppConfig.UI.themeLabels
  function fillThemeLabels() {
    const labels = document.querySelectorAll("[data-theme-label]");
    labels.forEach(el => {
      const key = el.dataset.themeLabel;
      if (!key) return;

      const txt = THEME_LABELS[key];
      if (typeof txt === "string" && txt.trim() !== "") {
        el.textContent = txt;
      } else {
        // fallback decente se manca qualcosa in config
        el.textContent = key;
      }
    });
  }

  // Carica tema salvato da localStorage (default: system)
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

  function initTheme() {
    // Prima riempiamo le label dei bottoni dal config,
    // poi allineiamo stato theme salvato + UI.
    fillThemeLabels();
    loadTheme();
    setupThemeControls();
  }

  window.Theme = {
    init: initTheme
  };
})();
