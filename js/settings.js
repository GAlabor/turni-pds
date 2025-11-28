// ============================
// Navigazione schermate Impostazioni
// Gestisce:
// - lista principale (.settings-main)
// - pannelli secondari (.settings-panel[data-settings-id])
// - header dinamico + pulsante back
// - API globale SettingsUI usata da app.js e turni.js
// ============================

(function () {
  // contenitore interno per esporre le funzioni reali
  const settingsApi = {
    showMainFn: null,
    showPanelFn: null
  };

  function initSettingsNavigation() {
    const settingsView = document.querySelector(".view-settings");
    if (!settingsView) return;

    const main   = settingsView.querySelector(".settings-main");
    const panels = settingsView.querySelectorAll(".settings-panel[data-settings-id]");
    const rows   = settingsView.querySelectorAll(".settings-row[data-settings-page]");

    // Header principale delle impostazioni
    const titleEl = settingsView.querySelector("#settingsTitle");
    const backBtn = settingsView.querySelector("[data-settings-back-main]");

    if (!main || !titleEl || !backBtn) return;

    let activePanelId = null;

    // ----------------------------
    // Util: gestione pulsante back
    // ----------------------------
    function hideBackBtn() {
      backBtn.hidden = true;
      backBtn.style.display = "none";
    }

    function showBackBtn() {
      backBtn.hidden = false;
      // inline-flex per allinearsi bene col titolo
      backBtn.style.display = "inline-flex";
    }

    // ----------------------------
    // Header: titolo per main e pannelli
    // ----------------------------

    // Titolo quando siamo sulla lista principale Impostazioni
    function setHeaderForMain() {
      titleEl.textContent = "Impostazioni";
      hideBackBtn();
    }

    // Titolo quando siamo su un pannello secondario:
    // - se il pannello ha data-settings-title → usa quello
    // - altrimenti "Impostazioni - <label riga corrispondente>"
    function setHeaderForPanel(id) {
      let label = id;

      // 1) Pannello con titolo custom (es: "Aggiungi turno")
      const panel = settingsView.querySelector(`.settings-panel[data-settings-id="${id}"]`);
      if (panel && panel.dataset.settingsTitle) {
        titleEl.textContent = panel.dataset.settingsTitle;
        showBackBtn();
        return;
      }

      // 2) Recupera testo dalla riga principale di impostazioni
      const row = settingsView.querySelector(`.settings-row[data-settings-page="${id}"]`);
      if (row) {
        const lblEl = row.querySelector(".settings-row-label");
        if (lblEl && lblEl.textContent.trim()) {
          label = lblEl.textContent.trim();
        }
      }

      titleEl.textContent = `Impostazioni - ${label}`;
      showBackBtn();
    }

    // ----------------------------
    // Switch vista: main / pannelli
    // ----------------------------

    function showMain() {
      activePanelId = null;
      main.classList.add("is-active");
      panels.forEach(p => p.classList.remove("is-active"));
      setHeaderForMain();
    }

    function showPanel(id) {
      if (!id) return;
      activePanelId = id;
      main.classList.remove("is-active");
      panels.forEach(p => {
        p.classList.toggle("is-active", p.dataset.settingsId === id);
      });
      setHeaderForPanel(id);
    }

    // esponi le funzioni interne all’API globale
    settingsApi.showMainFn  = showMain;
    settingsApi.showPanelFn = showPanel;

    // stato iniziale → schermata principale senza freccia
    showMain();

    // ----------------------------
    // Eventi UI
    // ----------------------------

    // click sulle righe della lista principale (aprono il pannello corrispondente)
    rows.forEach(row => {
      row.addEventListener("click", () => {
        const id = row.dataset.settingsPage;
        showPanel(id);
      });
    });

    // click sulla freccia in alto a sinistra
    backBtn.addEventListener("click", () => {
      // Caso speciale: se siamo nel pannello "Aggiungi turno",
      // il back riporta al pannello "Turni", NON alla main list.
      if (activePanelId === "turni-add") {
        showPanel("turni");
        return;
      }

      showMain();
    });
  }

  // ============================
  // API globale SettingsUI
  // ============================
  window.SettingsUI = {
    // inizializzazione chiamata da app.js
    init: initSettingsNavigation,

    // usato da app.js quando tocchi la tab Impostazioni
    showMain: function () {
      if (typeof settingsApi.showMainFn === "function") {
        settingsApi.showMainFn();
      }
    },

    // usato da turni.js per aprire pannelli specifici (es. "turni-add")
    openPanel: function (id) {
      if (typeof settingsApi.showPanelFn === "function") {
        settingsApi.showPanelFn(id);
      }
    }
  };
})();
