// =====================================================
// turnazioni.js (bundle feature turnazioni)
// Build: 2025-12-18
// Contenuti:
//// - turnazioni-list.js
// - turnazioni-add.js
// - turnazioni.js
// =====================================================

// ============================
// Rendering lista turnazioni (mini-card) + preferita + hint
// turnazioni-list.js v 1.0
// ============================

(function () {
// ===================== SPLIT helpers_formatting : START =====================
  function formatSigle(turnazione) {
    const n = Number(turnazione && turnazione.days) || 0;
    const slots = Array.isArray(turnazione && turnazione.slots) ? turnazione.slots : [];
    const restIdx = Array.isArray(turnazione && turnazione.restIndices) ? turnazione.restIndices : [];

    const out = [];
    for (let i = 0; i < n; i++) {
      if (restIdx.includes(i)) out.push("R");
      else {
        const s = (slots[i] && slots[i].sigla) ? String(slots[i].sigla).trim() : "";
        out.push(s || "?");
      }
    }
    return out.join(" - ");
  }

  function getPreferred(savedTurnazioni, preferredId) {
    if (!Array.isArray(savedTurnazioni) || savedTurnazioni.length === 0) return null;

    let pick = null;
    if (preferredId) {
      pick = savedTurnazioni.find(t => String(t.id) === String(preferredId)) || null;
    }
    if (!pick) pick = savedTurnazioni[savedTurnazioni.length - 1];
    return pick;
  }
// ===================== SPLIT helpers_formatting : END   =====================

// ===================== SPLIT api_state_and_init : START =====================
  const api = {
    panelTurni: null,
    listEl: null,
    emptyEl: null,
    visualHintEl: null,

    saved: [],
    preferredId: null,

    init(ctx) {
      this.panelTurni = ctx && ctx.panelTurni ? ctx.panelTurni : null;
      this.listEl = ctx && ctx.turnazioniListEl ? ctx.turnazioniListEl : null;
      this.emptyEl = ctx && ctx.turnazioniEmptyEl ? ctx.turnazioniEmptyEl : null;
      this.visualHintEl = ctx && ctx.visualHintEl ? ctx.visualHintEl : null;

      this.refresh();
    },
// ===================== SPLIT api_state_and_init : END   =====================

// ===================== SPLIT api_refresh_rendering : START =====================
    refresh() {
      if (!window.TurniStorage) return;

      const hasStorage =
        window.TurniStorage &&
        typeof TurniStorage.loadTurnazioni === "function" &&
        typeof TurniStorage.saveTurnazioni === "function" &&
        typeof TurniStorage.loadPreferredTurnazioneId === "function" &&
        typeof TurniStorage.savePreferredTurnazioneId === "function";

      this.saved = hasStorage ? TurniStorage.loadTurnazioni() : [];
      this.preferredId = hasStorage ? TurniStorage.loadPreferredTurnazioneId() : null;

      if (this.listEl) this.listEl.innerHTML = "";

      const has = Array.isArray(this.saved) && this.saved.length > 0;
      if (this.emptyEl) this.emptyEl.hidden = has;

      // preferita valida?
      if (this.preferredId && has) {
        const ok = this.saved.some(t => String(t.id) === String(this.preferredId));
        if (!ok) this.preferredId = null;
      }

      // se non c’è preferita, scegli ultima
      if (!this.preferredId && hasStorage && has) {
        this.preferredId = String(this.saved[this.saved.length - 1].id);
        TurniStorage.savePreferredTurnazioneId(this.preferredId);
      }

      if (has && this.listEl) {
        this.saved.forEach((t) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "turnazione-mini-card";

          const isSel = this.preferredId && String(t.id) === String(this.preferredId);
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
            this.preferredId = String(t.id);
            if (hasStorage) TurniStorage.savePreferredTurnazioneId(this.preferredId);

            this.refresh();
            this.syncVisualHint();
            this.notifyTurnoIniziale();
          });

          this.listEl.appendChild(btn);
        });
      }

      this.syncVisualHint();
      this.notifyTurnoIniziale();
    },
// ===================== SPLIT api_refresh_rendering : END   =====================

