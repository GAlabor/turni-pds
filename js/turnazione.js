// ============================
// turnazione.js
// Gestione CARD Turnazioni + navigazione verso pannello "turnazioni-add"
// + UI "Aggiungi turnazione":
//   - Giorni (desktop select / mobile input) + pill rotazione cliccabili
//   - Picker "Seleziona turno" (pagina) con lista turni creati
//   - Riposo del Lunedì / Martedì (toggle + espansione + help toast)
//   - "Imposta come giorno di riposo" nel picker + badge "R" nella pill
//   - ✅ Card "Giorni di Riposo" (1 / 2) che limita quanti giorni riposo puoi impostare
//   - ✅ Salvataggio turnazione + lista card selezionabili come preferita
//   - ✅ RESET form quando esci da "Aggiungi turnazione" senza salvare
// ============================

(function () {
  function initTurnazioniAddUI(ctx) {
    // pannello "Aggiungi turnazione"
    const panelAdd = document.querySelector(
      '.settings-panel.settings-turnazioni-add[data-settings-id="turnazioni-add"]'
    );
    if (!panelAdd) return;

    // pannello picker
    const panelPick = document.querySelector(
      '.settings-panel.settings-turnazioni-pick[data-settings-id="turnazioni-pick"]'
    );

    // ✅ refs pannello Turni (lista turnazioni + hint + visualizza turnazione)
    const panelTurni = (ctx && ctx.panelTurni)
      ? ctx.panelTurni
      : document.querySelector('.settings-panel.settings-turni[data-settings-id="turni"]');

    const turnazioniListEl = (ctx && ctx.turnazioniListEl)
      ? ctx.turnazioniListEl
      : (panelTurni ? panelTurni.querySelector("[data-turnazioni-list]") : null);

    const turnazioniEmptyEl = (ctx && ctx.turnazioniEmptyEl)
      ? ctx.turnazioniEmptyEl
      : (panelTurni ? panelTurni.querySelector("[data-turnazioni-empty-hint]") : null);

    const visualHintEl = panelTurni ? panelTurni.querySelector("[data-turni-visual-hint]") : null;

    // ✅ toolbar Salva (identica ad Aggiungi turno)
    const btnSave = panelAdd.querySelector("[data-turnazioni-save]");
    const errEl   = panelAdd.querySelector("[data-turnazioni-error]");

    // Giorni + griglia
    const select = panelAdd.querySelector("#turnazioniDaysSelect");
    const input  = panelAdd.querySelector("#turnazioniDaysInput");
    const grid   = panelAdd.querySelector("#turnazioniDaysGrid");

    const subtitleEl    = panelAdd.querySelector("#turnazioniDaysSubtitle");
    const placeholderEl = panelAdd.querySelector("#turnazioniDaysPlaceholder");

    // Nome turnazione
    const nameInput = panelAdd.querySelector("#turnazioniNome");

    // picker list
    const pickListEl = panelPick ? panelPick.querySelector("#turnazioniPickList") : null;
    const pickEmpty  = panelPick ? panelPick.querySelector("#turnazioniPickEmpty") : null;
    const pickHint   = panelPick ? panelPick.querySelector("#turnazioniPickHint") : null;

    // riposo nel picker
    const restRowEl    = panelPick ? panelPick.querySelector("#turnazioniPickRestRow") : null;
    const restToggleEl = panelPick ? panelPick.querySelector("#turnazioniRestToggle") : null;

    // card "Giorni di Riposo" (1/2)
    const restDaysBtns = panelAdd.querySelectorAll('[data-turnazioni-rest-days]');

    // ============================
    // ✅ Dirty tracking + anti-reset-after-save
    // ============================
    let isDirty = false;
    let lastSaveTs = 0;

    function markDirty() { isDirty = true; }

    function isGoingToPickPanel() {
      // quando passi da add -> pick NON devi resettare
      return !!(panelPick && panelPick.classList.contains("is-active"));
    }

    // stato rotazione
    let rotationDaysCount = null;                // 1..7 o null
    let rotationSlots = new Array(7).fill(null); // slot -> turno obj oppure null
    let activePickIndex = null;                  // 0..6

    // quanti giorni riposo
    let restDaysAllowed = 1; // 1 o 2
    let restDayIndices = []; // indici 0..6

    // ✅ Storage turnazioni
    const hasStorage =
      window.TurniStorage &&
      typeof TurniStorage.loadTurnazioni === "function" &&
      typeof TurniStorage.saveTurnazioni === "function" &&
      typeof TurniStorage.loadPreferredTurnazioneId === "function" &&
      typeof TurniStorage.savePreferredTurnazioneId === "function";

    let savedTurnazioni = hasStorage ? TurniStorage.loadTurnazioni() : [];
    let preferredId     = hasStorage ? TurniStorage.loadPreferredTurnazioneId() : null;

    // ----------------------------
    // Errori toolbar
    // ----------------------------
    let errorTimer = null;

    function clearError() {
      if (!errEl) return;
      if (errorTimer) {
        clearTimeout(errorTimer);
        errorTimer = null;
      }
      errEl.hidden = true;
    }

    function showError() {
      if (!errEl) return;
      clearError();
      errEl.hidden = false;
      errorTimer = setTimeout(() => {
        errEl.hidden = true;
      }, 2000);
    }

    // ----------------------------
    // Helpers UI giorni
    // ----------------------------
    function clampRestDaysAllowed(v) {
      const n = Number(v);
      return (n === 2) ? 2 : 1;
    }

    function normalizeRestIndicesToAllowed() {
      if (restDayIndices.length > restDaysAllowed) {
        restDayIndices = restDayIndices.slice(0, restDaysAllowed);
      }
    }

    function isRestIndex(idx) {
      return restDayIndices.includes(idx);
    }

    function applyDaysUIState(n) {
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

      // riposi fuori range
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
    // Card "Giorni di Riposo" (1 / 2)
    // ----------------------------
    function syncRestDaysCardUI() {
      if (!restDaysBtns || !restDaysBtns.length) return;

      restDaysBtns.forEach(btn => {
        const v = clampRestDaysAllowed(btn.dataset.turnazioniRestDays);
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
      markDirty();
    }

    if (restDaysBtns && restDaysBtns.length) {
      setRestDaysAllowed(1);
      restDaysBtns.forEach(btn => {
        btn.addEventListener("click", () => {
          const v = btn.dataset.turnazioniRestDays;
          setRestDaysAllowed(v);
        });
      });
    }

    // ----------------------------
    // Riposo: toggle nel picker
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
          restDayIndices.push(activePickIndex);
          restDayIndices = [...new Set(restDayIndices)];
          while (restDayIndices.length > restDaysAllowed) {
            restDayIndices.shift(); // FIFO
          }
        }
      } else {
        restDayIndices = restDayIndices.filter(i => i !== activePickIndex);
      }

      syncRestToggleUI();
      renderDaysGrid(rotationDaysCount);
      markDirty();
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
      markDirty();
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

        if (selected && sameTurno(selected, t)) {
          row.classList.add("is-selected");
        }

        const name = document.createElement("span");
        name.className = "turnazioni-pick-name";
        name.textContent = t.nome || "";

        row.appendChild(name);

        row.addEventListener("click", () => {
          if (activePickIndex !== null) {
            setSlotFromTurno(activePickIndex, t);
          }

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
        pill.style.position = "relative";

        const txt = document.createElement("span");
        txt.className = "turni-sigla-preview-text";

        const slot = rotationSlots[i - 1];

        if (!slot) {
          btn.classList.add("is-empty");
          txt.textContent = String(i);
          applySiglaFontSize(txt, String(i));
          txt.style.color = "";
        } else {
          const siglaVal = (slot.sigla || "").trim();
          txt.textContent = siglaVal;
          applySiglaFontSize(txt, siglaVal);
          txt.style.color = slot.colore ? slot.colore : "";
        }

        pill.appendChild(txt);

        // badge R solo se riposo + turno presente
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

    // ----------------------------
    // ✅ Rendering lista turnazioni (card piccole)
    // ----------------------------
    function formatSigle(turnazione) {
      const n = Number(turnazione && turnazione.days) || 0;
      const slots = Array.isArray(turnazione && turnazione.slots) ? turnazione.slots : [];
      const restIdx = Array.isArray(turnazione && turnazione.restIndices) ? turnazione.restIndices : [];

      const out = [];
      for (let i = 0; i < n; i++) {
        if (restIdx.includes(i)) {
          out.push("R");
        } else {
          const s = (slots[i] && slots[i].sigla) ? String(slots[i].sigla).trim() : "";
          out.push(s || "?");
        }
      }
      return out.join(" - ");
    }

    function syncVisualizzaTurnazioneHint() {
      if (!visualHintEl) return;

      if (!Array.isArray(savedTurnazioni) || savedTurnazioni.length === 0) {
        visualHintEl.textContent = "Nessuna turnazione impostata.";
        return;
      }

      let pick = null;
      if (preferredId) {
        pick = savedTurnazioni.find(t => String(t.id) === String(preferredId)) || null;
      }
      if (!pick) pick = savedTurnazioni[savedTurnazioni.length - 1];

      visualHintEl.textContent = (pick && pick.name) ? pick.name : "Turnazione";
    }

    function notifyTurniStartUI() {
      if (window.Turni && typeof Turni.syncTurnoInizialeUI === "function") {
        Turni.syncTurnoInizialeUI();
      }
    }

    function renderTurnazioniCards() {
      if (!turnazioniListEl) return;

      // ✅ ammazza qualsiasi “fantasma”
      turnazioniListEl.innerHTML = "";

      // ricarica storage (se è cambiato altrove)
      if (hasStorage) {
        savedTurnazioni = TurniStorage.loadTurnazioni();
        preferredId = TurniStorage.loadPreferredTurnazioneId();
      }

      const has = Array.isArray(savedTurnazioni) && savedTurnazioni.length > 0;

      // ✅ hint “Nessuna turnazione…”
      if (turnazioniEmptyEl) {
        turnazioniEmptyEl.hidden = has;
      }

      if (!has) {
        syncVisualizzaTurnazioneHint();
        notifyTurniStartUI();
        return;
      }

      // preferita valida?
      if (preferredId) {
        const ok = savedTurnazioni.some(t => String(t.id) === String(preferredId));
        if (!ok) preferredId = null;
      }

      // se non c’è preferita, scegli ultima
      if (!preferredId && savedTurnazioni.length) {
        preferredId = String(savedTurnazioni[savedTurnazioni.length - 1].id);
        if (hasStorage) TurniStorage.savePreferredTurnazioneId(preferredId);
      }

      savedTurnazioni.forEach((t) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "turnazione-mini-card";

        const isSel = preferredId && String(t.id) === String(preferredId);
        btn.classList.toggle("is-selected", !!isSel);

        const name = document.createElement("span");
        name.className = "turnazione-mini-name";
        name.textContent = t.name || "";

        const sigle = document.createElement("span");
        sigle.className = "turnazione-mini-sigle";
        sigle.textContent = formatSigle(t);

        btn.appendChild(name);
        btn.appendChild(sigle);

        btn.addEventListener("click", () => {
          preferredId = String(t.id);
          if (hasStorage) TurniStorage.savePreferredTurnazioneId(preferredId);
          renderTurnazioniCards();
          syncVisualizzaTurnazioneHint();
          notifyTurniStartUI();
        });

        turnazioniListEl.appendChild(btn);
      });

      syncVisualizzaTurnazioneHint();
      notifyTurniStartUI();
    }

    // ----------------------------
    // ✅ Salvataggio turnazione
    // ----------------------------

    // ✅ refs per reset riposi (Lun/Mar)
    let riposo1Reset = null;
    let riposo2Reset = null;

    function resetTurnazioneForm() {
      clearError();

      if (nameInput) nameInput.value = "";
      if (input) input.value = "";
      if (select) select.value = "";

      rotationDaysCount = null;
      rotationSlots = new Array(7).fill(null);
      restDayIndices = [];
      restDaysAllowed = 1;
      syncRestDaysCardUI();

      renderDaysGrid(null);

      // ✅ reset riposi lunedì/martedì (toggle OFF + campi vuoti + body chiuso)
      if (typeof riposo1Reset === "function") riposo1Reset();
      if (typeof riposo2Reset === "function") riposo2Reset();

      // ✅ reset dirty
      isDirty = false;
    }

    function validateTurnazione() {
      const name = (nameInput && nameInput.value ? nameInput.value : "").trim();
      const days = Number(rotationDaysCount);

      if (!name) return { ok: false, msg: "nome" };
      if (!days || days < 1 || days > 7) return { ok: false, msg: "giorni" };

      for (let i = 0; i < days; i++) {
        if (!rotationSlots[i]) return { ok: false, msg: "turni" };
      }

      return { ok: true, name, days };
    }

    function buildPayload(name, days) {
      const slots = [];
      for (let i = 0; i < days; i++) {
        const s = rotationSlots[i];
        slots.push({
          nome:   s && s.nome   ? s.nome   : "",
          sigla:  s && s.sigla  ? s.sigla  : "",
          colore: s && s.colore ? s.colore : ""
        });
      }

      return {
        id: String(Date.now()),
        name,
        days,
        slots,
        restDaysAllowed,
        restIndices: restDayIndices.slice(0, restDaysAllowed)
      };
    }

    if (btnSave) {
      btnSave.addEventListener("click", () => {
        clearError();

        if (!hasStorage) {
          showError();
          return;
        }

        const v = validateTurnazione();
        if (!v.ok) {
          showError();
          return;
        }

        const payload = buildPayload(v.name, v.days);

        savedTurnazioni = TurniStorage.loadTurnazioni();
        savedTurnazioni.push(payload);
        TurniStorage.saveTurnazioni(savedTurnazioni);

        preferredId = String(payload.id);
        TurniStorage.savePreferredTurnazioneId(preferredId);

        // ✅ segna salvataggio (anti reset immediato)
        lastSaveTs = Date.now();
        isDirty = false;

        // aggiorna UI pannello Turni
        renderTurnazioniCards();
        syncVisualizzaTurnazioneHint();

        // reset form e torna al pannello Turni
        resetTurnazioneForm();

        if (window.SettingsUI && typeof SettingsUI.openPanel === "function") {
          window.__turniInternalNav = true;
          SettingsUI.openPanel("turni");
        }
      });
    }

    // ----------------------------
    // Stato iniziale UI add
    // ----------------------------
    if (select && input && grid) {
      renderDaysGrid(null);

      if (nameInput) {
        nameInput.addEventListener("input", markDirty);
      }

      // Desktop select
      select.addEventListener("change", () => {
        markDirty();

        const v = Number(select.value) || null;
        input.value = select.value;

        if (v && v >= 1 && v <= 7) {
          for (let k = v; k < 7; k++) rotationSlots[k] = null;
          restDayIndices = restDayIndices.filter(i => i < v);
          normalizeRestIndicesToAllowed();
        } else {
          rotationSlots = new Array(7).fill(null);
          restDayIndices = [];
        }

        renderDaysGrid(v);
      });

      // Mobile input
      input.addEventListener("input", () => {
        const digits = (input.value || "").replace(/\D/g, "");
        const last = digits.slice(-1);
        const v = Number(last);

        if (!v || v < 1 || v > 7) {
          markDirty();

          input.value = "";
          if (select) select.value = "";
          rotationSlots = new Array(7).fill(null);
          restDayIndices = [];
          renderDaysGrid(null);
          return;
        }

        markDirty();

        input.value = last;
        if (select) select.value = last;

        for (let k = v; k < 7; k++) rotationSlots[k] = null;
        restDayIndices = restDayIndices.filter(i => i < v);
        normalizeRestIndicesToAllowed();

        renderDaysGrid(v);
      });
    }

    // -----------------------------------------
    // Helpers card "Riposo" (come prima)
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

      if (!cardEl || !toggleBtn || !bodyEl) return { reset: function () {} };

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

      // ✅ aggiunto: reset completo per questa card (usato da resetTurnazioneForm)
      function reset() {
        on = false;
        clearFields();
        applyState();
      }

      bodyEl.hidden = true;
      reset();

      toggleBtn.addEventListener("click", () => {
        on = !on;
        markDirty();
        if (!on) clearFields();
        applyState();
      });

      if (colorInput) {
        colorInput.addEventListener("input", () => { markDirty(); applyColorPreview(); });
        colorInput.addEventListener("change", () => { markDirty(); applyColorPreview(); });
      }

      if (inputSigla) {
        inputSigla.addEventListener("input", () => {
          markDirty();
          updateSiglaPreview();
        });
      }

      if (inputNome) {
        inputNome.addEventListener("input", markDirty);
      }

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

      return { reset };
    }

    const riposo1 = initRiposoCard({
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

    const riposo2 = initRiposoCard({
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

    // ✅ collega i reset locali (senza cambiare altro)
    riposo1Reset = riposo1 && typeof riposo1.reset === "function" ? riposo1.reset : null;
    riposo2Reset = riposo2 && typeof riposo2.reset === "function" ? riposo2.reset : null;

    // ✅ render iniziale lista turnazioni
    renderTurnazioniCards();
    syncVisualizzaTurnazioneHint();

    // =====================================================
    // ✅ RESET quando esci da "Aggiungi turnazione" SENZA salvare
    //    MA: non resettare quando vai su "turnazioni-pick"
    // =====================================================
    if (panelAdd) {
      let wasActive = panelAdd.classList.contains("is-active");

      const obs = new MutationObserver(() => {
        const isActiveNow = panelAdd.classList.contains("is-active");

        // transizione: active -> not active
        if (wasActive && !isActiveNow) {
          const justSaved = (Date.now() - lastSaveTs) < 800;

          // se stiamo andando al picker: NON resettare
          if (isGoingToPickPanel()) {
            wasActive = isActiveNow;
            return;
          }

          // se non ho salvato e ho toccato qualcosa: reset
          if (!justSaved && isDirty) {
            resetTurnazioneForm();
          } else if (!justSaved && !isDirty) {
            // comunque: se esci, meglio lasciare pulito per la prossima apertura
            resetTurnazioneForm();
          }
        }

        wasActive = isActiveNow;
      });

      obs.observe(panelAdd, { attributes: true, attributeFilter: ["class"] });
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

      // anche se non ho la card, la UI add può esistere
      if (!panelTurni) {
        initTurnazioniAddUI(ctx);
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
            window.__turniInternalNav = true;
            SettingsUI.openPanel("turnazioni-add");
          }
        });
      }

      // Edit resta disabilitato (non richiesto ora)
      if (turnazioniEditBtn) {
        turnazioniEditBtn.disabled = true;
      }

      // Init UI add + render lista card
      initTurnazioniAddUI({
        panelTurni,
        turnazioniListEl,
        turnazioniEmptyEl: turnazioniEmpty
      });

      // API interna per collassare da turni.js
      this._setCollapsed = (v) => {
        turnazioniCollapsed = !!v;
        if (turnazioniCard && turnazioniToggleBtn) {
          turnazioniCard.classList.toggle("is-collapsed", turnazioniCollapsed);
          turnazioniToggleBtn.setAttribute("aria-expanded", turnazioniCollapsed ? "false" : "true");
        }
      };
    }
  };

  window.Turnazione = Turnazione;
})();
