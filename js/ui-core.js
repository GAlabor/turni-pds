// ============================
// UI core: tabs, tema, icone SVG
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

        localStorage.setItem(THEME_KEY, value);
        applyTheme(value);
        syncThemeUI(value);
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
    const themePanel = settingsView.querySelector(".settings-theme");
    const themeRow = settingsView.querySelector('[data-settings-page="theme"]');
    const backBtn = settingsView.querySelector("[data-settings-back]");

    if (!main || !themePanel) return;

    const showMain = () => {
      main.classList.add("is-active");
      themePanel.classList.remove("is-active");
    };

    const showTheme = () => {
      main.classList.remove("is-active");
      themePanel.classList.add("is-active");
    };

    // stato iniziale
    showMain();

    if (themeRow) {
      themeRow.addEventListener("click", showTheme);
    }

    if (backBtn) {
      backBtn.addEventListener("click", showMain);
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
  });
})();
