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

          if (
            isSettingsActive &&
            window.SettingsUI &&
            typeof SettingsUI.showMain === "function"
          ) {
            // siamo già su settings → resetta solo il pannello
            SettingsUI.showMain();
            return;
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
})();
