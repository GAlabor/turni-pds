// ============================
// turni.js
// Pannello Turni (Impostazioni → Turni)
// - Gestione storage turni (localStorage)
// - Render lista turni salvati
// - Form "Aggiungi turno"
// - Toggle "visualizza turnazione" (solo storage, non agganciato alla UI)
// - Riordino turni tramite handle a destra in modalità Modifica
// ============================

(function () {
  if (!window.AppConfig) {
    throw new Error("CONFIG.MISSING: AppConfig non disponibile (turni.js)");
  }

  const { STORAGE_KEYS } = window.AppConfig;
  const TURNI_KEY     = STORAGE_KEYS.turni;
  const TURNI_VIS_KEY = STORAGE_KEYS.turniVisualizza;

  // ============================
  // Font sigla: lettura da CSS var
  // ============================

  let BASE_SIGLA_FONT_PX = null;

  function getBaseSiglaFontSize() {
    if (BASE_SIGLA_FONT_PX !== null) {
      return BASE_SIGLA_FONT_PX;
    }

    try {
      const rootStyles = getComputedStyle(document.documentElement);
      const raw = rootStyles.getPropertyValue("--fs-turni-sigla") || "";
      const parsed = parseFloat(raw);
      BASE_SIGLA_FONT_PX = Number.isNaN(parsed) ? 15 : parsed;
    } catch {
      BASE_SIGLA_FONT_PX = 15;
    }

    return BASE_SIGLA_FONT_PX;
  }

  // modifica la dimensione di --fs-turni-sigla in base ai caratteri
  // della preview - anteprima della sigla
  function getSiglaFontSizeValue(siglaText) {
    const len = (siglaText || "").length;

    if (len <= 2) return 15;    // 1–2 caratteri
    if (len === 3) return 14;   // 3 caratteri
    return 11.5;                // 4+ caratteri
  }

  function applySiglaFontSize(el, siglaText) {
    if (!el) return;
    const sizePx = getSiglaFontSizeValue(siglaText);
    el.style.fontSize = `${sizePx}px`;
  }

  // ============================
  // Storage: turni personalizzati
  // ============================

  function loadTurni() {
    try {
      const raw = localStorage.getItem(TURNI_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveTurni(turni) {
    try {
      localStorage.setItem(TURNI_KEY, JSON.stringify(turni));

      if (window.Status && typeof Status.markSaved === "function") {
        Status.markSaved();
      }
    } catch (e) {
      console.warn("Salvataggio turni fallito:", e);
    }
  }

  // ============================
  // Storage: toggle visualizzazione turnazione
  // (solo storage; non ancora collegato al calendario nella UI attuale)
  // ============================

  function loadVisualToggle() {
    try {
      const raw = localStorage.getItem(TURNI_VIS_KEY);
      if (raw === "true") return true;
      if (raw === "false") return false;
      return false; // default: spento
    } catch {
      return false;
    }
  }

  function saveVisualToggle(isOn) {
    try {
      localStorage.setItem(TURNI_VIS_KEY, isOn ? "true" : "false");

      if (window.Status && typeof Status.markSaved === "function") {
        Status.markSaved();
      }
    } catch (e) {
      console.warn("Salvataggio toggle turnazione fallito:", e);
    }
  }

  // ============================
  // Render lista turni
  // Usata nel pannello Impostazioni → Turni
  // options:
  //   - isEditing: bool
  //   - onDelete: function(index)
  // ============================

  function renderTurni(listEl, turni, emptyHintEl, editBtn, options) {
    if (!listEl) return;

    const opts = options || {};
    const isEditing = !!opts.isEditing;
    const onDelete = typeof opts.onDelete === "function" ? opts.onDelete : null;

    listEl.innerHTML = "";

    const hasTurni = Array.isArray(turni) && turni.length > 0;

    if (!hasTurni) {
      listEl.classList.remove("editing");

      if (emptyHintEl) {
        emptyHintEl.hidden = false;
      }
      if (editBtn) {
        editBtn.disabled = true;
        editBtn.textContent = "Modifica";
        editBtn.removeAttribute("aria-pressed");
      }
      return;
    }

    // indica visivamente la modalità Modifica (serve anche al CSS per mostrare le handle)
    listEl.classList.toggle("editing", isEditing);

    if (emptyHintEl) {
      emptyHintEl.hidden = true;
    }

    if (editBtn) {
      editBtn.disabled = false;
      editBtn.textContent = isEditing ? "Fine" : "Modifica";
      if (isEditing) {
        editBtn.setAttribute("aria-pressed", "true");
      } else {
        editBtn.removeAttribute("aria-pressed");
      }
    }

    turni.forEach((t, index) => {
      const row = document.createElement("div");
      row.className = "turno-item";
      // serve per ricostruire l'ordine dei turni dopo il drag
      row.dataset.index = String(index);

      // In modalità Modifica: pallino rosso (-) a sinistra
      if (isEditing && onDelete) {
        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "turno-delete-btn";
        delBtn.setAttribute("aria-label", "Elimina turno");
        const iconSpan = document.createElement("span");
        iconSpan.className = "turno-delete-icon";
        iconSpan.textContent = "−";
        delBtn.appendChild(iconSpan);

        delBtn.addEventListener("click", (ev) => {
          ev.stopPropagation();
          onDelete(index);
        });

        row.appendChild(delBtn);
      }

      // [SIGLA] → pill quadrata, testo con colore scelto
      const siglaPill = document.createElement("span");
      siglaPill.className = "turno-sigla-pill";

      const siglaEl = document.createElement("span");
      siglaEl.className = "turno-sigla";
      const siglaTxt = t.sigla || "";
      siglaEl.textContent = siglaTxt;
      if (t.colore) {
        siglaEl.style.color = t.colore;
      }
      // font dinamico in base alla lunghezza sigla
      applySiglaFontSize(siglaEl, siglaTxt);

      siglaPill.appendChild(siglaEl);

      const nameEl = document.createElement("span");
      nameEl.className = "turno-name";
      nameEl.textContent = t.nome || "";

      const orarioEl = document.createElement("span");
      orarioEl.className = "turno-orario";
      if (t.inizio && t.fine) {
        orarioEl.textContent = `${t.inizio} - ${t.fine}`;
      }

      // Handle di drag a destra (sempre presente; visibilità gestita via CSS con .turni-list.editing)
      const handle = document.createElement("div");
      handle.className = "turni-handle";
      handle.setAttribute("aria-hidden", "true");
      handle.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M6 7 H18" />
          <path d="M6 12 H18" />
          <path d="M6 17 H18" />
        </svg>
      `;

      row.appendChild(siglaPill);
      row.appendChild(nameEl);
      row.appendChild(orarioEl);
      row.appendChild(handle);

      listEl.appendChild(row);
    });
  }

  // ============================
  // Util: parsing / validazione orario
  // Accetta 00:00 .. 23:59 e 24:00
  // (se usi <input type="time"> il browser non ti farà inserire 24:00,
  // ma la funzione resta compatibile)
  // ============================

  function isValidTime(str) {
    if (typeof str !== "string") return false;
    const s = str.trim();
    const m = /^(\d{1,2}):(\d{2})$/.exec(s);
    if (!m) return false;

    const h   = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);

    if (Number.isNaN(h) || Number.isNaN(min)) return false;
    if (min < 0 || min > 59) return false;
    if (h < 0 || h > 24) return false;
    if (h === 24 && min !== 0) return false;

    return true;
  }

  // ============================
  // Init pannello UI Turni
  // (lista + pannello "Aggiungi turno")
  // ============================

  function initTurniPanel() {
    const settingsView = document.querySelector(".view-settings");
    if (!settingsView) return;

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
      !listEl || !btnAdd || !formEl ||
      !inputNome || !inputSigla || !inputInizio || !inputFine ||
      !colorInput || !colorPreview || !colorTrigger ||
      !saveBtn || !errorEl || !siglaPreviewEl
    ) {
      return;
    }

    // Forziamo una lettura iniziale della var CSS (cache)
    getBaseSiglaFontSize();

    // Stato locale turni + modalità Modifica
    let turni = loadTurni();
    let isEditing = false;

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

    // Render iniziale da localStorage
    refreshList();

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
    // Gestione errori form "Aggiungi turno"
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
    // Reset form Aggiungi turno
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
    }

    // ----------------------------
    // Apertura pannello "Aggiungi turno"
    // ----------------------------

    btnAdd.addEventListener("click", () => {
      resetAddForm();

      if (window.SettingsUI && typeof SettingsUI.openPanel === "function") {
        SettingsUI.openPanel("turni-add");
      }
    });

    // ----------------------------
    // Bottone "Modifica" → modalità cancellazione + drag
    // ----------------------------

    if (btnEdit) {
      btnEdit.addEventListener("click", () => {
        if (!Array.isArray(turni) || !turni.length) {
          return;
        }
        isEditing = !isEditing;
        refreshList();
      });
    }

    // ----------------------------
    // Salvataggio nuovo turno
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

      // Salva turno
      turni.push({ nome, sigla, inizio, fine, colore });
      saveTurni(turni);
      refreshList();

      // pulizia form per la prossima volta
      resetAddForm();

      // ritorna alla schermata Turni
      if (window.SettingsUI && typeof SettingsUI.openPanel === "function") {
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
    getTurni: loadTurni,
    getVisualizzaTurnazione: loadVisualToggle
    // saveVisualToggle resta interno per ora, ma è pronto se ti serve
  };
})();
