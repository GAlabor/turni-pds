// ============================
// UI core: tabs, tema, icone SVG + stato
// ============================

(function () {
  // ----------------------------
  // Tema: system / light / dark
  // ----------------------------

  const THEME_KEY = "turnipds-theme";

  function applyTheme(theme) {
    const root = document.documentElement;

    if (theme === "light" || theme === "dark") {
      root.setAttribute("data-theme", theme);
    } else {
      // "system": nessun attributo, lascia lavorare prefers-color-scheme
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
    if (!saved) {
      saved = "system";
    }

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

        // "Salvataggio" delle preferenze tema
        localStorage.setItem(THEME_KEY, value);
        applyTheme(value);
        syncThemeUI(value);

        // Trigger stato salvataggio
        if (window.Status && typeof Status.setSaving === "function") {
          Status.setSaving();
          setTimeout(() => {
            if (window.Status && typeof Status.setOk === "function") {
              Status.setOk();
            }
          }, 800);
        }
      });
    });
  }

  function initTheme() {
    loadTheme();
    setupThemeControls();
  }

  // ----------------------------
  // Navigazione schermate impostazioni
  // ----------------------------

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

  // ----------------------------
  // Pannello Turni (UI placeholder)
  // ----------------------------

  function initTurniPanel() {
    const panel = document.querySelector(".settings-panel.settings-turni");
    const TURNI_KEY = "turnipds-turni";
    if (!panel) return;

    // Toggle "Visualizza turnazione su calendario"
    const toggle = panel.querySelector("[data-turni-visual-toggle]");
    if (toggle) {
      toggle.addEventListener("click", () => {
        const isOn = !toggle.classList.contains("is-on");
        toggle.classList.toggle("is-on", isOn);
        toggle.setAttribute("aria-pressed", isOn ? "true" : "false");
        // Per ora UI-only, nessun salvataggio/logica
      });
    }

        // Riga "Aggiungi turno" → apre/chiude il form
    const openBtn = panel.querySelector("[data-turni-open]");
    const form = panel.querySelector("[data-turni-form]");
    const iconAdd = openBtn ? openBtn.querySelector(".turni-add-icon") : null;

    if (openBtn && form) {
      openBtn.addEventListener("click", () => {
        const isHidden = form.hasAttribute("hidden");

        if (isHidden) {
          form.removeAttribute("hidden");
          if (iconAdd) iconAdd.textContent = "‹";
          openBtn.setAttribute("aria-expanded", "true");
        } else {
          form.setAttribute("hidden", "");
          if (iconAdd) iconAdd.textContent = "+";
          openBtn.setAttribute("aria-expanded", "false");
        }
      });
    }


    // Colore: sync preview con input color
    const colorInput = panel.querySelector("[data-turni-color]");
    const colorPreview = panel.querySelector("[data-turni-color-preview]");
    if (colorInput && colorPreview) {
      const applyColor = () => {
        colorPreview.style.backgroundColor = colorInput.value || "#0a84ff";
      };
      applyColor();
      colorInput.addEventListener("input", applyColor);
      colorInput.addEventListener("change", applyColor);
    }

        const colorTrigger = panel.querySelector("[data-turni-color-trigger]");
    if (colorTrigger && colorInput) {
      colorTrigger.addEventListener("click", () => {
        colorInput.click();
      });
    }

        // ----------------------------
    // Gestione lista turni + salvataggio
    // ----------------------------

    const listEl = panel.querySelector("[data-turni-list]");
    const submitBtn = panel.querySelector("[data-turni-submit]");

    const inputNome   = panel.querySelector("#turnoNome");
    const inputSigla  = panel.querySelector("#turnoSigla");
    const inputInizio = panel.querySelector("#turnoOraInizio");
    const inputFine   = panel.querySelector("#turnoOraFine");

    function loadTurni() {
      try {
        const raw = localStorage.getItem(TURNI_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }

    function saveTurni(turni) {
      try {
        localStorage.setItem(TURNI_KEY, JSON.stringify(turni));
        // Stato salvataggio
        if (window.Status && typeof Status.setSaving === "function") {
          Status.setSaving();
          setTimeout(() => {
            if (window.Status && typeof Status.setOk === "function") {
              Status.setOk();
            }
          }, 400);
        }
      } catch (e) {
        console.warn("Salvataggio turni fallito:", e);
      }
    }

    function renderTurni(turni) {
      if (!listEl) return;
      listEl.innerHTML = "";
      if (!turni.length) return;

      turni.forEach(t => {
        const row = document.createElement("div");
        row.className = "turno-item";

        const nameEl = document.createElement("span");
        nameEl.className = "turno-name";
        nameEl.textContent = t.nome || "";

        const siglaEl = document.createElement("span");
        siglaEl.className = "turno-sigla";
        siglaEl.textContent = t.sigla || "";

        const orarioEl = document.createElement("span");
        orarioEl.className = "turno-orario";
        if (t.inizio && t.fine) {
          orarioEl.textContent = `${t.inizio} - ${t.fine}`;
        }

        row.appendChild(nameEl);
        row.appendChild(siglaEl);
        row.appendChild(orarioEl);
        listEl.appendChild(row);
      });
    }

    // Render iniziale da localStorage
    const turniIniziali = loadTurni();
    renderTurni(turniIniziali);

    // Click sul bottone "Aggiungi" dentro il form
    if (submitBtn && inputNome && inputSigla && inputInizio && inputFine && colorInput) {
      submitBtn.addEventListener("click", () => {
        const nome   = inputNome.value.trim();
        const sigla  = inputSigla.value.trim();
        const inizio = inputInizio.value;
        const fine   = inputFine.value;
        const colore = colorInput.value || "#0a84ff";

        // Niente UX complicata: se manca qualcosa, non salviamo
        if (!nome || !sigla || !inizio || !fine) {
          return;
        }

        const turni = loadTurni();
        turni.push({ nome, sigla, inizio, fine, colore });
        saveTurni(turni);
        renderTurni(turni);

        // reset campi base
        inputNome.value   = "";
        inputSigla.value  = "";
        inputInizio.value = "";
        inputFine.value   = "";
        // Il colore resta quello scelto
      });
    }
  }

  // ----------------------------
  // Tabbar: switch viste
  // ----------------------------

  function initTabs() {
    const tabs = document.querySelectorAll(".tab");
    const views = document.querySelectorAll(".view");

    if (!tabs.length || !views.length) return;

    tabs.forEach(tab => {
      tab.addEventListener("click", () => {
        const target = tab.dataset.tab;

        // TAB CALENDARIO: se è già attiva → torna a oggi
        if (target === "calendar") {
          const calendarView = document.querySelector(".view-calendar");
          const isCalendarActive =
            calendarView && calendarView.classList.contains("is-active");

          if (isCalendarActive &&
              window.Calendar &&
              typeof Calendar.resetToToday === "function") {
            Calendar.resetToToday();
            return;
          }
        }

        // Comportamento standard delle tab
        tabs.forEach(t => t.classList.toggle("active", t === tab));
        views.forEach(v => {
          v.classList.toggle("is-active", v.dataset.view === target);
        });
      });
    });
  }

  // ----------------------------
  // Icone SVG tabbar
  // ----------------------------

  function app_base() {
    if (location.hostname === "localhost") return "";
    const seg = location.pathname.split("/").filter(Boolean)[0] || "turni-pds";
    return "/" + seg;
  }

  // Aggiorna mese e giorno dentro l'SVG del calendario
  function setCalendarIconDateInSvg() {
    const host = document.getElementById("icoCalendar");
    if (!host) return;

    const now = new Date();
    const months = ["GEN","FEB","MAR","APR","MAG","GIU","LUG","AGO","SET","OTT","NOV","DIC"];

    const monthEl = host.querySelector("#calMonth");
    const dayEl   = host.querySelector("#calDay");

    if (monthEl) monthEl.textContent = months[now.getMonth()];
    if (dayEl)   dayEl.textContent   = now.getDate();
  }

  async function loadTabbarIcons() {
    try {
      // ----- ICONA CALENDARIO -----
      const cal = await fetch(`${app_base()}/svg/calendar.svg`, {
        cache: "no-store",
        credentials: "same-origin"
      });

      if (cal.ok) {
        const txt = await cal.text();
        const host = document.getElementById("icoCalendar");

        if (host) {
          host.innerHTML = txt;
          setCalendarIconDateInSvg();
        }
      }

      // ----- ICONA INSERIMENTI / PAGAMENTI -----
      const inspag = await fetch(`${app_base()}/svg/inspag.svg`, {
        cache: "no-store",
        credentials: "same-origin"
      });

      if (inspag.ok) {
        const txt = await inspag.text();
        const host = document.getElementById("icoInspag");

        if (host) {
          const temp = document.createElement("div");
          temp.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg">${txt}</svg>`;

          temp.querySelectorAll("svg > *")
            .forEach(n => host.appendChild(n.cloneNode(true)));
        }
      }

      // ----- ICONA RIEPILOGO -----
      const riepilogo = await fetch(`${app_base()}/svg/riepilogo.svg`, {
        cache: "no-store",
        credentials: "same-origin"
      });

      if (riepilogo.ok) {
        const txt = await riepilogo.text();
        const host = document.getElementById("icoRiepilogo");

        if (host) {
          const temp = document.createElement("div");
          temp.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg">${txt}</svg>`;

          temp.querySelectorAll("svg > *")
            .forEach(n => host.appendChild(n.cloneNode(true)));
        }
      }

      // ----- ICONA IMPOSTAZIONI -----
      const set = await fetch(`${app_base()}/svg/settings.svg`, {
        cache: "no-store",
        credentials: "same-origin"
      });

      if (set.ok) {
        const txt = await set.text();
        const host = document.getElementById("icoSettings");

        if (host) {
          const temp = document.createElement("div");
          temp.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg">${txt}</svg>`;

          temp.querySelectorAll("svg > *")
            .forEach(n => host.appendChild(n.cloneNode(true)));
        }
      }

    } catch (err) {
      console.error("Errore icone tabbar:", err);
    }
  }

  function initIcons() {
    loadTabbarIcons();
  }

  // ----------------------------
  // Icona stato / login.svg
  // ----------------------------

  async function loadStatusIcon() {
    try {
      const res = await fetch(`${app_base()}/svg/login.svg`, {
        cache: "no-store",
        credentials: "same-origin"
      });
      if (!res.ok) return;

      const txt = await res.text();
      const host = document.getElementById("icoStatus");
      if (!host) return;

      const temp = document.createElement("div");
      temp.innerHTML = txt.trim();
      const svg = temp.querySelector("svg");
      if (svg) {
        host.innerHTML = "";
        host.appendChild(svg);
      }
    } catch (err) {
      console.error("Errore icona stato:", err);
    }
  }

  const Status = {
    el: null,
    timer: null,

    init() {
      this.el = document.getElementById("statusIcon");
      if (!this.el) return;
      this.setIdle();
    },

    setIdle() {
      if (!this.el) return;
      this.el.classList.remove("status-saving", "status-ok");
      this.el.classList.add("status-idle");
    },

    setSaving() {
      if (!this.el) return;
      this.el.classList.remove("status-idle", "status-ok");
      this.el.classList.add("status-saving");
      if (this.timer) {
        clearTimeout(this.timer);
        this.timer = null;
      }
    },

    setOk() {
      if (!this.el) return;
      this.el.classList.remove("status-idle", "status-saving");
      this.el.classList.add("status-ok");
      if (this.timer) {
        clearTimeout(this.timer);
      }
      this.timer = setTimeout(() => {
        this.setIdle();
      }, 1500);
    }
  };

  window.Status = Status;

  // ----------------------------
  // Bootstrap UI core
  // ----------------------------

  window.addEventListener("DOMContentLoaded", () => {
    if (window.Calendar && typeof Calendar.init === "function") {
      Calendar.init();
    }
    initTheme();
    initTabs();
    initIcons();
    initSettingsNavigation();
    initTurniPanel();
    loadStatusIcon();
    Status.init();
  });
})();
