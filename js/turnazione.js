// ============================
// turnazione.js
// (per ora) Gestione CARD Turnazioni + navigazione verso pannello "turnazioni-add"
// Non implementa ancora i dati: mantiene lo scheletro pulito e separato.
// ============================

(function () {
  const Turnazione = {
    init(ctx) {
      const {
        panelTurni,
        turnazioniCard,
        turnazioniToggleBtn,
        turnazioniHeader,
        turnazioniAddBtn,
        turnazioniEditBtn
      } = ctx || {};

      if (!panelTurni || !turnazioniCard || !turnazioniToggleBtn) return;

      // Stato iniziale dalla classe HTML
      let turnazioniCollapsed = turnazioniCard.classList.contains("is-collapsed");

      function getCollapsed() { return turnazioniCollapsed; }
      function setCollapsed(v) { turnazioniCollapsed = !!v; }

      // Collapse behavior (header + freccia)
      if (window.TurniInteractions && typeof TurniInteractions.attachCollapsibleCard === "function") {
        TurniInteractions.attachCollapsibleCard({
          cardEl: turnazioniCard,
          toggleBtn: turnazioniToggleBtn,
          headerEl: turnazioniHeader,
          getCollapsed,
          setCollapsed,
          ignoreClickSelectors: ["[data-turnazioni-add]", "[data-turnazioni-toggle]", "[data-turnazioni-edit]"]
        });
      } else {
        // fallback minimale
        function apply() {
          turnazioniCard.classList.toggle("is-collapsed", turnazioniCollapsed);
          turnazioniToggleBtn.setAttribute("aria-expanded", turnazioniCollapsed ? "false" : "true");
        }
        apply();
        turnazioniToggleBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          turnazioniCollapsed = !turnazioniCollapsed;
          apply();
        });
      }

      // Add -> pannello turnazioni-add
      if (turnazioniAddBtn) {
        turnazioniAddBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          if (window.SettingsUI && typeof SettingsUI.openPanel === "function") {
            window.__turniInternalNav = true;
            SettingsUI.openPanel("turnazioni-add");
          }
        });
      }

      // Edit resta disabilitato finché non ci sono turnazioni reali
      if (turnazioniEditBtn) {
        turnazioniEditBtn.disabled = true;
      }

      // API interna opzionale (se poi vuoi comandarla da turni.js)
      this._getState = () => ({ collapsed: turnazioniCollapsed });
      this._setCollapsed = (v) => {
        turnazioniCollapsed = !!v;
        turnazioniCard.classList.toggle("is-collapsed", turnazioniCollapsed);
        turnazioniToggleBtn.setAttribute("aria-expanded", turnazioniCollapsed ? "false" : "true");
      };
    }
  };

  window.Turnazione = Turnazione;
})();
