// ============================
// turnazione.js
// Gestione CARD Turnazioni + navigazione verso pannello "turnazioni-add"
// + UI "Aggiungi turnazione":
//   - Giorni (desktop select / mobile input) + caselle 1..7
//   - Cambia Riposo Lunedì (toggle + espansione Nome/Sigla/Colore/Preview)
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
          select.value = "";
          renderDaysGrid(null);
          return;
        }

        input.value = last;
        select.value = last;
        renderDaysGrid(v);
      });
    }

    // ----------------------------
    // CARD: Cambia Riposo Lunedì (nuova)
    // ----------------------------
    const riposoCard  = panelAdd.querySelector("[data-turnazioni-riposo-card]");
    const toggleBtn   = panelAdd.querySelector("[data-turnazioni-riposo-toggle]");
    const bodyEl      = panelAdd.querySelector("[data-turnazioni-riposo-body]");

    const inputNome   = panelAdd.querySelector("#turnazioniRiposoNome");
    const inputSigla  = panelAdd.querySelector("#turnazioniRiposoSigla");

    const colorInput  = panelAdd.querySelector("[data-turnazioni-riposo-color]");
    const colorPrev   = panelAdd.querySelector("[data-turnazioni-riposo-color-preview]");
    const siglaPrev   = panelAdd.querySelector("[data-turnazioni-riposo-sigla-preview]");

    if (!riposoCard || !toggleBtn || !bodyEl) return;

    let riposoOn = false;

    // fallback se TurniRender non c'è (ma nel tuo load order c'è)
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

    function clearRiposoFields() {
      if (inputNome)  inputNome.value = "";
      if (inputSigla) inputSigla.value = "";
      if (siglaPrev)  siglaPrev.textContent = "";

      if (colorInput) colorInput.value = "#0a84ff";
      applyColorPreview();
      updateSiglaPreview();
    }

    function applyRiposoState() {
      toggleBtn.classList.toggle("is-on", riposoOn);
      toggleBtn.setAttribute("aria-checked", riposoOn ? "true" : "false");

      riposoCard.classList.toggle("is-on", riposoOn);

      // corpo: mostra/nascondi
      if (riposoOn) {
        bodyEl.hidden = false;
      } else {
        bodyEl.hidden = true;
      }
    }

    // stato iniziale: OFF
    bodyEl.hidden = true;
    clearRiposoFields();
    applyRiposoState();

    // toggle
    toggleBtn.addEventListener("click", () => {
      riposoOn = !riposoOn;

      // se spengo: reset campi
      if (!riposoOn) {
        clearRiposoFields();
      }

      applyRiposoState();
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
