// ============================
// Bootstrap UI core
// - Inizializza moduli principali
// - Gestisce il comportamento della tabbar
// app.js
// ============================

(function () {
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

  // ============================
  // Normalizzazione input time: 24 → 00
  // (per tutti gli <input type="time" data-time-fix-24>)
  // ============================

  function normalizeTime24Value(value) {
    if (typeof value !== "string" || !value) return value;

    const parts = value.split(":");
    if (!parts.length) return value;

    const rawH = parts[0].trim();
    let h = parseInt(rawH, 10);
    if (Number.isNaN(h)) return value;

    // accettiamo 24:xx → 00:xx
    if (h === 24) {
      h = 0;
    } else if (h < 0 || h > 24) {
      // fuori range, non tocchiamo nulla
      return value;
    }

    const mmRaw = parts[1] != null ? parts[1] : "00";
    const mm = mmRaw.slice(0, 2);

    const hh = String(h).padStart(2, "0");
    return `${hh}:${mm}`;
  }

  function initTime24Fix() {
    const inputs = document.querySelectorAll('input[type="time"][data-time-fix-24]');
    if (!inputs.length) return;

    inputs.forEach(input => {
      input.addEventListener("input", () => {
        const current = input.value;
        const normalized = normalizeTime24Value(current);
        if (normalized && normalized !== current) {
          input.value = normalized;
        }
      });
    });
  }

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

    // Normalizza input orari (24 -> 00) dove richiesto
    initTime24Fix();

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
})();
