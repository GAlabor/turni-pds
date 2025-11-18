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

  function loadTheme() {
    let saved = localStorage.getItem(THEME_KEY);
    if (!saved) {
      saved = "system";
    }

    applyTheme(saved);

    const input = document.querySelector(`input[name="theme"][value="${saved}"]`);
    if (input) {
      input.checked = true;
    }
  }

  function setupThemeControls() {
    const radios = document.querySelectorAll('input[name="theme"]');
    radios.forEach(r => {
      r.addEventListener("change", () => {
        const value = r.value;
        localStorage.setItem(THEME_KEY, value);
        applyTheme(value);
      });
    });
  }

  function initTheme() {
    loadTheme();
    setupThemeControls();
  }

  // ----------------------------
  // Tabbar: switch viste + long press calendario
  // ----------------------------

  let calendarLongPress = false;
  let calendarLongPressTimer = null;

  function initTabs() {
    const tabs = document.querySelectorAll(".tab");
    const views = document.querySelectorAll(".view");
    const calendarTab = document.querySelector('.tab[data-tab="calendar"]');

    if (!tabs.length || !views.length) return;

    tabs.forEach(tab => {
      tab.addEventListener("click", (event) => {
        const target = tab.dataset.tab;

        // TAB CALENDARIO: comportamento speciale
        if (target === "calendar") {
          // se il long press ha già aperto il menu, ignoro il click di rimbalzo
          if (calendarLongPress) {
            calendarLongPress = false;
            event.preventDefault();
            event.stopPropagation();
            return;
          }

          const calendarView = document.querySelector(".view-calendar");
          const isCalendarActive = calendarView && calendarView.classList.contains("is-active");

          if (isCalendarActive && window.Calendar && typeof Calendar.resetToToday === "function") {
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

// Long press sulla tab calendario per aprire "Vai a data"
if (calendarTab && window.Calendar && typeof Calendar.openDateJumpSheet === "function") {
  const LONG_PRESS_MS = 550;

  function startPress(ev) {
    calendarLongPress = false;

    if (calendarLongPressTimer) {
      clearTimeout(calendarLongPressTimer);
    }

    // Solo su mouse evitiamo selezione / focus,
    // sui touch NON facciamo preventDefault così il click continua a funzionare.
    if (ev && ev.type === "mousedown" && typeof ev.preventDefault === "function") {
      ev.preventDefault();
    }

    calendarLongPressTimer = setTimeout(() => {
      calendarLongPress = true;
      calendarTab.classList.add("long-press");
      Calendar.openDateJumpSheet();
    }, LONG_PRESS_MS);
  }

  function cancelPress() {
    if (calendarLongPressTimer) {
      clearTimeout(calendarLongPressTimer);
      calendarLongPressTimer = null;
    }
    if (!calendarLongPress) {
      calendarTab.classList.remove("long-press");
    }
  }

  calendarTab.addEventListener("mousedown", startPress);
  calendarTab.addEventListener("touchstart", startPress, { passive: true });

  ["mouseup", "mouseleave", "touchend", "touchcancel"].forEach((evName) => {
    calendarTab.addEventListener(evName, cancelPress);
  });
}

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
  });
})();
