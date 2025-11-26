// turni.js

// ============================
// Pannello Turni
// ============================

(function () {
  if (!window.AppConfig) {
    throw new Error("CONFIG.MISSING: AppConfig non disponibile (turni.js)");
  }
  const { STORAGE_KEYS } = window.AppConfig;
  const TURNI_KEY     = STORAGE_KEYS.turni;
  const TURNI_VIS_KEY = STORAGE_KEYS.turniVisualizza;

  // ----------------------------
  // Storage: turni
  // ----------------------------

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

  // ----------------------------
  // Storage: toggle visualizzazione turnazione
  // (non ancora agganciato al calendario nel layout attuale)
  // ----------------------------

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

  // ----------------------------
  // Render lista turni
  // ----------------------------

  function renderTurni(listEl, turni, emptyHintEl, editBtn) {
    if (!listEl) return;
    listEl.innerHTML = "";

    if (!Array.isArray(turni) || !turni.length) {
      if (emptyHintEl) {
        emptyHintEl.hidden = false;
      }
      if (editBtn) {
        editBtn.disabled = true;
      }
      return;
    }

    if (emptyHintEl) {
      emptyHintEl.hidden = true;
    }
    if (editBtn) {
      editBtn.disabled = false;
    }

    turni.forEach(t => {
      const row = document.createElement("div");
      row.className = "turno-item";

      // [SIGLA] → pill quadrata, testo con colore scelto
      const siglaPill = document.createElement("span");
      siglaPill.className = "turno-sigla-pill";

      const siglaEl = document.createElement("span");
      siglaEl.className = "turno-sigla";
      siglaEl.textContent = t.sigla || "";
      if (t.colore) {
        siglaEl.style.color = t.colore;
      }

      siglaPill.appendChild(siglaEl);

      const nameEl = document.createElement("span");
      nameEl.className = "turno-name";
      nameEl.textContent = t.nome || "";

      const orarioEl = document.createElement("span");
      orarioEl.className = "turno-orario";
      if (t.inizio && t.fine) {
        orarioEl.textContent = `${t.inizio} - ${t.fine}`;
      }

      row.appendChild(siglaPill);
      row.appendChild(nameEl);
      row.appendChild(orarioEl);

      listEl.appendChild(row);
    });
  }

  // ----------------------------
  // Util: parsing / validazione orario
  // Accetta 00:00 .. 23:59 e 24:00
  // (se usi <input type="time"> il browser non ti farà inserire 24:00,
  // ma la funzione resta compatibile)
  // ----------------------------

  function isValidTime(str) {
    if (typeof str !== "string") return false;
    const s = str.trim();
    const m = /^(\d{1,2}):(\d{2})$/.exec(s);
    if (!m) return false;

    const h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    if (Number.isNaN(h) || Number.isNaN(min)) return false;
    if (min < 0 || min > 59) return false;
    if (h < 0 || h > 24) return false;
    if (h === 24 && min !== 0) return false;

    return true;
  }

  // ----------------------------
  // Init pannello UI
  // ----------------------------

  function initTurniPanel() {
    const settingsView = document.querySelector(".view-settings");
    if (!settingsView) return;

    // Pannello principale turni (lista)
    const panelTurni = settingsView.querySelector('.settings-panel.settings-turni[data-settings-id="turni"]');
    // Pannello aggiungi turno
    const panelAdd   = settingsView.querySelector('.settings-panel.settings-turni-add[data-settings-id="turni-add"]');

    if (!panelTurni || !panelAdd) return;

    // --- elementi pannello lista ---
    const listEl     = panelTurni.querySelector("[data-turni-list]");
    const emptyHint  = panelTurni.querySelector("[data-turni-empty-hint]");
    const btnAdd     = panelTurni.querySelector("[data-turni-add]");
    const btnEdit    = panelTurni.querySelector("[data-turni-edit]");

    // --- elementi pannello Aggiungi turno ---
    const formEl       = panelAdd.querySelector("[data-turni-add-form]");
    const inputNome    = panelAdd.querySelector("#addTurnoNome");
    const inputSigla   = panelAdd.querySelector("#addTurnoSigla");
    const inputInizio  = panelAdd.querySelector("#addTurnoOraInizio");
    const inputFine    = panelAdd.querySelector("#addTurnoOraFine");
    const colorInput   = panelAdd.querySelector("[data-turni-color]");
    const colorPreview = panelAdd.querySelector("[data-turni-color-preview]");
    const colorTrigger = panelAdd.querySelector("[data-turni-color-trigger]");
    const saveBtn      = panelAdd.querySelector("[data-turni-save]");
    const errorEl      = panelAdd.querySelector("[data-turni-error]");

    if (
      !listEl || !btnAdd || !formEl ||
      !inputNome || !inputSigla || !inputInizio || !inputFine ||
      !colorInput || !colorPreview || !colorTrigger ||
      !saveBtn || !errorEl
    ) {
      return;
    }

    // Render iniziale da localStorage
    const turniIniziali = loadTurni();
    renderTurni(listEl, turniIniziali, emptyHint, btnEdit);

    // ----------------------------
    // Gestione colore sigla
    // ----------------------------

    function applyColorPreview() {
      const v = colorInput.value || "#0a84ff";
      colorPreview.style.backgroundColor = v;
    }

    applyColorPreview();
    colorInput.addEventListener("input", applyColorPreview);
    colorInput.addEventListener("change", applyColorPreview);

    colorTrigger.addEventListener("click", () => {
      colorInput.click();
    });

    // ----------------------------
    // Form Aggiungi turno
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

    // appena l'utente digita, togliamo il bordo rosso
    [inputNome, inputSigla, inputInizio, inputFine].forEach(inp => {
      inp.addEventListener("input", () => {
        inp.classList.remove("is-invalid");
      });
    });

    function resetAddForm() {
      clearError();
      inputNome.value   = "";
      inputSigla.value  = "";
      inputInizio.value = "";
      inputFine.value   = "";
      colorInput.value  = "#0a84ff";
      applyColorPreview();
    }

    // Apertura pannello "Aggiungi turno" dal pulsante +
    btnAdd.addEventListener("click", () => {
      resetAddForm();
      if (window.SettingsUI && typeof SettingsUI.openPanel === "function") {
        SettingsUI.openPanel("turni-add");
      }
    });

    // Salvataggio nuovo turno
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
      const turni = loadTurni();
      turni.push({ nome, sigla, inizio, fine, colore });
      saveTurni(turni);
      renderTurni(listEl, turni, emptyHint, btnEdit);

      // pulizia form per la prossima volta
      resetAddForm();

      // ritorna alla schermata Turni
      if (window.SettingsUI && typeof SettingsUI.openPanel === "function") {
        SettingsUI.openPanel("turni");
      }
    });

    // (eventuale toggle visualizza turnazione in futuro)
    // const visualOn = loadVisualToggle();
    // ...
  }

  // ----------------------------
  // API pubblica Turni
  // ----------------------------

  window.Turni = {
    init: initTurniPanel,
    getTurni: loadTurni,
    getVisualizzaTurnazione: loadVisualToggle
  };
})();
