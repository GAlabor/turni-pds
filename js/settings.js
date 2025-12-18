// ============================
// settings.js
// Navigazione schermate Impostazioni
// + "internal nav" centralizzata qui (niente flag globali sparsi)
// + eventi di cambio pannello (SettingsUI.onChange)
// ============================

(function () {
  // contenitore interno per esporre le funzioni reali
  const settingsApi = {
    showMainFn: null,
    showPanelFn: null
  };

  // Stato navigazione centralizzato
  let activePanelId = null; // null = main
  let pendingInternalNav = false;

  // listeners cambio pannello
  const changeListeners = new Set();

  function emitChange(prevId, nextId, meta) {
    changeListeners.forEach((cb) => {
      try { cb(prevId, nextId, meta || {}); } catch {}
    });
  }

  function consumeInternalNav() {
    const v = pendingInternalNav;
    pendingInternalNav = false;
    return v;
  }

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

    // ----------------------------
    // Util: gestione pulsante back
    // ----------------------------
    function hideBackBtn() {
      backBtn.hidden = true;
      backBtn.style.display = "none";
    }

    function showBackBtn() {
      backBtn.hidden = false;
      backBtn.style.display = "inline-flex";
    }

    // ----------------------------
    // Header: titolo per main e pannelli
    // ----------------------------
    function setHeaderForMain() {
      titleEl.textContent = "Impostazioni";
      hideBackBtn();
    }

    function setHeaderForPanel(id) {
      let label = id;

      const panel = settingsView.querySelector(`.settings-panel[data-settings-id="${id}"]`);
      if (panel && panel.dataset.settingsTitle) {
        titleEl.textContent = panel.dataset.settingsTitle;
        showBackBtn();
        return;
      }

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
    function showMain(meta) {
      // tornando alla lista principale → usciamo dalla modalità Modifica Turni
      if (window.Turni && typeof Turni.exitEditMode === "function") {
        Turni.exitEditMode();
      }

      const prev = activePanelId;
      activePanelId = null;

      main.classList.add("is-active");
      panels.forEach(p => p.classList.remove("is-active"));
      setHeaderForMain();

      emitChange(prev, null, meta);
    }

    function showPanel(id, meta) {
      if (!id) return;

      const prev = activePanelId;
      activePanelId = id;

      // Regole “coerenti” con il tuo flusso:
      // - se lasci il pannello turni → esci da edit mode (ma ci pensa già in parte Turni)
      // - se entri in turni-add / turnazioni-add -> esci da edit mode
      if (prev === "turni" && id !== "turni") {
        if (window.Turni && typeof Turni.exitEditMode === "function") {
          Turni.exitEditMode();
        }
      }
      if (id === "turni-add" || id === "turnazioni-add") {
        if (window.Turni && typeof Turni.exitEditMode === "function") {
          Turni.exitEditMode();
        }
      }

      main.classList.remove("is-active");
      panels.forEach(p => {
        p.classList.toggle("is-active", p.dataset.settingsId === id);
      });
      setHeaderForPanel(id);

      emitChange(prev, id, meta);
    }

    // esponi le funzioni interne all’API globale
    settingsApi.showMainFn  = showMain;
    settingsApi.showPanelFn = showPanel;

    // stato iniziale → schermata principale senza freccia
    showMain({ reason: "init" });

    // ----------------------------
    // Eventi UI
    // ----------------------------
    rows.forEach(row => {
      row.addEventListener("click", () => {
        const id = row.dataset.settingsPage;
        showPanel(id, { reason: "row" });
      });
    });

    backBtn.addEventListener("click", () => {
      // comportamento “back” basato su pannello attivo
      // Nota: qui mantengo i tuoi casi speciali.

      if (activePanelId === "turni-add") {
        showPanel("turni", { reason: "back" });
        return;
      }
      if (activePanelId === "turni-start") {
        showPanel("turni", { reason: "back" });
        return;
      }
      if (activePanelId === "turni-start-pick") {
        showPanel("turni-start", { reason: "back" });
        return;
      }
      if (activePanelId === "turnazioni-add") {
        showPanel("turni", { reason: "back" });
        return;
      }
      if (activePanelId === "turnazioni-pick") {
        showPanel("turnazioni-add", { reason: "back" });
        return;
      }

      showMain({ reason: "back" });
    });
  }

  // ============================
  // API globale SettingsUI
  // ============================
  window.SettingsUI = {
    init: initSettingsNavigation,

    showMain: function () {
      if (typeof settingsApi.showMainFn === "function") {
        settingsApi.showMainFn({ reason: "api" });
      }
    },

    // Backward compatible:
    // SettingsUI.openPanel("id") funziona
    // SettingsUI.openPanel("id", { internal: true }) marca navigazione interna
    openPanel: function (id, opts) {
      if (opts && opts.internal) {
        pendingInternalNav = true;
      }
      if (typeof settingsApi.showPanelFn === "function") {
        settingsApi.showPanelFn(id, { reason: "api", internal: !!(opts && opts.internal) });
      }
    },

    // Stato / internal nav (usato dai moduli per decidere reset)
    getActivePanelId: function () {
      return activePanelId;
    },

    consumeInternalNav: function () {
      return consumeInternalNav();
    },

    // Eventi cambio pannello
    onChange: function (cb) {
      if (typeof cb !== "function") return function () {};
      changeListeners.add(cb);
      return function () { changeListeners.delete(cb); };
    }
  };
})();
