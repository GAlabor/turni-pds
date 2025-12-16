// ============================
// turnazione.js
// Gestione CARD Turnazioni + navigazione verso pannello "turnazioni-add"
// + UI "Aggiungi turnazione":
//   - Giorni (desktop select / mobile input) + pill rotazione cliccabili
//   - Picker "Seleziona turno" (pagina) con lista turni creati
//   - Riposo del Lunedì / Martedì (toggle + espansione + help toast)
//   - "Imposta come giorno di riposo" nel picker + badge "R" nella pill
//   - ✅ Nuovo: Card "Giorni di Riposo" (1 / 2) che limita quanti giorni riposo puoi impostare
// ============================

(function () {
  function initTurnazioniAddUI() {
    // pannello "Aggiungi turnazione"
    const panelAdd = document.querySelector('.settings-panel.settings-turnazioni-add[data-settings-id="turnazioni-add"]');
    if (!panelAdd) return;

    // pannello picker (pagina)
    const panelPick = document.querySelector('.settings-panel.settings-turnazioni-pick[data-settings-id="turnazioni-pick"]');

    // ----------------------------
    // CARD: Giorni + griglia pill
    // ----------------------------
    const select = panelAdd.querySelector("#turnazioniDaysSelect");
    const input  = panelAdd.querySelector("#turnazioniDaysInput");
    const grid   = panelAdd.querySelector("#turnazioniDaysGrid");

    const subtitleEl    = panelAdd.querySelector("#turnazioniDaysSubtitle");
    const placeholderEl = panelAdd.querySelector("#turnazioniDaysPlaceholder");

    // picker UI
    const pickListEl = panelPick ? panelPick.querySelector("#turnazioniPickList") : null;
    const pickEmpty  = panelPick ? panelPick.querySelector("#turnazioniPickEmpty") : null;
    const pickHint   = panelPick ? panelPick.querySelector("#turnazioniPickHint") : null;

    // riposo nel picker
    const restRowEl    = panelPick ? panelPick.querySelector("#turnazioniPickRestRow") : null;
    const restToggleEl = panelPick ? panelPick.querySelector("#turnazioniRestToggle") : null;

    // ✅ nuova card "Giorni di Riposo" (1 / 2)
    const restDaysBtns = panelAdd.querySelectorAll('[data-turnazioni-rest-days]');

    // stato rotazione: 7 slot max (1..7)
    let rotationDaysCount = null;                // 1..7 o null
    let rotationSlots = new Array(7).fill(null); // slot -> { nome, sigla, colore, ... } oppure null
    let activePickIndex = null;                  // quale pill sto impostando (0..6)

    // ✅ quanti "giorni riposo" puoi impostare nella rotazione
    let restDaysAllowed = 1; // 1 o 2

    // ✅ stato "giorni di riposo": array di indici (0..6), lunghezza <= restDaysAllowed
    let restDayIndices = []; // es: [2] oppure [2,5]

    function clampRestDaysAllowed(v) {
      const n = Number(v);
      if (n === 2) return 2;
      return 1;
    }

    function normalizeRestIndicesToAllowed() {
      // se riduci da 2 -> 1, tieni solo il primo (quello “più vecchio”)
      if (restDayIndices.length > restDaysAllowed) {
        restDayIndices = restDayIndices.slice(0, restDaysAllowed);
      }
    }

    function isRestIndex(idx) {
      return restDayIndices.includes(idx);
    }

    function applyDaysUIState(n){
      const hasDays = !!n && n >= 1 && n <= 7;

      if (subtitleEl) {
        subtitleEl.textContent = hasDays
          ? "Tocca una casella per scegliere il turno"
          : "Nessuna rotazione impostata";
      }

      if (placeholderEl) {
        placeholderEl.style.display = hasDays ? "none" : "block";
        placeholderEl.textContent = "Seleziona da 1 a 7 per visualizzare la rotazione";
      }

      if (grid) {
        grid.style.display = hasDays ? "grid" : "none";
      }

      // se la rotazione è stata ridotta e qualche riposo va fuori range -> rimuovi quelli fuori range
      if (hasDays) {
        restDayIndices = restDayIndices.filter(i => i < n);
      } else {
        restDayIndices = [];
      }

      normalizeRestIndicesToAllowed();
    }

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

    function sameTurno(a, b) {
      if (!a || !b) return false;
      const an = (a.nome || "").trim();
      const as = (a.sigla || "").trim();
      const bn = (b.nome || "").trim();
      const bs = (b.sigla || "").trim();
      return an === bn && as === bs;
    }

    // ----------------------------
    // ✅ Card "Giorni di Riposo" (1 / 2) - UI
    // ----------------------------
    function syncRestDaysCardUI() {
      if (!restDaysBtns || !restDaysBtns.length) return;

      restDaysBtns.forEach(btn => {
        const v = clampRestDaysAllowed(btn.dataset.turnazioniRestDays || btn.dataset.turnazioniRestDays);
        const isActive = (v === restDaysAllowed);
        btn.classList.toggle("is-active", isActive);
        btn.setAttribute("aria-pressed", isActive ? "true" : "false");
      });
    }

    function setRestDaysAllowed(next) {
      restDaysAllowed = clampRestDaysAllowed(next);
      normalizeRestIndicesToAllowed();
      syncRestDaysCardUI();
      syncRestToggleUI();
      renderDaysGrid(rotationDaysCount);
    }

    if (restDaysBtns && restDaysBtns.length) {
      // default UI coerente con default (1)
      setRestDaysAllowed(1);

      restDaysBtns.forEach(btn => {
        btn.addEventListener("click", () => {
          const v = btn.dataset.turnazioniRestDays;
          setRestDaysAllowed(v);
        });
      });
    }

    // ----------------------------
    // ✅ Riposo: UI toggle nel picker
    // ----------------------------
    function syncRestToggleUI() {
      if (!restToggleEl) return;

      const isOn = (activePickIndex !== null && isRestIndex(activePickIndex));
      restToggleEl.classList.toggle("is-on", isOn);
      restToggleEl.setAttribute("aria-checked", isOn ? "true" : "false");
    }

    function setRestForActiveDay(nextOn) {
      if (activePickIndex === null) return;

      if (nextOn) {
        if (!isRestIndex(activePickIndex)) {
          // aggiungi e se sfori, rimuovi il più vecchio (FIFO)
          restDayIndices.push(activePickIndex);

          // unica regola: nessun duplicato
          restDayIndices = [...new Set(restDayIndices)];

          while (restDayIndices.length > restDaysAllowed) {
            restDayIndices.shift();
          }
        }
      } else {
        restDayIndices = restDayIndices.filter(i => i !== activePickIndex);
      }

      syncRestToggleUI();
      renderDaysGrid(rotationDaysCount);
    }

    if (restToggleEl) {
      restToggleEl.addEventListener("click", () => {
        const isOn = restToggleEl.classList.contains("is-on");
        setRestForActiveDay(!isOn);
      });
    }

    function openPickPanelForDay(index) {
      activePickIndex = index;

      if (pickHint) {
        pickHint.textContent = `Seleziona un turno per il giorno ${index + 1}.`;
      }

      if (restRowEl) {
        restRowEl.style.display = "flex";
      }

      syncRestToggleUI();
      renderPickList();

      if (window.SettingsUI && typeof SettingsUI.openPanel === "function") {
        window.__turniInternalNav = true;
        SettingsUI.openPanel("turnazioni-pick");
      }
    }

    function setSlotFromTurno(index, turnoObj) {
      if (index == null || index < 0 || index > 6) return;
      rotationSlots[index] = turnoObj || null;
      renderDaysGrid(rotationDaysCount);
    }

    function renderPickList() {
      if (!pickListEl) return;

      const turni = (window.TurniStorage && typeof TurniStorage.loadTurni === "function")
        ? TurniStorage.loadTurni()
        : [];

      pickListEl.innerHTML = "";

      const hasTurni = Array.isArray(turni) && turni.length > 0;

      if (pickEmpty) {
        pickEmpty.hidden = hasTurni;
      }

      if (!hasTurni) return;

      const selected = (activePickIndex !== null) ? rotationSlots[activePickIndex] : null;

      turni.forEach((t) => {
        const row = document.createElement("button");
        row.type = "button";
        row.className = "turnazioni-pick-row";

        // evidenzia se già selezionato per questa pill
        if (selected && sameTurno(selected, t)) {
          row.classList.add("is-selected");
        }

        const name = document.createElement("span");
        name.className = "turnazioni-pick-name";
        name.textContent = t.nome || "";

        row.appendChild(name);

        row.addEventListener("click", () => {
          // salva nello slot attivo
          if (activePickIndex !== null) {
            setSlotFromTurno(activePickIndex, t);
          }

          // torna alla pagina "Aggiungi turnazione"
          if (window.SettingsUI && typeof SettingsUI.openPanel === "function") {
            window.__turniInternalNav = true;
            SettingsUI.openPanel("turnazioni-add");
          }
        });

        pickListEl.appendChild(row);
      });
    }

    function renderDaysGrid(n) {
      if (!grid) return;

      rotationDaysCount = n || null;

      grid.innerHTML = "";

      for (let i = 1; i <= 7; i++) {
        // slot fuori range → non esiste
        if (!n || i > n) {
          const ghost = document.createElement("div");
          ghost.style.visibility = "hidden";
          grid.appendChild(ghost);
          continue;
        }

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "turnazioni-day-pill";

        const pill = document.createElement("div");
        pill.className = "turni-sigla-preview-pill";

        const txt = document.createElement("span");
        txt.className = "turni-sigla-preview-text";

        const slot = rotationSlots[i - 1];

        // se non selezionato → mostra numero (stesso stile, ma muted)
        if (!slot) {
          btn.classList.add("is-empty");
          txt.textContent = String(i);
          applySiglaFontSize(txt, String(i));
          txt.style.color = "";
        } else {
          const siglaVal = (slot.sigla || "").trim();
          txt.textContent = siglaVal; // qui compare SOLO la sigla
          applySiglaFontSize(txt, siglaVal);

          if (slot.colore) txt.style.color = slot.colore;
          else txt.style.color = "";
        }

        pill.appendChild(txt);

        // ✅ badge "R" solo se:
        // - questo giorno è tra i giorni di riposo
        // - ed esiste un turno selezionato (come avevi richiesto)
        if (isRestIndex(i - 1) && slot) {
          const badge = document.createElement("span");
          badge.className = "turnazioni-rest-badge";
          badge.textContent = "R";
          pill.appendChild(badge);
        }

        btn.appendChild(pill);

        btn.addEventListener("click", () => {
          openPickPanelForDay(i - 1);
        });

        grid.appendChild(btn);
      }

      applyDaysUIState(n);
    }

    // stato iniziale: 0/null
    if (select && input && grid) {
      renderDaysGrid(null);

      // Desktop: select
      select.addEventListener("change", () => {
        const v = Number(select.value) || null;
        input.value = select.value;

        // reset slot oltre range (se riduci i giorni)
        if (v && v >= 1 && v <= 7) {
          for (let k = v; k < 7; k++) rotationSlots[k] = null;

          // riposo fuori range -> rimuovi
          restDayIndices = restDayIndices.filter(i => i < v);
          normalizeRestIndicesToAllowed();
        } else {
          rotationSlots = new Array(7).fill(null);
          restDayIndices = [];
        }

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

          rotationSlots = new Array(7).fill(null);
          restDayIndices = [];
          renderDaysGrid(null);
          return;
        }

        input.value = last;
        if (select) select.value = last;

        // reset slot oltre range
        for (let k = v; k < 7; k++) rotationSlots[k] = null;

        // riposo fuori range -> rimuovi
        restDayIndices = restDayIndices.filter(i => i < v);
        normalizeRestIndicesToAllowed();

        renderDaysGrid(v);
      });
    }

    // -----------------------------------------
    // Helpers condivisi per le card "Riposo"
    // -----------------------------------------
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
