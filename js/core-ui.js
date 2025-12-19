// =====================================================
// core-ui.js (bundle UI + bootstrap + SW)
// Build: 2025-12-18
// Contenuti:
//// - settings.js
// - ui-feedback.js
// - app.js
// - sw-register.js
// =====================================================

// ============================
// Navigazione schermate Impostazioni
// "internal nav" centralizzata qui (niente flag globali sparsi)
// eventi di cambio pannello (SettingsUI.onChange)
// settings.js v 1.0
// ============================

(function () {

  // ===================== SPLIT settings_api_container : START =====================
  // contenitore interno per esporre le funzioni reali
  const settingsApi = {
    showMainFn: null,
    showPanelFn: null
  };
  // ===================== SPLIT settings_api_container : END   =====================

  // ===================== SPLIT navigation_state : START =====================
  // Stato navigazione centralizzato
  let activePanelId = null; // null = main
  let pendingInternalNav = false;
  // ===================== SPLIT navigation_state : END   =====================

  // ===================== SPLIT change_listeners : START =====================
  // listeners cambio pannello
  const changeListeners = new Set();

  function emitChange(prevId, nextId, meta) {
    changeListeners.forEach((cb) => {
      try { cb(prevId, nextId, meta || {}); } catch {}
    });
  }
  // ===================== SPLIT change_listeners : END   =====================

  // ===================== SPLIT internal_nav_flag : START =====================
  function consumeInternalNav() {
    const v = pendingInternalNav;
    pendingInternalNav = false;
    return v;
  }
  // ===================== SPLIT internal_nav_flag : END   =====================

  // ===================== SPLIT init_settings_navigation : START =====================
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

    // ===================== SPLIT back_button_utils : START =====================
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
    // ===================== SPLIT back_button_utils : END   =====================

    // ===================== SPLIT header_title_logic : START =====================
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
    // ===================== SPLIT header_title_logic : END   =====================

    // ===================== SPLIT view_switch_main_panel : START =====================
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
    // ===================== SPLIT view_switch_main_panel : END   =====================

    // ===================== SPLIT expose_internal_functions : START =====================
    // esponi le funzioni interne all’API globale
    settingsApi.showMainFn  = showMain;
    settingsApi.showPanelFn = showPanel;
    // ===================== SPLIT expose_internal_functions : END   =====================

    // ===================== SPLIT initial_state : START =====================
    // stato iniziale → schermata principale senza freccia
    showMain({ reason: "init" });
    // ===================== SPLIT initial_state : END   =====================

    // ===================== SPLIT ui_events_rows_back : START =====================
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
    // ===================== SPLIT ui_events_rows_back : END   =====================
  }
  // ===================== SPLIT init_settings_navigation : END   =====================

  // ===================== SPLIT global_api_settingsui : START =====================
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
  // ===================== SPLIT global_api_settingsui : END   =====================
})();

// ============================
// Helper UI condiviso: errori temporizzati (show/hide)
// ui-feedback.js v 1.0
// ============================

(function () {

  // ===================== SPLIT helper-create-temp-error : START =====================
  function createTempError(el, ms) {
    const duration = Number(ms) > 0 ? Number(ms) : 2000;
    let t = null;

    function clear() {
      if (!el) return;
      if (t) {
        clearTimeout(t);
        t = null;
      }
      el.hidden = true;
    }

    function show() {
      if (!el) return;
      clear();
      el.hidden = false;
      t = setTimeout(() => {
        el.hidden = true;
        t = null;
      }, duration);
    }

    return { show, clear };
  }
  // ===================== SPLIT helper-create-temp-error : END =======================


  // ===================== SPLIT export-global : START =====================
  window.UIFeedback = { createTempError };
  // ===================== SPLIT export-global : END =======================

})();

// ============================
// Bootstrap UI core
// - Inizializza moduli principali
// - Gestisce il comportamento della tabbar
// app.js v 1.0
// ============================

