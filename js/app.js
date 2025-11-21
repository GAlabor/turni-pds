// ============================
// Bootstrap UI core
// ============================

(function () {
  // Tabbar: switch viste
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

  window.addEventListener("DOMContentLoaded", () => {
    if (window.Calendar && typeof Calendar.init === "function") {
      Calendar.init();
    }

    if (window.Theme && typeof Theme.init === "function") {
      Theme.init();
    }

    initTabs();

    if (window.Icons && typeof Icons.initTabbar === "function") {
      Icons.initTabbar();
      if (typeof Icons.loadStatusIcon === "function") {
        Icons.loadStatusIcon();
      }
    }

    if (window.SettingsUI && typeof SettingsUI.init === "function") {
      SettingsUI.init();
    }

    if (window.Turni && typeof Turni.init === "function") {
      Turni.init();
    }

    if (window.Status && typeof Status.init === "function") {
      Status.init();
    }
  });
})();