// ===================== SPLIT api_visual_hint : START =====================
    syncVisualHint() {
      if (!this.visualHintEl) return;

      const has = Array.isArray(this.saved) && this.saved.length > 0;
      if (!has) {
        this.visualHintEl.textContent = "Nessuna turnazione impostata.";
        return;
      }

      const pick = getPreferred(this.saved, this.preferredId);
      this.visualHintEl.textContent = (pick && pick.name) ? pick.name : "Turnazione";
    },
// ===================== SPLIT api_visual_hint : END   =====================

// ===================== SPLIT api_notify_and_export : START =====================
    notifyTurnoIniziale() {
      if (window.Turni && typeof Turni.syncTurnoInizialeUI === "function") {
        Turni.syncTurnoInizialeUI();
      }
      if (window.TurniStart && typeof TurniStart.syncFromTurnazioniChange === "function") {
        TurniStart.syncFromTurnazioniChange();
      }
    }
  };

  window.TurnazioniList = api;
// ===================== SPLIT api_notify_and_export : END   =====================
})();

// ============================
// UI "Aggiungi turnazione" + picker turni + riposi + reset/dirty + salvataggio
// turnazioni-add.js v 1.0
// ============================

(function () {

// ===================== SPLIT helpers_base : START =====================
  function sameTurno(a, b) {
    if (!a || !b) return false;
    const an = (a.nome || "").trim();
    const as = (a.sigla || "").trim();
    const bn = (b.nome || "").trim();
    const bs = (b.sigla || "").trim();
    return an === bn && as === bs;
  }
// ===================== SPLIT helpers_base : END =======================

// ===================== SPLIT init_entrypoint : START =====================
  function initTurnazioniAddUI(ctx) {
    if (!window.TurniStorage) return;
    if (!window.TurniRender) return;
// ===================== SPLIT init_entrypoint : END =======================

// ===================== SPLIT dom_refs_panels : START =====================
    const panelAdd = document.querySelector(
      '.settings-panel.settings-turnazioni-add[data-settings-id="turnazioni-add"]'
    );
    if (!panelAdd) return;

    const panelPick = document.querySelector(
      '.settings-panel.settings-turnazioni-pick[data-settings-id="turnazioni-pick"]'
    );

    const panelTurni = (ctx && ctx.panelTurni)
      ? ctx.panelTurni
      : document.querySelector('.settings-panel.settings-turni[data-settings-id="turni"]');
// ===================== SPLIT dom_refs_panels : END =======================

// ===================== SPLIT dom_refs_list_hint : START =====================
    const turnazioniListEl = (ctx && ctx.turnazioniListEl)
      ? ctx.turnazioniListEl
      : (panelTurni ? panelTurni.querySelector("[data-turnazioni-list]") : null);

    const turnazioniEmptyEl = (ctx && ctx.turnazioniEmptyEl)
      ? ctx.turnazioniEmptyEl
      : (panelTurni ? panelTurni.querySelector("[data-turnazioni-empty-hint]") : null);

    const visualHintEl = (ctx && ctx.visualHintEl)
      ? ctx.visualHintEl
      : (panelTurni ? panelTurni.querySelector("[data-turni-visual-hint]") : null);
// ===================== SPLIT dom_refs_list_hint : END =======================

// ===================== SPLIT dom_refs_toolbar_days_name : START =====================
    // toolbar Salva
    const btnSave = panelAdd.querySelector("[data-turnazioni-save]");
    const errEl   = panelAdd.querySelector("[data-turnazioni-error]");
    const errorCtl = (window.UIFeedback && typeof UIFeedback.createTempError === "function")
      ? UIFeedback.createTempError(errEl, 2000)
      : null;

    // Giorni + griglia
    const select = panelAdd.querySelector("#turnazioniDaysSelect");
    const input  = panelAdd.querySelector("#turnazioniDaysInput");
    const grid   = panelAdd.querySelector("#turnazioniDaysGrid");

    const subtitleEl    = panelAdd.querySelector("#turnazioniDaysSubtitle");
    const placeholderEl = panelAdd.querySelector("#turnazioniDaysPlaceholder");

    // Nome turnazione
    const nameInput = panelAdd.querySelector("#turnazioniNome");
// ===================== SPLIT dom_refs_toolbar_days_name : END =======================

// ===================== SPLIT dom_refs_picker_rest : START =====================
    // picker list
    const pickListEl = panelPick ? panelPick.querySelector("#turnazioniPickList") : null;
    const pickEmpty  = panelPick ? panelPick.querySelector("#turnazioniPickEmpty") : null;
    const pickHint   = panelPick ? panelPick.querySelector("#turnazioniPickHint") : null;

    // riposo nel picker
    const restRowEl    = panelPick ? panelPick.querySelector("#turnazioniPickRestRow") : null;
    const restToggleEl = panelPick ? panelPick.querySelector("#turnazioniRestToggle") : null;

    // card "Giorni di Riposo" (1/2)
    const restDaysBtns = panelAdd.querySelectorAll('[data-turnazioni-rest-days]');
// ===================== SPLIT dom_refs_picker_rest : END =======================

// ===================== SPLIT state_dirty_rotation_rest : START =====================
    // ----------------------------
    // Dirty + reset
    // ----------------------------
    let isDirty = false;
    let lastSaveTs = 0;
    function markDirty() { isDirty = true; }

    // stato rotazione
    let rotationDaysCount = null;                // 1..7 o null
    let rotationSlots = new Array(7).fill(null); // slot -> turno obj oppure null
    let activePickIndex = null;                  // 0..6

    // riposi
    let restDaysAllowed = 1; // 1 o 2
    let restDayIndices = [];
// ===================== SPLIT state_dirty_rotation_rest : END =======================

// ===================== SPLIT storage_load_initial : START =====================
    const hasStorage =
      window.TurniStorage &&
      typeof TurniStorage.loadTurnazioni === "function" &&
      typeof TurniStorage.saveTurnazioni === "function" &&
      typeof TurniStorage.loadPreferredTurnazioneId === "function" &&
      typeof TurniStorage.savePreferredTurnazioneId === "function";

    let savedTurnazioni = hasStorage ? TurniStorage.loadTurnazioni() : [];
    let preferredId     = hasStorage ? TurniStorage.loadPreferredTurnazioneId() : null;
// ===================== SPLIT storage_load_initial : END =======================

// ===================== SPLIT errors_ui : START =====================
    // ----------------------------
    // Errori
    // ----------------------------
    function clearError() {
      if (!errEl) return;
      if (errorCtl) errorCtl.clear();
      else errEl.hidden = true;
    }

    function showError() {
      if (!errEl) return;
      if (errorCtl) errorCtl.show();
      else {
        errEl.hidden = false;
        setTimeout(() => { errEl.hidden = true; }, 2000);
      }
    }
// ===================== SPLIT errors_ui : END =======================

// ===================== SPLIT helpers_days_ui : START =====================
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

      if (hasDays) {
        restDayIndices = restDayIndices.filter(i => i < n);
      } else {
        restDayIndices = [];
      }

      normalizeRestIndicesToAllowed();
    }

    function applySiglaFontSize(el, txt) {
      if (window.TurniRender && typeof TurniRender.applySiglaFontSize === "function") {
        TurniRender.applySiglaFontSize(el, txt);
      }
    }
// ===================== SPLIT helpers_days_ui : END =======================

// ===================== SPLIT rest_days_card_1_2 : START =====================
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
// ===================== SPLIT rest_days_card_1_2 : END =======================

// ===================== SPLIT rest_toggle_picker : START =====================
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
// ===================== SPLIT rest_toggle_picker : END =======================

// ===================== SPLIT picker_open_setslot : START =====================
    function openPickPanelForDay(index) {
      activePickIndex = index;

      if (pickHint) pickHint.textContent = `Seleziona un turno per il giorno ${index + 1}.`;
      if (restRowEl) restRowEl.style.display = "flex";

      syncRestToggleUI();
      renderPickList();

      if (window.SettingsUI && typeof SettingsUI.openPanel === "function") {
        SettingsUI.openPanel("turnazioni-pick", { internal: true });
      }
    }

    function setSlotFromTurno(index, turnoObj) {
      if (index == null || index < 0 || index > 6) return;
      rotationSlots[index] = turnoObj || null;
      renderDaysGrid(rotationDaysCount);
      markDirty();
    }
// ===================== SPLIT picker_open_setslot : END =======================

// ===================== SPLIT render_pick_list : START =====================
    function renderPickList() {
      if (!pickListEl) return;

      const turni = (window.TurniStorage && typeof TurniStorage.loadTurni === "function")
        ? TurniStorage.loadTurni()
        : [];

      pickListEl.innerHTML = "";

      const hasTurni = Array.isArray(turni) && turni.length > 0;

      if (pickEmpty) pickEmpty.hidden = hasTurni;
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
          if (activePickIndex !== null) setSlotFromTurno(activePickIndex, t);

          if (window.SettingsUI && typeof SettingsUI.openPanel === "function") {
            SettingsUI.openPanel("turnazioni-add", { internal: true });
          }
        });

        pickListEl.appendChild(row);
      });
    }
