// ============================
// turnazione.js
// Gestione CARD Turnazioni + navigazione verso pannello "turnazioni-add"
// + UI "Aggiungi turnazione":
//   - Giorni (desktop select / mobile input) + caselle 1..7
//   - Riposo del Lunedì (toggle + espansione Nome/Sigla/Colore/Preview)
//   - Riposo del Martedì (identico)
//   - Help (?) con toast 3 secondi (per ciascuna card)
// ============================

(function () {
  function initTurnazioniAddUI() {
    // pannello "Aggiungi turnazione"
    const panelAdd = document.querySelector('.settings-panel.settings-turnazioni-add[data-settings-id="turnazioni-add"]');
    if (!panelAdd) return;

    // ----------------------------
    // CARD: Giorni + griglia 1..7
    // ----------------------------
    const select = panelAdd.querySelector("#turnazioniDaysSelect");
    const input  = panelAdd.querySelector("#turnazioniDaysInput");
    const grid   = panelAdd.querySelector("#turnazioniDaysGrid");

    function renderDaysGrid(n) {
      if (!grid) return;
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
    if (select && input && grid) {
      renderDaysGrid(null);

      // Desktop: select
      select.addEventListener("change", () => {
        const v = Number(select.value) || null;
        input.value = select.value;
        renderDaysGrid(v);
      });

      // Mobile: input -> prende solo ultimo carattere, sovrascrive sempre
      input.addEventListener("input", () => {
        const digits = (input.value || "").replace(/\D/g, "");
        const last = digits.slice(-1);

        const v = Number(last);

        if (!v || v < 1 || v > 7) {
          input.value = "";
          if (select) select.value = "";
          renderDaysGrid(null);
          return;
        }

        input.value = last;
        if (select) select.value = last;
        renderDaysGrid(v);
      });
    }

    // -----------------------------------------
    // Helpers condivisi per le card "Riposo"
    // -----------------------------------------
    function applySiglaFontSize(el, txt) {
      if (!el) return;

      if (window.TurniRender && typeof TurniRender.applySiglaFontSize === "function") {
        TurniRender.applySiglaFontSize(el, txt);
        return;
      }

      const len = (txt || "").length;
      let size = 11.5;
      if (len <= 2) size = 15;
      else if (len === 3) size = 14;
      el.style.fontSize = `${size}px`;
    }

    function initRiposoCard(opts) {
      const {
        cardSel,
        toggleSel,
        bodySel,
        helpBtnSel,
        helpToastSel,
        inputNomeSel,
        inputSiglaSel,
        colorInputSel,
        colorPrevSel,
        siglaPrevSel
      } = opts || {};

      const cardEl    = panelAdd.querySelector(cardSel);
      const toggleBtn = panelAdd.querySelector(toggleSel);
      const bodyEl    = panelAdd.querySelector(bodySel);

      const helpBtn   = panelAdd.querySelector(helpBtnSel);
      const helpToast = panelAdd.querySelector(helpToastSel);

      const inputNome  = panelAdd.querySelector(inputNomeSel);
      const inputSigla = panelAdd.querySelector(inputSiglaSel);

      const colorInput = panelAdd.querySelector(colorInputSel);
      const colorPrev  = panelAdd.querySelector(colorPrevSel);
      const siglaPrev  = panelAdd.querySelector(siglaPrevSel);

      if (!cardEl || !toggleBtn || !bodyEl) return;

      let on = false;

      function applyColorPreview() {
        if (!colorInput || !colorPrev || !siglaPrev) return;
        const v = colorInput.value || "#0a84ff";
        colorPrev.style.backgroundColor = v;
        siglaPrev.style.color = v;
      }

      function updateSiglaPreview() {
        if (!siglaPrev || !inputSigla) return;
        const txt = (inputSigla.value || "").trim();
        siglaPrev.textContent = txt || "";
        applySiglaFontSize(siglaPrev, txt);
      }

      function clearFields() {
        if (inputNome)  inputNome.value = "";
        if (inputSigla) inputSigla.value = "";
        if (siglaPrev)  siglaPrev.textContent = "";

        if (colorInput) colorInput.value = "#0a84ff";
        applyColorPreview();
        updateSiglaPreview();
      }

      function applyState() {
        toggleBtn.classList.toggle("is-on", on);
        toggleBtn.setAttribute("aria-checked", on ? "true" : "false");
        cardEl.classList.toggle("is-on", on);
        bodyEl.hidden = !on;
      }

      // stato iniziale: OFF
      bodyEl.hidden = true;
      clearFields();
      applyState();

      // toggle
      toggleBtn.addEventListener("click", () => {
        on = !on;
        if (!on) clearFields();
        applyState();
      });

      // listeners input
      if (colorInput) {
        colorInput.addEventListener("input", applyColorPreview);
        colorInput.addEventListener("change", applyColorPreview);
      }

      if (inputSigla) {
        inputSigla.addEventListener("input", () => {
          updateSiglaPreview();
        });
      }

      // Help toast (?) — 3 secondi
      if (helpBtn && helpToast) {
        let t = null;

        function showToast() {
          helpToast.hidden = false;

          if (t) clearTimeout(t);
          t = setTimeout(() => {
            helpToast.hidden = true;
            t = null;
          }, 3000);
        }

        helpBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          showToast();
        });
      }
    }

    // ----------------------------
    // CARD: Riposo del Lunedì
    // ----------------------------
    initRiposoCard({
      cardSel:      "[data-turnazioni-riposo-card]",
      toggleSel:    "[data-turnazioni-riposo-toggle]",
      bodySel:      "[data-turnazioni-riposo-body]",
      helpBtnSel:   "[data-turnazioni-help]",
      helpToastSel: "[data-turnazioni-help-toast]",
      inputNomeSel: "#turnazioniRiposoNome",
      inputSiglaSel:"#turnazioniRiposoSigla",
      colorInputSel:"[data-turnazioni-riposo-color]",
      colorPrevSel: "[data-turnazioni-riposo-color-preview]",
      siglaPrevSel: "[data-turnazioni-riposo-sigla-preview]"
    });

    // ----------------------------
    // CARD: Riposo del Martedì (identica)
    // ----------------------------
    initRiposoCard({
      cardSel:      "[data-turnazioni-riposo2-card]",
      toggleSel:    "[data-turnazioni-riposo2-toggle]",
      bodySel:      "[data-turnazioni-riposo2-body]",
      helpBtnSel:   "[data-turnazioni-help2]",
      helpToastSel: "[data-turnazioni-help-toast2]",
      inputNomeSel: "#turnazioniRiposo2Nome",
      inputSiglaSel:"#turnazioniRiposo2Sigla",
      colorInputSel:"[data-turnazioni-riposo2-color]",
      colorPrevSel: "[data-turnazioni-riposo2-color-preview]",
      siglaPrevSel: "[data-turnazioni-riposo2-sigla-preview]"
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
