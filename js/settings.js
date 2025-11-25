// settings.js

// ============================
// Navigazione schermate impostazioni
// ============================

(function () {
  function initSettingsNavigation() {
    const settingsView = document.querySelector(".view-settings");
    if (!settingsView) return;

    const main   = settingsView.querySelector(".settings-main");
    const panels = settingsView.querySelectorAll(".settings-panel[data-settings-id]");
    const rows   = settingsView.querySelectorAll(".settings-row[data-settings-page]");

    // Header principale delle impostazioni
    const titleEl = settingsView.querySelector("#settingsTitle");
    const backBtn = settingsView.querySelector("[data-settings-back-main]");

    if (!main || !titleEl) return;

    function setHeaderForMain() {
      titleEl.textContent = "Impostazioni";
      if (backBtn) {
        backBtn.hidden = true;
      }
    }

    function setHeaderForPanel(id) {
      // Recupera l'etichetta dal bottone corrispondente
      const row = settingsView.querySelector(`.settings-row[data-settings-page="${id}"]`);
      let label = id;

      if (row) {
        const lblEl = row.querySelector(".settings-row-label");
        if (lblEl && lblEl.textContent.trim()) {
          label = lblEl.textContent.trim();
        }
      }

      titleEl.textContent = `Impostazioni - ${label}`;
      if (backBtn) {
        backBtn.hidden = false;
      }
    }

    const showMain = () => {
      main.classList.add("is-active");
      panels.forEach(p => p.classList.remove("is-active"));
      setHeaderForMain();
    };

    const showPanel = (id) => {
      if (!id) return;
      main.classList.remove("is-active");
      panels.forEach(p => {
        p.classList.toggle("is-active", p.dataset.settingsId === id);
      });
      setHeaderForPanel(id);
    };

    // stato iniziale → schermata principale
    showMain();

    // click sulle righe della lista principale
    rows.forEach(row => {
      row.addEventListener("click", () => {
        const id = row.dataset.settingsPage;
        showPanel(id);
      });
    });

    // click sulla freccia in alto a sinistra
    if (backBtn) {
      backBtn.addEventListener("click", showMain);
    }
  }

  window.SettingsUI = {
    init: initSettingsNavigation
  };
})();