// ===================== SPLIT render_pick_list : END =======================

// ===================== SPLIT render_days_grid : START =====================
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
// ===================== SPLIT render_days_grid : END =======================

// ===================== SPLIT riposo_cards_component : START =====================
    // ----------------------------
    // Riposo cards component (riuso del tuo componente)
    // ----------------------------
    let riposo1Reset = null;
    let riposo2Reset = null;

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

      if (inputNome) inputNome.addEventListener("input", markDirty);

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

    riposo1Reset = riposo1 && typeof riposo1.reset === "function" ? riposo1.reset : null;
    riposo2Reset = riposo2 && typeof riposo2.reset === "function" ? riposo2.reset : null;
// ===================== SPLIT riposo_cards_component : END =======================

// ===================== SPLIT reset_form : START =====================
    // ----------------------------
    // Reset form
    // ----------------------------
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

      if (typeof riposo1Reset === "function") riposo1Reset();
      if (typeof riposo2Reset === "function") riposo2Reset();

      isDirty = false;
    }
// ===================== SPLIT reset_form : END =======================

// ===================== SPLIT validate_and_payload : START =====================
    // ----------------------------
    // Validazione + payload
    // ----------------------------
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
// ===================== SPLIT validate_and_payload : END =======================

// ===================== SPLIT save_click_handler : START =====================
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

        lastSaveTs = Date.now();
        isDirty = false;

        // aggiorna lista e hint via modulo list
        if (window.TurnazioniList) {
          TurnazioniList.refresh();
        }

        resetTurnazioneForm();

        if (window.SettingsUI && typeof SettingsUI.openPanel === "function") {
          SettingsUI.openPanel("turni", { internal: true });
        }
      });
    }
