// ============================
// Orchestratore Turnazioni:
// collapse card
// open pannello add
// init lista + init add/picker
// turnazioni.js v 1.0
// ============================

(function () {
  // ===================== SPLIT module-shell : START =====================
  const Turnazioni = {
    _setCollapsed: null,

    init(ctx) {
      // ===================== SPLIT init-context : START =====================
      const {
        panelTurni,
        turnazioniCard,
        turnazioniToggleBtn,
        turnazioniHeader,
        turnazioniAddBtn,
        turnazioniEditBtn,
        visualHintEl
      } = ctx || {};
      // ===================== SPLIT init-context : END   =====================

      // ===================== SPLIT guard-missing-panel : START =====================
      if (!panelTurni) {
        // anche se manca la card, l’UI add può esistere
        if (window.TurnazioniAdd && typeof TurnazioniAdd.init === "function") {
          TurnazioniAdd.init(ctx);
        }
        return;
      }
      // ===================== SPLIT guard-missing-panel : END   =====================

      // ===================== SPLIT dom-query : START =====================
      const turnazioniListEl = panelTurni.querySelector("[data-turnazioni-list]");
      const turnazioniEmpty  = panelTurni.querySelector("[data-turnazioni-empty-hint]");
      // ===================== SPLIT dom-query : END   =====================

      // ===================== SPLIT state-collapsed : START =====================
      // Stato iniziale
      let turnazioniCollapsed = turnazioniCard
        ? turnazioniCard.classList.contains("is-collapsed")
        : true;

      function getCollapsed() { return turnazioniCollapsed; }
      function setCollapsed(v) { turnazioniCollapsed = !!v; }
      // ===================== SPLIT state-collapsed : END   =====================

      // ===================== SPLIT collapse-behavior : START =====================
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
      // ===================== SPLIT collapse-behavior : END   =====================

      // ===================== SPLIT open-add-panel : START =====================
      // Add -> pannello turnazioni-add
      if (turnazioniAddBtn) {
        turnazioniAddBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          if (window.SettingsUI && typeof SettingsUI.openPanel === "function") {
            SettingsUI.openPanel("turnazioni-add", { internal: true });
          }
        });
      }
      // ===================== SPLIT open-add-panel : END   =====================

      // ===================== SPLIT edit-disabled : START =====================
      if (turnazioniEditBtn) turnazioniEditBtn.disabled = true;
      // ===================== SPLIT edit-disabled : END   =====================

      // ===================== SPLIT init-list-and-add : START =====================
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
      // ===================== SPLIT init-list-and-add : END   =====================

      // ===================== SPLIT api-set-collapsed : START =====================
      this._setCollapsed = (v) => {
        turnazioniCollapsed = !!v;
        if (turnazioniCard && turnazioniToggleBtn) {
          turnazioniCard.classList.toggle("is-collapsed", turnazioniCollapsed);
          turnazioniToggleBtn.setAttribute("aria-expanded", turnazioniCollapsed ? "false" : "true");
        }
      };
      // ===================== SPLIT api-set-collapsed : END   =====================
    }
  };
  // ===================== SPLIT module-shell : END   =====================

  // ===================== SPLIT export-global : START =====================
  window.Turnazioni = Turnazioni;
  // ===================== SPLIT export-global : END   =====================
})();
