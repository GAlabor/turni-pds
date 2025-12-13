// ============================
// turnazione.js
// (per ora) Gestione CARD Turnazioni + navigazione verso pannello "turnazioni-add"
// + UI "Aggiungi turnazione": Giorni (desktop select / mobile input) + caselle 1..7
// ============================

(function () {
  function initTurnazioniAddUI() {
    // pannello "Aggiungi turnazione"
    const panelAdd = document.querySelector('.settings-panel.settings-turnazioni-add[data-settings-id="turnazioni-add"]');
    if (!panelAdd) return;

    const select = panelAdd.querySelector("#turnazioniDaysSelect");
    const input  = panelAdd.querySelector("#turnazioniDaysInput");
    const grid   = panelAdd.querySelector("#turnazioniDaysGrid");

    if (!select || !input || !grid) return;

    function render(n) {
      grid.innerHTML = "";

      for (let i = 1; i <= 7; i++) {
        const b = document.createElement("div");
        b.className = "turnazioni-day-box";

        if (!n || i > n) {
          b.style.visibility = "hidden";
        } else {
          b.textContent = String(i);
        }

        grid.appendChild(b);
      }
    }

    // stato iniziale: 0/null
    render(null);

    // Desktop: select
    select.addEventListener("change", () => {
      const v = Number(select.value) || null;
      input.value = select.value;
      render(v);
    });

    // Mobile: input -> prende solo ultimo carattere, sovrascrive sempre
    input.addEventListener("input", () => {
      const digits = (input.value || "").replace(/\D/g, "");
      const last = digits.slice(-1);

      const v = Number(last);

      if (!v || v < 1 || v > 7) {
        input.value = "";
        select.value = "";
        render(null);
        return;
      }

      input.value = last;
      select.value = last;
      render(v);
    });
  }

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

      if (!panelTurni || !turnazioniCard || !turnazioniToggleBtn) {
        // anche se non ho la card, la UI del pannello add può esistere comunque
        initTurnazioniAddUI();
        return;
      }

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

      // Init UI dentro "Aggiungi turnazione"
      initTurnazioniAddUI();

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
