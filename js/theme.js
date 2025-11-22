// ============================
// Tema: system / light / dark
// ============================

(function () {
  const THEME_KEY = "turnipds-theme";

  function applyTheme(theme) {
    const root = document.documentElement;

    if (theme === "light" || theme === "dark") {
      root.setAttribute("data-theme", theme);
    } else {
      root.removeAttribute("data-theme");
    }
  }

  function syncThemeUI(theme) {
    const choices = document.querySelectorAll(".settings-choice");
    choices.forEach(btn => {
      const value = btn.dataset.theme;
      btn.classList.toggle("is-active", value === theme);
    });

    const summary = document.getElementById("themeSummary");
    if (summary) {
      const labels = {
        system: "Tema corrente",
        light: "Tema chiaro",
        dark: "Tema scuro"
      };
      summary.textContent = labels[theme] || "";
    }
  }

  function loadTheme() {
    let saved = localStorage.getItem(THEME_KEY);
    if (!saved) saved = "system";
    applyTheme(saved);
    syncThemeUI(saved);
  }

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

        // ✔ unify saving animation
        if (window.Status) Status.markSaved();
      });
    });
  }

  function initTheme() {
    loadTheme();
    setupThemeControls();
  }

  window.Theme = {
    init: initTheme
  };
})();
