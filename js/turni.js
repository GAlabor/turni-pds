// ============================
// turni.js (nuovo)
// Orchestratore Pannello Turni
// - Usa TurniStorage per storage/validazione
// - Usa TurniRender per render lista
// - Usa TurniInteractions per interazioni (edit, drag, collapse, reset on exit)
// - Deleghe Turnazioni a turnazione.js
// ============================

(function () {
  if (!window.AppConfig) {
    throw new Error("CONFIG.MISSING: AppConfig non disponibile (turni.js)");
  }

  // Implementazione reale (viene impostata dopo initTurniPanel)
  let exitEditModeImpl = function () {};

  // helper: format data breve in IT (dd/mm o simile)
  function formatDateShortISO(iso) {
    if (!iso || typeof iso !== "string") return "";
    const d = new Date(iso + "T00:00:00");
    if (Number.isNaN(d.getTime())) return "";
    try {
      return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
    } catch {
      // fallback
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yy = String(d.getFullYear());
      return `${dd}/${mm}/${yy}`;
    }
  }

  function initTurniPanel() {
    const settingsView = document.querySelector(".view-settings");
    if (!settingsView) return;

    if (!window.TurniStorage || !window.TurniRender) {
      console.error("Turni: TurniStorage o TurniRender non disponibili");
      return;
    }

    const {
      loadTurni,
      saveTurni,
      isValidTime,
      loadTurnazioni,
      loadPreferredTurnazioneId,
      loadVisualToggle,
      saveVisualToggle,
      loadTurnoIniziale,
      saveTurnoIniziale
    } = window.TurniStorage;

    const { renderTurni, applySiglaFontSize } = window.TurniRender;

    // Pannello principale turni (lista)
    const panelTurni = settingsView.querySelector('.settings-panel.settings-turni[data-settings-id="turni"]');
    // Pannello "Aggiungi turno"
    const panelAdd   = settingsView.querySelector('.settings-panel.settings-turni-add[data-settings-id="turni-add"]');

    // ✅ nuovi pannelli
    const panelStart = settingsView.querySelector('.settings-panel.settings-turni-start[data-settings-id="turni-start"]');
    const panelStartPick = settingsView.querySelector('.settings-panel.settings-turni-start-pick[data-settings-id="turni-start-pick"]');

    if (!panelTurni || !panelAdd) return;

    // --- elementi pannello lista ---
    const listEl     = panelTurni.querySelector("[data-turni-list]");
    const emptyHint  = panelTurni.querySelector("[data-turni-empty-hint]");
    const btnAdd     = panelTurni.querySelector("[data-turni-add]");
    const btnEdit    = panelTurni.querySelector("[data-turni-edit]");

    const toggleBtn = panelTurni.querySelector("[data-turni-toggle]");

    // La card "Turni" corretta è quella che contiene il suo toggle
    const cardEl = toggleBtn ? toggleBtn.closest(".turni-card") : null;
    const headerEl = cardEl ? cardEl.querySelector(".turni-card-header") : null;

    // Blocco "Visualizza turnazione"
    const visualToggleBtn = panelTurni.querySelector("[data-turni-visual-toggle]");
    const visualHint      = panelTurni.querySelector("[data-turni-visual-hint]");

    // ✅ Riga "Imposta turno iniziale" (dentro Visualizza Turnazione)
    const startRowBtn   = panelTurni.querySelector("[data-turni-start-row]");
    const startSummaryEl = panelTurni.querySelector("[data-turni-start-summary]");
    const startChevronEl = panelTurni.querySelector("[data-turni-start-chevron]");

    // --- elementi pannello "Aggiungi turno" ---
    const formEl          = panelAdd.querySelector("[data-turni-add-form]");
    const inputNome       = panelAdd.querySelector("#addTurnoNome");
    const inputSigla      = panelAdd.querySelector("#addTurnoSigla");
    const inputInizio     = panelAdd.querySelector("#addTurnoOraInizio");
    const inputFine       = panelAdd.querySelector("#addTurnoOraFine");
    const colorInput      = panelAdd.querySelector("[data-turni-color]");
    const colorPreview    = panelAdd.querySelector("[data-turni-color-preview]");
    const colorTrigger    = panelAdd.querySelector("[data-turni-color-trigger]");
    const saveBtn         = panelAdd.querySelector("[data-turni-save]");
    const errorEl         = panelAdd.querySelector("[data-turni-error]");
    const siglaPreviewEl  = panelAdd.querySelector("[data-turni-sigla-preview]");
    const noTimeToggleBtn = panelAdd.querySelector("[data-turni-no-time-toggle]");

    if (
      !listEl || !btnAdd || !btnEdit || !toggleBtn || !cardEl || !headerEl ||
      !formEl || !inputNome || !inputSigla || !inputInizio || !inputFine ||
      !colorInput || !colorPreview || !colorTrigger ||
      !saveBtn || !errorEl || !siglaPreviewEl || !noTimeToggleBtn
    ) {
      return;
    }

    // ---- Turnazioni refs (passate a Turnazione.init) ----
    const turnazioniCard      = panelTurni.querySelector(".turnazioni-card");
    const turnazioniToggleBtn = panelTurni.querySelector("[data-turnazioni-toggle]");
    const turnazioniHeader    = turnazioniCard ? turnazioniCard.querySelector(".turni-card-header") : null;
    const turnazioniAddBtn    = panelTurni.querySelector("[data-turnazioni-add]");
    const turnazioniEditBtn   = panelTurni.querySelector("[data-turnazioni-edit]");

    // Titolo predefinito del pannello add/edit
    const defaultAddTitle = panelAdd.dataset.settingsTitle || "Aggiungi turno";
    const editTitle       = "Modifica turno";

    // Stato
    let turni = loadTurni();
    let isEditing = false;

    // Stato collassato letto da HTML
    let isCollapsed = cardEl.classList.contains("is-collapsed");

    // indice del turno in modifica; null = nuovo
    let editIndex = null;

    // Stato "turno senza orario"
    let isNoTime = false;

    // ----------------------------
    // Helpers: collapse turni card
    // ----------------------------
    function getCollapsed() { return isCollapsed; }
    function setCollapsed(v) { isCollapsed = !!v; }

    function applyCollapsedState() {
      cardEl.classList.toggle("is-collapsed", isCollapsed);
      toggleBtn.setAttribute("aria-expanded", isCollapsed ? "false" : "true");
    }

    // ----------------------------
    // Render lista
    // ----------------------------
    function refreshList() {
      renderTurni(listEl, turni, emptyHint, btnEdit, {
        isEditing,
        onDelete: (index) => {
          if (index < 0 || index >= turni.length) return;

          turni.splice(index, 1);
          saveTurni(turni);

          if (!turni.length) isEditing = false;
          refreshList();
        }
      });
    }

    // Render iniziale
    refreshList();
    applyCollapsedState();

    // =====================================================
    // ✅ TURNO INIZIALE (nuovo)
    // =====================================================

    // elementi pannello "turni-start"
    const startDateInput = panelStart ? panelStart.querySelector("#turniStartDate") : null;
    const startTurnoRow  = panelStart ? panelStart.querySelector("[data-turni-start-turno-row]") : null;
    const startTurnoSummary = panelStart ? panelStart.querySelector("#turniStartTurnoSummary") : null;

    // elementi pannello pick
    const startPickList  = panelStartPick ? panelStartPick.querySelector("#turniStartPickList") : null;
    const startPickEmpty = panelStartPick ? panelStartPick.querySelector("#turniStartPickEmpty") : null;

    function getPreferredTurnazione() {
      const all = (typeof loadTurnazioni === "function") ? loadTurnazioni() : [];
      if (!Array.isArray(all) || all.length === 0) return null;

      let pref = null;
      const prefId = (typeof loadPreferredTurnazioneId === "function")
        ? loadPreferredTurnazioneId()
        : null;

      if (prefId) {
        pref = all.find(t => String(t.id) === String(prefId)) || null;
      }
      if (!pref) pref = all[all.length - 1];
      return pref || null;
    }

    function canUseTurnoIniziale() {
      const t = getPreferredTurnazione();
      return !!t;
    }

    function setStartRowEnabled(enabled) {
      if (!startRowBtn) return;

      startRowBtn.classList.toggle("is-disabled", !enabled);
      startRowBtn.setAttribute("aria-disabled", enabled ? "false" : "true");

      if (startChevronEl) {
        startChevronEl.style.display = enabled ? "" : "none";
      }
    }

    function buildStartSummaryText() {
      const cfg = (typeof loadTurnoIniziale === "function") ? loadTurnoIniziale() : { date: "", slotIndex: null };
      const dateTxt = cfg.date ? formatDateShortISO(cfg.date) : "";

      const t = getPreferredTurnazione();
      const slotIndex = Number.isInteger(cfg.slotIndex) ? cfg.slotIndex : null;

      let turnoTxt = "";
      if (t && slotIndex !== null && slotIndex >= 0) {
        const n = Number(t.days) || 0;
        const slots = Array.isArray(t.slots) ? t.slots : [];
        if (slotIndex < n) {
          const s = slots[slotIndex] || null;
          const sigla = s && s.sigla ? String(s.sigla).trim() : "";
          // mostriamo sempre “Giorno X”, e se c’è la sigla anche quella
          turnoTxt = `Giorno ${slotIndex + 1}${sigla ? ` (${sigla})` : ""}`;
        }
      }

      if (dateTxt && turnoTxt) return `${dateTxt} · ${turnoTxt}`;
      if (dateTxt) return dateTxt;
      if (turnoTxt) return turnoTxt;
      return "";
    }

    function syncTurnoInizialeSummaryUI() {
      const txt = buildStartSummaryText();

      if (startSummaryEl) startSummaryEl.textContent = txt;
      if (startTurnoSummary) {
        // nel pannello: mostra solo la parte turno (se presente)
        const cfg = (typeof loadTurnoIniziale === "function") ? loadTurnoIniziale() : { date: "", slotIndex: null };
        const t = getPreferredTurnazione();

        let turnoTxt = "";
        if (t && Number.isInteger(cfg.slotIndex)) {
          const n = Number(t.days) || 0;
          const slots = Array.isArray(t.slots) ? t.slots : [];
          const i = cfg.slotIndex;
          if (i >= 0 && i < n) {
            const s = slots[i] || null;
            const sigla = s && s.sigla ? String(s.sigla).trim() : "";
            const nome  = s && s.nome  ? String(s.nome).trim()  : "";
            turnoTxt = sigla ? sigla : (nome || "");
            if (sigla && nome) turnoTxt = `${sigla} — ${nome}`;
            // aggiungi info del giorno
            turnoTxt = `Giorno ${i + 1}${turnoTxt ? ` · ${turnoTxt}` : ""}`;
          }
        }

        startTurnoSummary.textContent = turnoTxt;
      }

      // se non c’è turnazione, il summary in card deve restare vuoto
      if (!canUseTurnoIniziale()) {
        if (startSummaryEl) startSummaryEl.textContent = "";
        if (startTurnoSummary) startTurnoSummary.textContent = "";
      }
    }

    function syncTurnoInizialeAvailabilityUI() {
      const ok = canUseTurnoIniziale();
      setStartRowEnabled(ok);
      syncTurnoInizialeSummaryUI();
    }

    // Esposta per turnazione.js quando cambia preferita / lista
    function syncTurnoInizialeUI() {
      syncTurnoInizialeAvailabilityUI();
      // se siamo nel picker aperto e non c’è più turnazione, aggiorna lista
      if (panelStartPick && panelStartPick.classList.contains("is-active")) {
        renderStartPickList();
      }
    }

    function openTurnoInizialePanel() {
      if (!panelStart) return;
      if (!canUseTurnoIniziale()) return;

      // carica valori attuali
      const cfg = (typeof loadTurnoIniziale === "function") ? loadTurnoIniziale() : { date: "", slotIndex: null };

      if (startDateInput) {
        startDateInput.value = cfg.date || "";
      }

      syncTurnoInizialeSummaryUI();

      if (window.SettingsUI && typeof SettingsUI.openPanel === "function") {
        window.__turniInternalNav = true;
        SettingsUI.openPanel("turni-start");
      }
    }

    function renderStartPickList() {
      if (!startPickList) return;

      const t = getPreferredTurnazione();
      startPickList.innerHTML = "";

      const cfg = (typeof loadTurnoIniziale === "function") ? loadTurnoIniziale() : { date: "", slotIndex: null };
      const selectedIndex = Number.isInteger(cfg.slotIndex) ? cfg.slotIndex : null;

      const has = !!t && (Number(t.days) || 0) > 0 && Array.isArray(t.slots);

      if (startPickEmpty) {
        startPickEmpty.hidden = has;
      }

      if (!has) return;

      const days = Number(t.days) || 0;
      const slots = Array.isArray(t.slots) ? t.slots : [];

      for (let i = 0; i < days; i++) {
        const s = slots[i] || {};
        const sigla = s.sigla ? String(s.sigla).trim() : "";
        const nome  = s.nome  ? String(s.nome).trim()  : "";

        const row = document.createElement("button");
        row.type = "button";
        row.className = "turnazioni-pick-row";
        if (selectedIndex !== null && i === selectedIndex) {
          row.classList.add("is-selected");
        }

        const nameEl = document.createElement("span");
        nameEl.className = "turnazioni-pick-name";
        // come richiesto: visualizza solo i turni della rotazione
        // metto “Giorno X — SIGLA Nome” (compatto)
        let label = `Giorno ${i + 1}`;
        if (sigla && nome) label += ` — ${sigla} ${nome}`;
        else if (sigla)    label += ` — ${sigla}`;
        else if (nome)     label += ` — ${nome}`;

        nameEl.textContent = label;

        row.appendChild(nameEl);

        row.addEventListener("click", () => {
          const next = (typeof loadTurnoIniziale === "function") ? loadTurnoIniziale() : { date: "", slotIndex: null };
          next.slotIndex = i;
          if (typeof saveTurnoIniziale === "function") saveTurnoIniziale(next);

          syncTurnoInizialeSummaryUI();

          if (window.SettingsUI && typeof SettingsUI.openPanel === "function") {
            window.__turniInternalNav = true;
            SettingsUI.openPanel("turni-start");
          }
        });

        startPickList.appendChild(row);
      }
    }

    // click dalla card “Visualizza Turnazione” -> pannello turno iniziale
    if (startRowBtn) {
      startRowBtn.addEventListener("click", () => {
        if (startRowBtn.classList.contains("is-disabled")) return;
        openTurnoInizialePanel();
      });
    }

    // pannello: cambia data -> salva e aggiorna summary
    if (startDateInput) {
      startDateInput.addEventListener("change", () => {
        const cfg = (typeof loadTurnoIniziale === "function") ? loadTurnoIniziale() : { date: "", slotIndex: null };
        cfg.date = startDateInput.value || "";
        if (typeof saveTurnoIniziale === "function") saveTurnoIniziale(cfg);
        syncTurnoInizialeSummaryUI();
      });
    }

    // pannello: click “Turno” -> apre picker
    if (startTurnoRow) {
      startTurnoRow.addEventListener("click", () => {
        if (!canUseTurnoIniziale()) return;
        renderStartPickList();

        if (window.SettingsUI && typeof SettingsUI.openPanel === "function") {
          window.__turniInternalNav = true;
          SettingsUI.openPanel("turni-start-pick");
        }
      });
    }

    // ----------------------------
    // TOGGLE "VISUALIZZA TURNAZIONE"
    // ----------------------------
    if (visualToggleBtn && typeof loadVisualToggle === "function") {
      let visualOn = loadVisualToggle();

      function applyVisualState() {
        visualToggleBtn.classList.toggle("is-on", visualOn);
        visualToggleBtn.setAttribute("aria-checked", visualOn ? "true" : "false");

        // se OFF, nascondi il hint "Nessuna turnazione impostata"
        if (visualHint) {
          visualHint.hidden = !visualOn;
        }

        // ✅ mostra/nasconde la riga “Imposta turno iniziale”
        if (startRowBtn) {
          startRowBtn.hidden = !visualOn;
        }

        // ogni volta che cambia, riallinea abilitazione/summary
        if (visualOn) {
          syncTurnoInizialeAvailabilityUI();
        }
      }

      applyVisualState();

      visualToggleBtn.addEventListener("click", () => {
        visualOn = !visualOn;
        applyVisualState();

        if (typeof saveVisualToggle === "function") {
          saveVisualToggle(visualOn);
        }
      });
    }

    // init stato UI turno iniziale (anche se toggle è OFF, prepariamo summary)
    syncTurnoInizialeAvailabilityUI();

    // ----------------------------
    // Helper: stato "turno senza orario"
    // ----------------------------
    function applyNoTimeState() {
      noTimeToggleBtn.classList.toggle("is-on", isNoTime);
      noTimeToggleBtn.setAttribute("aria-checked", isNoTime ? "true" : "false");

      [inputInizio, inputFine].forEach(inp => {
        inp.disabled = isNoTime;
        inp.classList.remove("is-invalid");
        if (isNoTime) inp.value = "";
      });

      panelAdd.classList.toggle("turni-no-time-on", isNoTime);
    }

    // ----------------------------
    // Helper: errori
    // ----------------------------
    let errorTimer = null;

    function clearError() {
      if (errorTimer) {
        clearTimeout(errorTimer);
        errorTimer = null;
      }

      errorEl.hidden = true;
      [inputNome, inputSigla, inputInizio, inputFine].forEach(inp => inp.classList.remove("is-invalid"));
    }

    function showError() {
      clearError();
      errorEl.hidden = false;

      errorTimer = setTimeout(() => {
        errorEl.hidden = true;
        [inputNome, inputSigla, inputInizio, inputFine].forEach(inp => inp.classList.remove("is-invalid"));
      }, 2000);
    }

    [inputNome, inputInizio, inputFine].forEach(inp => {
      inp.addEventListener("input", () => inp.classList.remove("is-invalid"));
    });

    // ----------------------------
    // Colore sigla + anteprima
    // ----------------------------
    function applyColorPreview() {
      const v = colorInput.value || "#0a84ff";
      colorPreview.style.backgroundColor = v;
      siglaPreviewEl.style.color = v;
    }

    function updateSiglaPreview() {
      const txt = (inputSigla.value || "").trim();
      siglaPreviewEl.textContent = txt || "";
      applySiglaFontSize(siglaPreviewEl, txt);
    }

    colorInput.addEventListener("input", applyColorPreview);
    colorInput.addEventListener("change", applyColorPreview);

    inputSigla.addEventListener("input", () => {
      inputSigla.classList.remove("is-invalid");
      updateSiglaPreview();
    });

    // ----------------------------
    // Form: reset / open new / open edit
    // ----------------------------
    function resetAddForm() {
      clearError();
      inputNome.value   = "";
      inputSigla.value  = "";
      inputInizio.value = "";
      inputFine.value   = "";
      siglaPreviewEl.textContent = "";
      applySiglaFontSize(siglaPreviewEl, "");
      colorInput.value  = "#0a84ff";
      applyColorPreview();

      isNoTime = false;
      applyNoTimeState();

      updateSiglaPreview();
    }

    function openNewTurnoPanel() {
      editIndex = null;
      panelAdd.dataset.settingsTitle = defaultAddTitle;
      resetAddForm();

      if (window.SettingsUI && typeof SettingsUI.openPanel === "function") {
        window.__turniInternalNav = true;
        SettingsUI.openPanel("turni-add");
      }
    }

    function openEditTurnoPanel(index) {
      const t = turni[index];
      if (!t) return;

      editIndex = index;
      panelAdd.dataset.settingsTitle = editTitle;

      clearError();

      inputNome.value  = t.nome || "";
      inputSigla.value = t.sigla || "";

      isNoTime = !!t.noTime;

      if (isNoTime) {
        inputInizio.value = "";
        inputFine.value   = "";
      } else {
        inputInizio.value = t.inizio || "";
        inputFine.value   = t.fine || "";
      }

      applyNoTimeState();

      colorInput.value = t.colore || "#0a84ff";
      applyColorPreview();

      siglaPreviewEl.textContent = t.sigla || "";
      applySiglaFontSize(siglaPreviewEl, t.sigla || "");

      if (window.SettingsUI && typeof SettingsUI.openPanel === "function") {
        window.__turniInternalNav = true;
        SettingsUI.openPanel("turni-add");
      }
    }

    // ----------------------------
    // Toggle "Turno senza orario"
    // ----------------------------
    applyNoTimeState();

    noTimeToggleBtn.addEventListener("click", () => {
      isNoTime = !isNoTime;
      applyNoTimeState();
    });

    // ----------------------------
    // Apertura pannello "Aggiungi turno"
    // ----------------------------
    btnAdd.addEventListener("click", (e) => {
      e.stopPropagation();
      openNewTurnoPanel();
    });

    // ----------------------------
    // Salvataggio nuovo turno / modifica turno
    // ----------------------------
    saveBtn.addEventListener("click", () => {
      clearError();

      const nome   = (inputNome.value || "").trim();
      const sigla  = (inputSigla.value || "").trim();
      let inizio   = (inputInizio.value || "").trim();
      let fine     = (inputFine.value || "").trim();
      const colore = colorInput.value || "#0a84ff";

      let hasError = false;

      if (!nome)  { inputNome.classList.add("is-invalid"); hasError = true; }
      if (!sigla) { inputSigla.classList.add("is-invalid"); hasError = true; }

      if (!isNoTime) {
        if (!inizio || !isValidTime(inizio)) { inputInizio.classList.add("is-invalid"); hasError = true; }
        if (!fine   || !isValidTime(fine))   { inputFine.classList.add("is-invalid");   hasError = true; }
      } else {
        inizio = "";
        fine   = "";
      }

      if (hasError) {
        showError();
        return;
      }

      const payload = { nome, sigla, inizio, fine, colore, noTime: isNoTime };

      if (editIndex !== null && editIndex >= 0 && editIndex < turni.length) {
        turni[editIndex] = payload;
      } else {
        turni.push(payload);
      }

      saveTurni(turni);
      refreshList();

      // ritorna in "Aggiungi turno" pulito
      editIndex = null;
      panelAdd.dataset.settingsTitle = defaultAddTitle;
      resetAddForm();

      // torna al pannello Turni senza alterare collapse
      if (window.SettingsUI && typeof SettingsUI.openPanel === "function") {
        window.__turniInternalNav = true;
        SettingsUI.openPanel("turni");
      }
    });

    // ----------------------------
    // Interactions: collapse / edit / row click / drag / reset on exit
    // ----------------------------
    if (window.TurniInteractions) {
      // collapse card Turni
      TurniInteractions.attachCollapsibleCard({
        cardEl,
        toggleBtn,
        headerEl,
        getCollapsed,
        setCollapsed,
        ignoreClickSelectors: ["[data-turni-edit]", "[data-turni-add]", "[data-turni-toggle]"],
        onCollapse: (collapsed) => {
          // se chiudo la card, esco da Modifica
          if (collapsed && isEditing) {
            isEditing = false;
            refreshList();
          }
        }
      });

      // edit toggle
      TurniInteractions.attachEditToggle({
        btnEdit,
        canEdit: () => Array.isArray(turni) && turni.length > 0,
        getEditing: () => isEditing,
        setEditing: (v) => { isEditing = !!v; },
        refresh: refreshList
      });

      // click rigo in edit -> modifica turno
      TurniInteractions.attachRowEditClick({
        listEl,
        getEditing: () => isEditing,
        onEditRow: (idx) => {
          if (!turni[idx]) return;
          openEditTurnoPanel(idx);
        }
      });

      // drag sort
      TurniInteractions.attachDragSort({
        listEl,
        getEditing: () => isEditing,
        getItems: () => turni,
        setItems: (arr) => { turni = Array.isArray(arr) ? arr : turni; },
        saveItems: (arr) => saveTurni(arr),
        refresh: refreshList
      });

      // reset quando esci dal pannello Turni (se non è nav interna)
      TurniInteractions.attachPanelExitReset({
        panelEl: panelTurni,
        getInternalNavFlag: () => !!window.__turniInternalNav,
        consumeInternalNavFlag: () => { window.__turniInternalNav = false; },
        onExit: () => {
          // chiudi Turni card
          isCollapsed = true;
          applyCollapsedState();

          // chiudi Turnazioni card (se presente) via Turnazione API, altrimenti classe diretta
          if (window.Turnazione && typeof Turnazione._setCollapsed === "function") {
            Turnazione._setCollapsed(true);
          } else if (turnazioniCard && turnazioniToggleBtn) {
            turnazioniCard.classList.add("is-collapsed");
            turnazioniToggleBtn.setAttribute("aria-expanded", "false");
          }

          // esci da Modifica
          if (isEditing) {
            isEditing = false;
            refreshList();
          }
        }
      });
    }

    // ----------------------------
    // Init Turnazioni (scheletro separato)
    // ----------------------------
    if (window.Turnazione && typeof Turnazione.init === "function") {
      Turnazione.init({
        panelTurni,
        turnazioniCard,
        turnazioniToggleBtn,
        turnazioniHeader,
        turnazioniAddBtn,
        turnazioniEditBtn
      });
    }

    // ----------------------------
    // API: uscita forzata modalità Modifica (usata da app.js / settings.js)
    // ----------------------------
    exitEditModeImpl = function () {
      if (!isEditing) return;
      isEditing = false;
      refreshList();
    };

    // ✅ API interna esposta (usata da turnazione.js)
    window.Turni.syncTurnoInizialeUI = syncTurnoInizialeUI;
  }

  // ============================
  // API pubblica Turni
  // ============================
  window.Turni = {
    init: initTurniPanel,
    getTurni: function () {
      return window.TurniStorage ? TurniStorage.loadTurni() : [];
    },
    getVisualizzaTurnazione: function () {
      return window.TurniStorage ? TurniStorage.loadVisualToggle() : false;
    },
    exitEditMode: function () {
      exitEditModeImpl();
    },

    // placeholder: viene sovrascritta dentro init
    syncTurnoInizialeUI: function () {}
  };
})();