// ===================== SPLIT save_click_handler : END =======================

// ===================== SPLIT init_add_ui_bindings : START =====================
    // ----------------------------
    // Stato iniziale UI add
    // ----------------------------
    if (select && input && grid) {
      renderDaysGrid(null);

      if (nameInput) nameInput.addEventListener("input", markDirty);

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
// ===================== SPLIT init_add_ui_bindings : END =======================

// ===================== SPLIT settings_onchange_reset_guard : START =====================
    // ----------------------------
    // RESET quando esci da "turnazioni-add" senza salvare
    // (usiamo SettingsUI.onChange invece di MutationObserver)
    // ----------------------------
    if (window.SettingsUI && typeof SettingsUI.onChange === "function") {
      SettingsUI.onChange((prevId, nextId) => {
        if (prevId === "turnazioni-add" && nextId !== "turnazioni-add") {
          const justSaved = (Date.now() - lastSaveTs) < 800;

          // se vai al picker: non resettare
          if (nextId === "turnazioni-pick") return;

          if (!justSaved) {
            resetTurnazioneForm();
          }
        }
      });
    }
// ===================== SPLIT settings_onchange_reset_guard : END =======================

// ===================== SPLIT turnazioni_list_init_fallback : START =====================
    // init lista turnazioni se esiste modulo list (così non dipende dall’ordine)
    if (window.TurnazioniList && typeof TurnazioniList.init === "function") {
      TurnazioniList.init({
        panelTurni,
        turnazioniListEl,
        turnazioniEmptyEl,
        visualHintEl
      });
    } else {
      // fallback: almeno niente crash
    }
// ===================== SPLIT turnazioni_list_init_fallback : END =======================

  }
// ===================== SPLIT initTurnazioniAddUI_close : START =====================
  window.TurnazioniAdd = {
    init: initTurnazioniAddUI
  };
// ===================== SPLIT initTurnazioniAddUI_close : END =======================

})();

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
