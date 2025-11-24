// settings.js

// ============================
// Navigazione schermate impostazioni
// ============================

(function () {
  function initSettingsNavigation() {
    const settingsView = document.querySelector(".view-settings");
    if (!settingsView) return;

    const main = settingsView.querySelector(".settings-main");
    const panels = settingsView.querySelectorAll(".settings-panel[data-settings-id]");
    const rows = settingsView.querySelectorAll(".settings-row[data-settings-page]");
    const backBtns = settingsView.querySelectorAll("[data-settings-back]");

    if (!main) return;

    const showMain = () => {
      main.classList.add("is-active");
      panels.forEach(p => p.classList.remove("is-active"));
    };

    const showPanel = (id) => {
      if (!id) return;
      main.classList.remove("is-active");
      panels.forEach(p => {
        p.classList.toggle("is-active", p.dataset.settingsId === id);
      });
    };

    // stato iniziale
    showMain();

    rows.forEach(row => {
      row.addEventListener("click", () => {
        const id = row.dataset.settingsPage;
        showPanel(id);
      });
    });

    backBtns.forEach(btn => {
      btn.addEventListener("click", showMain);
    });
  }

  window.SettingsUI = {
    init: initSettingsNavigation
  };
})();
