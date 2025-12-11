// ============================
// turni.js
// Pannello Turni (Impostazioni → Turni)
// - Usa TurniStorage per storage e validazione
// - Usa TurniRender per la lista
// - Gestisce pannelli, form, drag & drop, modalità Modifica
// ============================

(function () {
  if (!window.AppConfig) {
    throw new Error("CONFIG.MISSING: AppConfig non disponibile (turni.js)");
  }

  // ============================
  // Init pannello UI Turni
  // (lista + pannello "Aggiungi turno" / "Modifica turno")
  // ============================

  function initTurniPanel() {
    const settingsView = document.querySelector(".view-settings");
    if (!settingsView) return;

    if (!window.TurniStorage || !window.TurniRender) {
      console.error("Turni: TurniStorage o TurniRender non disponibili");
      return;
    }

    const { loadTurni, saveTurni, isValidTime } = window.TurniStorage;
    const { renderTurni, applySiglaFontSize } = window.TurniRender;

    // Pannello principale turni (lista)
    const panelTurni = settingsView.querySelector('.settings-panel.settings-turni[data-settings-id="turni"]');
    // Pannello "Aggiungi turno"
    const panelAdd   = settingsView.querySelector('.settings-panel.settings-turni-add[data-settings-id="turni-add"]');

    if (!panelTurni || !panelAdd) return;

    // --- elementi pannello lista ---
    const listEl     = panelTurni.querySelector("[data-turni-list]");
    const emptyHint  = panelTurni.querySelector("[data-turni-empty-hint]");
    const btnAdd     = panelTurni.querySelector("[data-turni-add]");
    const btnEdit    = panelTurni.querySelector("[data-turni-edit]");
    const toggleBtn  = panelTurni.querySelector("[data-turni-toggle]");
    const cardEl     = panelTurni.querySelector(".turni-card:not(.turnazioni-card)");
    const headerEl   = cardEl ? cardEl.querySelector(".turni-card-header") : null;

    // Blocco "Visualizza turnazione"
    const visualToggleBtn = panelTurni.querySelector("[data-turni-visual-toggle]");
    const visualHint      = panelTurni.querySelector("[data-turni-visual-hint]");

    // --- elementi pannello "Aggiungi turno" ---
    const formEl         = panelAdd.querySelector("[data-turni-add-form]");
    const inputNome      = panelAdd.querySelector("#addTurnoNome");
    const inputSigla     = panelAdd.querySelector("#addTurnoSigla");
    const inputInizio    = panelAdd.querySelector("#addTurnoOraInizio");
    const inputFine      = panelAdd.querySelector("#addTurnoOraFine");
    const colorInput     = panelAdd.querySelector("[data-turni-color]");
    const colorPreview   = panelAdd.querySelector("[data-turni-color-preview]");
    const colorTrigger   = panelAdd.querySelector("[data-turni-color-trigger]");
    const saveBtn        = panelAdd.querySelector("[data-turni-save]");
    const errorEl        = panelAdd.querySelector("[data-turni-error]");
    const siglaPreviewEl = panelAdd.querySelector("[data-turni-sigla-preview]");

    if (
      !listEl || !btnAdd || !btnEdit || !toggleBtn || !cardEl || !headerEl || !formEl ||
      !inputNome || !inputSigla || !inputInizio || !inputFine ||
      !colorInput || !colorPreview || !colorTrigger ||
      !saveBtn || !errorEl || !siglaPreviewEl
    ) {
      return;
    }

    // Titolo predefinito del pannello add/edit
    const defaultAddTitle = panelAdd.dataset.settingsTitle || "Aggiungi turno";
    const editTitle       = "Modifica turno";

    // Stato locale turni + modalità Modifica
    let turni = loadTurni();
    let isEditing = false;

    // Stato collassato della card TURNI:
    // lo leggiamo dalla classe iniziale nell'HTML (is-collapsed)
    let isCollapsed = cardEl.classList.contains("is-collapsed");

    // indice del turno attualmente in modifica; null = aggiunta nuovo
    let editIndex = null;

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

          if (!turni.length) {
            isEditing = false;
          }

          refreshList();
        }
      });
    }

    // =========================
    // TOGGLE "VISUALIZZA TURNAZIONE"
    // =========================
    if (visualToggleBtn && window.TurniStorage && typeof TurniStorage.loadVisualToggle === "function") {
      let visualOn = TurniStorage.loadVisualToggle();

      function applyVisualState() {
        visualToggleBtn.classList.toggle("is-on", visualOn);
        visualToggleBtn.setAttribute("aria-checked", visualOn ? "true" : "false");

        // se il toggle è OFF, nascondi "Nessuna turnazione impostata"
        if (visualHint) {
          visualHint.hidden = !visualOn;
        }
      }

      applyVisualState();

      visualToggleBtn.addEventListener("click", () => {
        visualOn = !visualOn;
        applyVisualState();

        if (typeof TurniStorage.saveVisualToggle === "function") {
          TurniStorage.saveVisualToggle(visualOn);
        }
      });
    }

    // =========================
    // CARD "TURNAZIONI" (scheletro)
     // =========================
    const turnazioniCard      = panelTurni.querySelector(".turnazioni-card");
    const turnazioniToggleBtn = panelTurni.querySelector("[data-turnazioni-toggle]");
    const turnazioniHeader    = turnazioniCard ? turnazioniCard.querySelector(".turni-card-header") : null;
    const turnazioniAddBtn    = panelTurni.querySelector("[data-turnazioni-add]");
    const turnazioniEditBtn   = panelTurni.querySelector("[data-turnazioni-edit]");

    // Stato iniziale preso dalla classe HTML
    let turnazioniCollapsed = turnazioniCard
      ? turnazioniCard.classList.contains("is-collapsed")
      : true;

    function applyTurnazioniCollapsed() {
      if (!turnazioniCard || !turnazioniToggleBtn) return;
      turnazioniCard.classList.toggle("is-collapsed", turnazioniCollapsed);
      turnazioniToggleBtn.setAttribute("aria-expanded", turnazioniCollapsed ? "false" : "true");
    }

    applyTurnazioniCollapsed();

    if (turnazioniToggleBtn) {
      turnazioniToggleBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        turnazioniCollapsed = !turnazioniCollapsed;
        applyTurnazioniCollapsed();
      });
    }

    if (turnazioniHeader) {
      turnazioniHeader.addEventListener("click", (e) => {
        // non intercettare click su + o freccia
        if (e.target.closest("[data-turnazioni-add],[data-turnazioni-toggle]")) {
          return;
        }
        turnazioniCollapsed = !turnazioniCollapsed;
        applyTurnazioniCollapsed();
      });
    }

    if (turnazioniAddBtn) {
      turnazioniAddBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (window.SettingsUI && typeof SettingsUI.openPanel === "function") {
          // segnalazione: nav interna da Turni verso sotto-pannello
          window.__turniInternalNav = true;
          SettingsUI.openPanel("turnazioni-add");
        }
      });
    }

    // Modifica resta disabilitato fino a quando non implementiamo davvero le turnazioni
    if (turnazioniEditBtn) {
      turnazioniEditBtn.disabled = true;
    }

    // =========================
    // Osservatore: capisco quando ESCI da Impostazioni → Turni
    // =========================

    // Quando il pannello "turni" perde .is-active:
    // - se NON è una nav interna (verso turni-add / turnazioni-add) → chiudo le card
    // - se è nav interna → lascio lo stato com'è
    let wasActive = panelTurni.classList.contains("is-active");

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        if (m.type !== "attributes" || m.attributeName !== "class") return;

        const isActiveNow = panelTurni.classList.contains("is-active");

        // Uscita dal pannello Turni
        if (wasActive && !isActiveNow) {
          // Se non è nav interna, resetto lo stato (card chiuse)
          if (!window.__turniInternalNav) {
            // chiudo Turni
            isCollapsed = true;
            applyCollapsedState();

            // chiudo Turnazioni
            turnazioniCollapsed = true;
            applyTurnazioniCollapsed();

            // esco anche da modalità Modifica
            if (isEditing) {
              isEditing = false;
              refreshList();
            }
          } else {
            // nav interna consumata
            window.__turniInternalNav = false;
          }
        }

        wasActive = isActiveNow;
      });
    });

    observer.observe(panelTurni, {
      attributes: true,
      attributeFilter: ["class"]
    });

    // espone un modo per uscire dalla modalità Modifica quando
    // si esce dal menu Impostazioni / si cambia tab (fallback per SettingsUI)
    window.Turni.exitEditMode = function () {
      if (!isEditing) return;
      isEditing = false;
      refreshList();
    };

    // ============================
    // Helper: form "nuovo" vs "modifica"
    // ============================

    function resetAddForm() {
      // non tocca titolo pannello; solo contenuti
      clearError();
      inputNome.value   = "";
      inputSigla.value  = "";
      inputInizio.value = "";
      inputFine.value   = "";
      siglaPreviewEl.textContent = "";
      applySiglaFontSize(siglaPreviewEl, "");
      colorInput.value  = "#0a84ff";
      applyColorPreview();
    }

    function openNewTurnoPanel() {
      editIndex = null;
      panelAdd.dataset.settingsTitle = defaultAddTitle;
      resetAddForm();

      if (window.SettingsUI && typeof SettingsUI.openPanel === "function") {
        // nav interna: da Turni → turni-add
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

      inputNome.value   = t.nome || "";
      inputSigla.value  = t.sigla || "";
      inputInizio.value = t.inizio || "";
      inputFine.value   = t.fine || "";

      // Colore
      colorInput.value = t.colore || "#0a84ff";
      applyColorPreview();

      // Anteprima sigla
      siglaPreviewEl.textContent = t.sigla || "";
      applySiglaFontSize(siglaPreviewEl, t.sigla || "");

      if (window.SettingsUI && typeof SettingsUI.openPanel === "function") {
        // nav interna: da Turni → turni-add
        window.__turniInternalNav = true;
        SettingsUI.openPanel("turni-add");
      }
    }

    // Render iniziale da localStorage
    refreshList();
    applyCollapsedState();

    // ----------------------------
    // Drag & drop riordino turni (pointer events)
    // ----------------------------

    let draggedRow = null;

    function getDragAfterElement(container, y) {
      const rows = [...container.querySelectorAll(".turno-item:not(.dragging)")];

      return rows.reduce(
        (closest, child) => {
          const box = child.getBoundingClientRect();
          const offset = y - (box.top + box.height / 2);
          if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
          } else {
            return closest;
          }
        },
        { offset: Number.NEGATIVE_INFINITY }
      ).element;
    }

    function onPointerMove(e) {
      if (!draggedRow) return;

      e.preventDefault();
      const y = e.clientY;

      const rows = Array.from(listEl.querySelectorAll(".turno-item"));
      const oldRects = new Map();
      rows.forEach(row => {
        oldRects.set(row, row.getBoundingClientRect());
      });

      const afterElement = getDragAfterElement(listEl, y);

      // Se non cambia posizione, non fare niente
      if (afterElement === draggedRow || (afterElement && afterElement.previousSibling === draggedRow)) {
        return;
      }

      if (afterElement == null) {
        listEl.appendChild(draggedRow);
      } else {
        listEl.insertBefore(draggedRow, afterElement);
      }

      // FLIP: anima gli altri righi che si spostano
      const newRows = Array.from(listEl.querySelectorAll(".turno-item"));
      newRows.forEach(row => {
        if (row === draggedRow) return;

        const oldRect = oldRects.get(row);
        if (!oldRect) return;
        const newRect = row.getBoundingClientRect();

        const dy = oldRect.top - newRect.top;
        if (Math.abs(dy) > 1) {
          row.style.transition = "none";
          row.style.transform = `translateY(${dy}px)`;
          requestAnimationFrame(() => {
            row.style.transition = "transform 0.12s ease";
            row.style.transform = "";
          });
        }
      });
    }

    function onPointerUp() {
      if (draggedRow) {
        draggedRow.classList.remove("dragging");

        // Ricostruisci l'array turni in base al nuovo ordine DOM
        const newOrder = [];
        const rowEls = listEl.querySelectorAll(".turno-item");
        rowEls.forEach(rowEl => {
          const idx = parseInt(rowEl.dataset.index, 10);
          if (!Number.isNaN(idx) && turni[idx]) {
            newOrder.push(turni[idx]);
          }
        });

        if (newOrder.length === turni.length) {
          turni = newOrder;
          saveTurni(turni);
          // resta in modalità Modifica, ma con i nuovi index aggiornati
          refreshList();
        }

        draggedRow = null;
      }

      // riabilita selezione normale
      document.documentElement.classList.remove("turni-no-select");
      document.body.classList.remove("turni-no-select");

      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
    }

    listEl.addEventListener("pointerdown", (e) => {
      if (!isEditing) return;

      const handle = e.target.closest(".turni-handle");
      if (!handle) return;

      const row = handle.closest(".turno-item");
      if (!row) return;

      draggedRow = row;
      draggedRow.classList.add("dragging");

      // blocca selezione/testo + menu lungo pressione
      document.documentElement.classList.add("turni-no-select");
      document.body.classList.add("turni-no-select");

      // Evita scroll durante il drag su mobile
      e.preventDefault();

      // se c'è qualche selezione già attiva, la togliamo
      if (window.getSelection) {
        const sel = window.getSelection();
        if (sel && sel.removeAllRanges) {
          sel.removeAllRanges();
        }
      }

      document.addEventListener("pointermove", onPointerMove);
      document.addEventListener("pointerup", onPointerUp);
    });

    // ----------------------------
    // Click su rigo turno in modalità Modifica → "Modifica turno"
    // ----------------------------

    listEl.addEventListener("click", (e) => {
      if (!isEditing) return;

      // ignora click su pallino rosso e sulla maniglia
      if (e.target.closest(".turno-delete-btn") || e.target.closest(".turni-handle")) {
        return;
      }

      const row = e.target.closest(".turno-item");
      if (!row) return;

      const idx = parseInt(row.dataset.index, 10);
      if (Number.isNaN(idx) || !turni[idx]) return;

      openEditTurnoPanel(idx);
    });

    // ----------------------------
    // Gestione colore sigla
    // ----------------------------

    function applyColorPreview() {
      const v = colorInput.value || "#0a84ff";
      colorPreview.style.backgroundColor = v;
      siglaPreviewEl.style.color = v;
    }

    applyColorPreview();

    colorInput.addEventListener("input", applyColorPreview);
    colorInput.addEventListener("change", applyColorPreview);

    // ----------------------------
    // Gestione anteprima sigla [M]
    // ----------------------------

    function updateSiglaPreview() {
      const txt = (inputSigla.value || "").trim();
      siglaPreviewEl.textContent = txt || "";
      applySiglaFontSize(siglaPreviewEl, txt);
    }

    updateSiglaPreview();

    inputSigla.addEventListener("input", () => {
      inputSigla.classList.remove("is-invalid");
      updateSiglaPreview();
    });

    // ----------------------------
    // Gestione errori form "Aggiungi turno" / "Modifica turno"
    // ----------------------------

    let errorTimer = null;

    function clearError() {
      if (errorTimer) {
        clearTimeout(errorTimer);
        errorTimer = null;
      }

      errorEl.hidden = true;

      // rimuove stato errore dai campi
      [inputNome, inputSigla, inputInizio, inputFine].forEach(inp => {
        inp.classList.remove("is-invalid");
      });
    }

    function showError() {
      clearError();
      errorEl.hidden = false;

      errorTimer = setTimeout(() => {
        errorEl.hidden = true;
        [inputNome, inputSigla, inputInizio, inputFine].forEach(inp => {
          inp.classList.remove("is-invalid");
        });
      }, 2000);
    }

    // appena l'utente digita, togliamo il bordo rosso (già gestito anche su sigla)
    [inputNome, inputInizio, inputFine].forEach(inp => {
      inp.addEventListener("input", () => {
        inp.classList.remove("is-invalid");
      });
    });

    // ----------------------------
    // Apertura pannello "Aggiungi turno" (nuovo)
    // ----------------------------

    btnAdd.addEventListener("click", (e) => {
      e.stopPropagation(); // non collassare la card quando apri Aggiungi turno
      openNewTurnoPanel();
    });

    // ----------------------------
    // Bottone "Modifica" → modalità cancellazione + drag
    // ----------------------------

    if (btnEdit) {
      btnEdit.addEventListener("click", (e) => {
        e.stopPropagation(); // non far collassare l'header
        if (!Array.isArray(turni) || !turni.length) {
          return;
        }
        isEditing = !isEditing;
        refreshList();
      });
    }

    // ----------------------------
    // Freccia apri/chiudi pannello Turni
    // ----------------------------
    if (toggleBtn) {
      toggleBtn.addEventListener("click", (e) => {
        e.stopPropagation(); // gestisce solo il toggle freccia
        isCollapsed = !isCollapsed;

        // Se sto chiudendo il rigo Turni, esco anche dalla modalità Modifica
        if (isCollapsed && isEditing) {
          isEditing = false;
          refreshList();
        }

        applyCollapsedState();
      });
    }

    // Header cliccabile: apre/chiude il pannello,
    // ma ignora click su Modifica, + e freccia.
    if (headerEl) {
      headerEl.addEventListener("click", (e) => {
        if (e.target.closest("[data-turni-edit],[data-turni-add],[data-turni-toggle]")) {
          return;
        }

        isCollapsed = !isCollapsed;

        // Se sto chiudendo il rigo Turni con tap sul rigo, esco da Modifica
        if (isCollapsed && isEditing) {
          isEditing = false;
          refreshList();
        }

        applyCollapsedState();
      });
    }

    // ----------------------------
    // Salvataggio nuovo turno / modifica turno
    // ----------------------------

    saveBtn.addEventListener("click", () => {
      clearError();

      const nome   = (inputNome.value || "").trim();
      const sigla  = (inputSigla.value || "").trim();
      const inizio = (inputInizio.value || "").trim();
      const fine   = (inputFine.value || "").trim();
      const colore = colorInput.value || "#0a84ff";

      let hasError = false;

      if (!nome) {
        inputNome.classList.add("is-invalid");
        hasError = true;
      }
      if (!sigla) {
        inputSigla.classList.add("is-invalid");
        hasError = true;
      }
      if (!inizio || !isValidTime(inizio)) {
        inputInizio.classList.add("is-invalid");
        hasError = true;
      }
      if (!fine || !isValidTime(fine)) {
        inputFine.classList.add("is-invalid");
        hasError = true;
      }

      if (hasError) {
        showError();
        return;
      }

      const payload = { nome, sigla, inizio, fine, colore };

      // Se ho un indice valido → MODIFICA
      if (editIndex !== null &&
          editIndex >= 0 &&
          editIndex < turni.length) {
        turni[editIndex] = payload;
      } else {
        // altrimenti → NUOVO turno
        turni.push(payload);
      }

      saveTurni(turni);
      refreshList();

      // dopo il salvataggio, torni in modalità "Aggiungi turno" per il prossimo giro
      editIndex = null;
      panelAdd.dataset.settingsTitle = defaultAddTitle;
      resetAddForm();

      // ritorna alla schermata Turni SENZA toccare lo stato aperto/chiuso delle card
      if (window.SettingsUI && typeof SettingsUI.openPanel === "function") {
        window.__turniInternalNav = true; // nav interna: da turni-add → turni
        SettingsUI.openPanel("turni");
      }
    });

    // (toggle visualizza turnazione potrà usare loadVisualToggle/saveVisualToggle in futuro)
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
    // impostata a no-op, poi rimpiazzata da initTurniPanel
    exitEditMode: function () {}
  };
})();
