// ============================
// turni.js
// Orchestratore Pannello Turni
// - Usa TurniStorage per storage/validazione
// - Usa TurniRender per render lista
// - Usa TurniInteractions per interazioni (edit, drag, collapse, reset on exit)
// - Deleghe Turnazioni a turnazioni.js
// - Deleghe Turno Iniziale a turni-start.js
// ============================

// ===================== SPLIT bootstrap_guard : START =====================
(function () {
  if (!window.AppConfig) {
    throw new Error("CONFIG.MISSING: AppConfig non disponibile (turni.js)");
  }

  let exitEditModeImpl = function () {};
// ===================== SPLIT bootstrap_guard : END   =====================

// ===================== SPLIT init_panel_entry : START =====================
  function initTurniPanel() {
    const settingsView = document.querySelector(".view-settings");
    if (!settingsView) return;

    if (!window.TurniStorage || !window.TurniRender) {
      console.error("Turni: TurniStorage o TurniRender non disponibili");
      return;
    }
// ===================== SPLIT init_panel_entry : END   =====================

// ===================== SPLIT storage_render_deps : START =====================
    const {
      loadTurni,
      saveTurni,
      isValidTime,
      loadVisualToggle,
      saveVisualToggle
    } = window.TurniStorage;

    const { renderTurni, applySiglaFontSize } = window.TurniRender;
// ===================== SPLIT storage_render_deps : END   =====================

// ===================== SPLIT panel_refs : START =====================
    const panelTurni = settingsView.querySelector('.settings-panel.settings-turni[data-settings-id="turni"]');
    const panelAdd   = settingsView.querySelector('.settings-panel.settings-turni-add[data-settings-id="turni-add"]');
    if (!panelTurni || !panelAdd) return;

    // --- elementi pannello lista ---
    const listEl     = panelTurni.querySelector("[data-turni-list]");
    const emptyHint  = panelTurni.querySelector("[data-turni-empty-hint]");
    const btnAdd     = panelTurni.querySelector("[data-turni-add]");
    const btnEdit    = panelTurni.querySelector("[data-turni-edit]");
    const toggleBtn  = panelTurni.querySelector("[data-turni-toggle]");

    const cardEl   = toggleBtn ? toggleBtn.closest(".turni-card") : null;
    const headerEl = cardEl ? cardEl.querySelector(".turni-card-header") : null;

    // Blocco "Visualizza turnazione"
    const visualToggleBtn = panelTurni.querySelector("[data-turni-visual-toggle]");
    const visualHint      = panelTurni.querySelector("[data-turni-visual-hint]");

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

    // ---- Turnazioni refs (passate a Turnazioni.init) ----
    const turnazioniCard      = panelTurni.querySelector(".turnazioni-card");
    const turnazioniToggleBtn = panelTurni.querySelector("[data-turnazioni-toggle]");
    const turnazioniHeader    = turnazioniCard ? turnazioniCard.querySelector(".turni-card-header") : null;
    const turnazioniAddBtn    = panelTurni.querySelector("[data-turnazioni-add]");
    const turnazioniEditBtn   = panelTurni.querySelector("[data-turnazioni-edit]");

    const defaultAddTitle = panelAdd.dataset.settingsTitle || "Aggiungi turno";
    const editTitle       = "Modifica turno";
// ===================== SPLIT panel_refs : END   =====================

// ===================== SPLIT state_and_helpers : START =====================
    let turni = loadTurni();
    let isEditing = false;
    let isCollapsed = cardEl.classList.contains("is-collapsed");
    let editIndex = null;

    // Turno senza orario
    let isNoTime = false;

    // Error helper
    const errorCtl = (window.UIFeedback && typeof UIFeedback.createTempError === "function")
      ? UIFeedback.createTempError(errorEl, 2000)
      : null;

    function getCollapsed() { return isCollapsed; }
    function setCollapsed(v) { isCollapsed = !!v; }

    function applyCollapsedState() {
      cardEl.classList.toggle("is-collapsed", isCollapsed);
      toggleBtn.setAttribute("aria-expanded", isCollapsed ? "false" : "true");
    }

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

    refreshList();
    applyCollapsedState();
// ===================== SPLIT state_and_helpers : END   =====================

// ===================== SPLIT visualizza_turnazione_toggle : START =====================
    // ----------------------------
    // Toggle visualizza turnazione
    // ----------------------------
    if (visualToggleBtn && typeof loadVisualToggle === "function") {
      let visualOn = loadVisualToggle();

      function applyVisualState() {
        visualToggleBtn.classList.toggle("is-on", visualOn);
        visualToggleBtn.setAttribute("aria-checked", visualOn ? "true" : "false");

        if (visualHint) {
          visualHint.hidden = !visualOn;
        }

        // se esiste TurniStart, allinea visibilità riga “turno iniziale”
        if (window.TurniStart && typeof TurniStart.syncVisibility === "function") {
          TurniStart.syncVisibility(visualOn);
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
// ===================== SPLIT visualizza_turnazione_toggle : END   =====================

// ===================== SPLIT no_time_toggle_helper : START =====================
    // ----------------------------
    // Helper: turno senza orario
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
// ===================== SPLIT no_time_toggle_helper : END   =====================

// ===================== SPLIT form_errors : START =====================
    // ----------------------------
    // Errori form
    // ----------------------------
    let errorTimer = null;

    function clearError() {
      if (errorTimer) {
        clearTimeout(errorTimer);
        errorTimer = null;
      }
      errorEl.hidden = true;
      [inputNome, inputSigla, inputInizio, inputFine].forEach(inp => inp.classList.remove("is-invalid"));
      if (errorCtl) errorCtl.clear();
    }

    function showError() {
      [inputNome, inputSigla, inputInizio, inputFine].forEach(inp => inp.classList.remove("is-invalid"));
      if (errorCtl) {
        errorCtl.show();
        return;
      }
      // fallback vecchio
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
// ===================== SPLIT form_errors : END   =====================

// ===================== SPLIT color_and_sigla_preview : START =====================
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
// ===================== SPLIT color_and_sigla_preview : END   =====================

// ===================== SPLIT form_reset_and_open : START =====================
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
        SettingsUI.openPanel("turni-add", { internal: true });
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
        SettingsUI.openPanel("turni-add", { internal: true });
      }
    }
// ===================== SPLIT form_reset_and_open : END   =====================

// ===================== SPLIT no_time_toggle_events : START =====================
    // ----------------------------
    // Toggle "Turno senza orario"
    // ----------------------------
    applyNoTimeState();

    noTimeToggleBtn.addEventListener("click", () => {
      isNoTime = !isNoTime;
      applyNoTimeState();
    });
// ===================== SPLIT no_time_toggle_events : END   =====================

// ===================== SPLIT open_add_panel_event : START =====================
    // ----------------------------
    // Apertura pannello "Aggiungi turno"
    // ----------------------------
    btnAdd.addEventListener("click", (e) => {
      e.stopPropagation();
      openNewTurnoPanel();
    });
// ===================== SPLIT open_add_panel_event : END   =====================

// ===================== SPLIT save_turno_handler : START =====================
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

      editIndex = null;
      panelAdd.dataset.settingsTitle = defaultAddTitle;
      resetAddForm();

      if (window.SettingsUI && typeof SettingsUI.openPanel === "function") {
        SettingsUI.openPanel("turni", { internal: true });
      }
    });
// ===================== SPLIT save_turno_handler : END   =====================

// ===================== SPLIT interactions_module_attach : START =====================
    // ----------------------------
    // Interactions: collapse / edit / row click / drag / reset on exit
    // ----------------------------
    if (window.TurniInteractions) {
      TurniInteractions.attachCollapsibleCard({
        cardEl,
        toggleBtn,
        headerEl,
        getCollapsed,
        setCollapsed,
        ignoreClickSelectors: ["[data-turni-edit]", "[data-turni-add]", "[data-turni-toggle]"],
        onCollapse: (collapsed) => {
          if (collapsed && isEditing) {
            isEditing = false;
            refreshList();
          }
        }
      });

      TurniInteractions.attachEditToggle({
        btnEdit,
        canEdit: () => Array.isArray(turni) && turni.length > 0,
        getEditing: () => isEditing,
        setEditing: (v) => { isEditing = !!v; },
        refresh: refreshList
      });

      TurniInteractions.attachRowEditClick({
        listEl,
        getEditing: () => isEditing,
        onEditRow: (idx) => {
          if (!turni[idx]) return;
          openEditTurnoPanel(idx);
        }
      });

      TurniInteractions.attachDragSort({
        listEl,
        getEditing: () => isEditing,
        getItems: () => turni,
        setItems: (arr) => { turni = Array.isArray(arr) ? arr : turni; },
        saveItems: (arr) => saveTurni(arr),
        refresh: refreshList
      });

      TurniInteractions.attachPanelExitReset({
        panelEl: panelTurni,
        onExit: () => {
          isCollapsed = true;
          applyCollapsedState();

          if (window.Turnazioni && typeof Turnazioni._setCollapsed === "function") {
            Turnazioni._setCollapsed(true);
          } else if (turnazioniCard && turnazioniToggleBtn) {
            turnazioniCard.classList.add("is-collapsed");
            turnazioniToggleBtn.setAttribute("aria-expanded", "false");
          }

          if (isEditing) {
            isEditing = false;
            refreshList();
          }
        }
      });
    }
// ===================== SPLIT interactions_module_attach : END   =====================

// ===================== SPLIT init_turnazioni_module : START =====================
    // ----------------------------
    // Init Turnazioni (modulo separato)
    // ----------------------------
    if (window.Turnazioni && typeof Turnazioni.init === "function") {
      Turnazioni.init({
        panelTurni,
        turnazioniCard,
        turnazioniToggleBtn,
        turnazioniHeader,
        turnazioniAddBtn,
        turnazioniEditBtn,
        visualHintEl: visualHint
      });
    }
// ===================== SPLIT init_turnazioni_module : END   =====================

// ===================== SPLIT init_turni_start_module : START =====================
    // ----------------------------
    // Init Turno Iniziale (modulo separato)
    // ----------------------------
    if (window.TurniStart && typeof TurniStart.init === "function") {
      TurniStart.init({ panelTurni });
    }
// ===================== SPLIT init_turni_start_module : END   =====================

// ===================== SPLIT api_exit_edit_mode : START =====================
    // ----------------------------
    // API: uscita forzata modalità Modifica
    // ----------------------------
    exitEditModeImpl = function () {
      if (!isEditing) return;
      isEditing = false;
      refreshList();
    };
  }
// ===================== SPLIT api_exit_edit_mode : END   =====================

// ===================== SPLIT export_public_api : START =====================
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
    // compat: verrà usata dai moduli, se presente
    syncTurnoInizialeUI: function () {}
  };
})();
// ===================== SPLIT export_public_api : END   =====================