(function () {

// ===================== SPLIT tabbar_switch_viste : START =====================
// ============================
// Tabbar: switch viste principali
// ============================
function initTabs() {
  const tabs  = document.querySelectorAll(".tab");
  const views = document.querySelectorAll(".view");

  if (!tabs.length || !views.length) return;

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.tab;

      // vista attiva PRIMA del cambio
      const activeView = document.querySelector(".view.is-active");
      const activeViewId = activeView ? activeView.dataset.view : null;

      // TAB CALENDARIO:
      // se è già attiva → torna al mese/giorno corrente (resetToToday)
      if (target === "calendar") {
        const calendarView = document.querySelector(".view-calendar");
        const isCalendarActive =
          calendarView && calendarView.classList.contains("is-active");

        if (
          isCalendarActive &&
          window.Calendar &&
          typeof Calendar.resetToToday === "function"
        ) {
          Calendar.resetToToday();
          return;
        }
      }

      // TAB IMPOSTAZIONI:
      // se la vista settings è già attiva → torna al menu principale Impostazioni
      if (target === "settings") {
        const settingsView = document.querySelector(".view-settings");
        const isSettingsActive =
          settingsView && settingsView.classList.contains("is-active");

        if (isSettingsActive) {
          // uscendo / resettando Impostazioni → esci dalla modalità Modifica Turni
          if (window.Turni && typeof Turni.exitEditMode === "function") {
            Turni.exitEditMode();
          }
          // ✅ e anche Turnazioni (indipendente da Turni)
          if (window.Turnazioni && typeof Turnazioni.exitEditMode === "function") {
            Turnazioni.exitEditMode();
          }

          if (window.SettingsUI && typeof SettingsUI.showMain === "function") {
            // siamo già su settings → resetta solo il pannello
            SettingsUI.showMain();
          }
          return;
        }
      }

      // Se stiamo uscendo da Impostazioni verso un'altra vista,
      // assicuriamoci di uscire dalla modalità Modifica Turni
      if (activeViewId === "settings" && target !== "settings") {
        if (window.Turni && typeof Turni.exitEditMode === "function") {
          Turni.exitEditMode();
        }
        // ✅ e anche Turnazioni (indipendente da Turni)
        if (window.Turnazioni && typeof Turnazioni.exitEditMode === "function") {
          Turnazioni.exitEditMode();
        }
      }

      // Comportamento standard delle tab:
      // - aggiorna stato .active sui bottoni
      // - mostra/nasconde le viste con .is-active
      tabs.forEach(t => t.classList.toggle("active", t === tab));
      views.forEach(v => {
        v.classList.toggle("is-active", v.dataset.view === target);
      });
    });
  });
}
// ===================== SPLIT tabbar_switch_viste : END   =====================



  // ===================== SPLIT bootstrap_domcontentloaded : START =====================
  // ============================
  // Bootstrap all’avvio
  // ============================
  window.addEventListener("DOMContentLoaded", () => {
    // Stato prima di tutto: gli altri possono usarlo subito
    if (window.Status && typeof Status.init === "function") {
      Status.init();
    }

    // Calendario (vista principale)
    if (window.Calendar && typeof Calendar.init === "function") {
      Calendar.init();
    }

    // Tema (applica data-theme + sincronizza UI tema)
    if (window.Theme && typeof Theme.init === "function") {
      Theme.init();
    }

    // Tabbar (switch tra le viste principali)
    initTabs();

    // Icone SVG (tabbar + icona stato)
    if (window.Icons && typeof Icons.initTabbar === "function") {
      Icons.initTabbar();

      if (typeof Icons.loadStatusIcon === "function") {
        Icons.loadStatusIcon();
      }
    }

    // Navigazione Impostazioni (lista principale + pannelli)
    if (window.SettingsUI && typeof SettingsUI.init === "function") {
      SettingsUI.init();
    }

    // Pannello Turni (lista + form "Aggiungi turno")
    if (window.Turni && typeof Turni.init === "function") {
      Turni.init();
    }
  });
  // ===================== SPLIT bootstrap_domcontentloaded : END   =====================

})();

