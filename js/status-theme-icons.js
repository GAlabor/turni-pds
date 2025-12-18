// =====================================================
// status-theme-icons.js (bundle UI global)
// Build: 2025-12-18
// Contenuti:
//// - status.js
// - theme.js
// - icons.js
// =====================================================

// ============================
// Icona stato / salvataggio
// Usa l’elemento #statusIcon con classi:
// - status-idle
// - status-saving
// - status-ok
// I CSS gestiscono cerchi / omino / animazione
// status.js v 1.0
// ============================

(function () {

  // ===================== SPLIT bootstrap-guard : START =====================
  if (!window.AppConfig) {
    throw new Error("CONFIG.MISSING: AppConfig non disponibile (status.js)");
  }
  // ===================== SPLIT bootstrap-guard : END =======================

  // ===================== SPLIT config-bindings : START =====================
  const { STATUS } = window.AppConfig;
  // ===================== SPLIT config-bindings : END =======================

  // ===================== SPLIT status-object : START =====================
  const Status = {
    el: null,
    timer: null,
    SAVED_DELAY: STATUS.savedDelay,
    SPINNER_MS: STATUS.spinnerVisibleMs,

    // ===================== SPLIT lifecycle-init : START =====================
    init() {
      this.el = document.getElementById("statusIcon");
      if (!this.el) return;
      this.setIdle();
    },
    // ===================== SPLIT lifecycle-init : END =======================

    // ===================== SPLIT state-idle : START =====================
    // Stato di riposo: cerchio base tenue, nessun spinner
    setIdle() {
      if (!this.el) return;
      this.el.classList.remove("status-saving", "status-ok");
      this.el.classList.add("status-idle");
    },
    // ===================== SPLIT state-idle : END =======================

    // ===================== SPLIT state-saving : START =====================
    // Stato "salvataggio in corso": spinner attivo
    setSaving() {
      if (!this.el) return;
      this.el.classList.remove("status-idle", "status-ok");
      this.el.classList.add("status-saving");

      if (this.timer) {
        clearTimeout(this.timer);
        this.timer = null;
      }
    },
    // ===================== SPLIT state-saving : END =======================

    // ===================== SPLIT state-ok : START =====================
    // Stato "salvato": cerchio pieno più acceso per un breve periodo
    setOk() {
      if (!this.el) return;
      this.el.classList.remove("status-idle", "status-saving");
      this.el.classList.add("status-ok");

      if (this.timer) {
        clearTimeout(this.timer);
      }

      this.timer = setTimeout(() => {
        this.setIdle();
      }, this.SAVED_DELAY);
    },
    // ===================== SPLIT state-ok : END =======================

    // ===================== SPLIT public-api : START =====================
    // API pubblica:
    // chiamata dagli altri moduli dopo un salvataggio completato
    // (es. tema, turni, toggle futuri)
    markSaved() {
      this.setSaving();

      setTimeout(() => {
        this.setOk();
      }, this.SPINNER_MS);
    }
    // ===================== SPLIT public-api : END =======================
  };
  // ===================== SPLIT status-object : END =======================

  // ===================== SPLIT global-export : START =====================
  window.Status = Status;
  // ===================== SPLIT global-export : END =======================

})();

// ============================
// Tema: system / light / dark
// Salvataggio preferenza in localStorage
// Attributo data-theme su <html>
// Sincronizzazione con pannello Impostazioni → Tema
// theme.js v 1.0
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

// ============================
// Icone SVG:
// Tabbar (Calendario / InsPag / Riepilogo / Impostazioni)
// Icona stato / login (in alto a destra)
// icons.js v 1.0
// ============================

(function () {

  // ===================== SPLIT bootstrap_guard_config : START =====================
  if (!window.AppConfig) {
    throw new Error("CONFIG.MISSING: AppConfig non disponibile (icons.js)");
  }

  const { PATHS } = window.AppConfig;
  const SVG_BASE = PATHS.svgBase;
  // ===================== SPLIT bootstrap_guard_config : END   =====================

  // ===================== SPLIT util_load_svg_into_host : START =====================
  // ============================
  // Util: inietta un file SVG in un elemento con id dato
  // ============================
  async function loadSVGInto(id, file) {
    const host = document.getElementById(id);
    if (!host) return;

    try {
      const res = await fetch(`${SVG_BASE}/${file}`, {
        cache: "no-store",
        credentials: "same-origin"
      });

      if (!res.ok) return;

      const txt = await res.text();
      host.innerHTML = txt.trim();
    } catch (err) {
      console.error("Errore icona:", file, err);
    }
  }
  // ===================== SPLIT util_load_svg_into_host : END   =====================

  // ===================== SPLIT calendar_icon_dynamic_date : START =====================
  // ============================
  // Calendario: mese/giorno dinamici dentro calendar.svg
  // ============================
  function setCalendarIconDateInSvg() {
    const host = document.getElementById("icoCalendar");
    if (!host) return;

    const now = new Date();
    const months = ["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];

    const monthEl = host.querySelector("#calMonth");
    const dayEl   = host.querySelector("#calDay");

    if (monthEl) monthEl.textContent = months[now.getMonth()];
    if (dayEl)   dayEl.textContent   = now.getDate();
  }
  // ===================== SPLIT calendar_icon_dynamic_date : END   =====================

  // ===================== SPLIT tabbar_icons_loader : START =====================
  // ============================
  // Tabbar: 4 icone principali
  // (chiamato da app.js → Icons.initTabbar())
  // ============================
  async function loadTabbarIcons() {
    // Calendario: icona con giorno/mese dinamici
    await loadSVGInto("icoCalendar", "calendar.svg");
    setCalendarIconDateInSvg();

    // Inserimenti / Pagamenti
    await loadSVGInto("icoInspag", "inspag.svg");

    // Riepilogo
    await loadSVGInto("icoRiepilogo", "riepilogo.svg");

    // Impostazioni
    await loadSVGInto("icoSettings", "settings.svg");

    // Quando tutte le icone sono pronte, rendi visibili gli SVG
    const tabbar = document.querySelector(".tabbar");
    if (tabbar) {
      tabbar.classList.add("tabbar-icons-ready");
    }
  }
  // ===================== SPLIT tabbar_icons_loader : END   =====================

  // ===================== SPLIT status_icon_loader : START =====================
  // ============================
  // Icona stato / login:
  // - SVG login.svg dentro #icoStatus
  // - gli stati (idle/saving/ok) sono gestiti da status.js via classi sul wrapper
  // ============================
  async function loadStatusIcon() {
    await loadSVGInto("icoStatus", "login.svg");
  }
  // ===================== SPLIT status_icon_loader : END   =====================

  // ===================== SPLIT public_api_exports : START =====================
  // ============================
  // API pubblica
  // ============================
  window.Icons = {
    initTabbar: loadTabbarIcons,
    loadStatusIcon
  };
  // ===================== SPLIT public_api_exports : END   =====================

})();
