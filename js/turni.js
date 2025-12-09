// ============================
// turni.js
// Pannello Turni (Impostazioni → Turni)
// - Gestione storage turni (localStorage)
// - Render lista turni salvati
// - Form "Aggiungi turno" / "Modifica turno"
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
        editBtn.classList.remove("icon-circle-btn");
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

      if (isEditing) {
        // Modalità MODIFICA attiva:
        // il bottone diventa un cerchio stile (+) con icona check
        editBtn.setAttribute("aria-pressed", "true");
        editBtn.classList.add("icon-circle-btn");
        editBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M6 12.5 L10 16.5 L18 7.5" />
          </svg>
        `;
      } else {
        // Modalità normale: pillola testuale "Modifica"
        editBtn.removeAttribute("aria-pressed");
        editBtn.classList.remove("icon-circle-btn");
        editBtn.textContent = "Modifica";
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
  // (lista + pannello "Aggiungi turno" / "Modifica turno")
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
    const toggleBtn  = panelTurni.querySelector("[data-turni-toggle]");
    const cardEl     = panelTurni.querySelector(".turni-card");
    const headerEl   = panelTurni.querySelector(".turni-card-header");

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

    // Forziamo una lettura iniziale della var CSS (cache)
    getBaseSiglaFontSize();

    // Stato locale turni + modalità Modifica
    let turni = loadTurni();
    let isEditing = false;
    let isCollapsed = false; // pannello aperto di default

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

    // espone un modo per uscire dalla modalità Modifica quando
    // si esce dal menu Impostazioni / si cambia tab
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
    getVisualizzaTurnazione: loadVisualToggle,
    // impostata a no-op, poi rimpiazzata da initTurniPanel
    exitEditMode: function () {}
  };
})();