// ============================
// Service worker + versione
// sw-register.js v 1.0
// ============================

// ===================== SPLIT bootstrap : START =====================
(function () {
  if (!("serviceWorker" in navigator)) return;
  if (!window.AppConfig) {
    throw new Error("CONFIG.MISSING: AppConfig non disponibile (sw-register.js)");
  }

  const { PATHS, VERSION } = window.AppConfig;
  const BASE       = PATHS.base;
  const SCOPE      = PATHS.swScope || `${BASE}/`;
  const SW_URL_RAW = PATHS.swFile;
// ===================== SPLIT bootstrap : END =====================

  // ===================== SPLIT get_sw_version : START =====================
  // ----------------------------
  // Lettura versione dal file SW
  // ----------------------------
  async function getSWVersion() {
    try {
      const res = await fetch(SW_URL_RAW, {
        cache: "no-store",
        credentials: "same-origin"
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const text = await res.text();
      const m = text.match(/const\s+VERSION\s*=\s*['"]([^'"]+)['"]/);
      if (!m) throw new Error("VERSION non trovata nel file service-worker.js");
      return m[1];
    } catch {
      // NESSUN console.error / warn qui: silenzio in offline
      return null;
    }
  }
  // ===================== SPLIT get_sw_version : END =====================

  // ===================== SPLIT version_label : START =====================
  // ----------------------------
  // Gestione label versione
  // ----------------------------
  function setVersionLabel(fullVersion) {
    const elId = VERSION.labelElementId || "versionLabel";
    const el = document.getElementById(elId);
    if (!el) return;

    if (!fullVersion) {
      el.textContent = "";
      return;
    }

    const m = fullVersion.match(/V\s*([0-9.]+)/i);
    const label = m ? m[1] : "";
    el.textContent = label;
  }
  // ===================== SPLIT version_label : END =====================

  // ===================== SPLIT register_sw : START =====================
  // ----------------------------
  // Registrazione SW
  // ----------------------------
  async function registerSW() {
    const swVersion = await getSWVersion();

    // Se non ho potuto leggere la versione (offline o errore),
    // non registro niente e non sporco la console.
    if (!swVersion) {
      setVersionLabel("");
      return;
    }

    setVersionLabel(swVersion);
    const SW_URL = `${SW_URL_RAW}?v=${encodeURIComponent(swVersion)}`;

    try {
      const reg = await navigator.serviceWorker.register(SW_URL, { scope: SCOPE });

      if (reg.waiting) {
        reg.waiting.postMessage({ type: "SKIP_WAITING" });
      }

      reg.addEventListener("updatefound", () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener("statechange", () => {
          if (nw.state === "installed" && navigator.serviceWorker.controller) {
            nw.postMessage({ type: "SKIP_WAITING" });
          }
        });
      });

      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!window.__reloadedForSW) {
          window.__reloadedForSW = true;
          location.reload();
        }
      });

      // Aggiornamenti periodici
      reg.update().catch(() => {});
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          reg.update().catch(() => {});
        }
      });
    } catch {
      // Anche qui: niente casino in console in caso di errori
      setVersionLabel("");
    }
  }
  // ===================== SPLIT register_sw : END =====================

  // ===================== SPLIT schedule_registration : START =====================
  // ----------------------------
  // Wrapper che RISPETTA l’offline
  // ----------------------------
  function scheduleSWRegistration() {
    // Se il browser segnala offline, NON facciamo nessuna fetch
    if (navigator && navigator.onLine === false) {
      setVersionLabel("");
      // Quando torni online, registriamo una sola volta
      window.addEventListener("online", () => {
        registerSW();
      }, { once: true });
      return;
    }

    // Online → procedi normalmente
    registerSW();
  }
  // ===================== SPLIT schedule_registration : END =====================

  // ===================== SPLIT dom_ready_hook : START =====================
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleSWRegistration);
  } else {
    scheduleSWRegistration();
  }
})();
  // ===================== SPLIT dom_ready_hook : END =====================
