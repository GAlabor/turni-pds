// ============================
// turnazioni.js
// Orchestratore Turnazioni:
// - collapse card
// - open pannello add
// - init lista + init add/picker
// ============================

(function () {
  const Turnazioni = {
    _setCollapsed: null,

    init(ctx) {
      const {
        panelTurni,
        turnazioniCard,
        turnazioniToggleBtn,
        turnazioniHeader,
        turnazioniAddBtn,
        turnazioniEditBtn,
        visualHintEl
      } = ctx || {};

      if (!panelTurni) {
        // anche se manca la card, l’UI add può esistere
        if (window.TurnazioniAdd && typeof TurnazioniAdd.init === "function") {
          TurnazioniAdd.init(ctx);
        }
        return;
      }

      const turnazioniListEl = panelTurni.querySelector("[data-turnazioni-list]");
      const turnazioniEmpty  = panelTurni.querySelector("[data-turnazioni-empty-hint]");

      // Stato iniziale
      let turnazioniCollapsed = turnazioniCard
        ? turnazioniCard.classList.contains("is-collapsed")
        : true;

      function getCollapsed() { return turnazioniCollapsed; }
      function setCollapsed(v) { turnazioniCollapsed = !!v; }

      // Collapse behavior
      if (turnazioniCard && turnazioniToggleBtn) {
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
      }

      // Add -> pannello turnazioni-add
      if (turnazioniAddBtn) {
        turnazioniAddBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          if (window.SettingsUI && typeof SettingsUI.openPanel === "function") {
            SettingsUI.openPanel("turnazioni-add", { internal: true });
          }
        });
      }

      if (turnazioniEditBtn) turnazioniEditBtn.disabled = true;

      // Init lista + add
      if (window.TurnazioniList && typeof TurnazioniList.init === "function") {
        TurnazioniList.init({
          panelTurni,
          turnazioniListEl,
          turnazioniEmptyEl: turnazioniEmpty,
          visualHintEl
        });
      }

      if (window.TurnazioniAdd && typeof TurnazioniAdd.init === "function") {
        TurnazioniAdd.init({
          panelTurni,
          turnazioniListEl,
          turnazioniEmptyEl: turnazioniEmpty,
          visualHintEl
        });
      }

      this._setCollapsed = (v) => {
        turnazioniCollapsed = !!v;
        if (turnazioniCard && turnazioniToggleBtn) {
          turnazioniCard.classList.toggle("is-collapsed", turnazioniCollapsed);
          turnazioniToggleBtn.setAttribute("aria-expanded", turnazioniCollapsed ? "false" : "true");
        }
      };
    }
  };

  window.Turnazioni = Turnazioni;
})();
