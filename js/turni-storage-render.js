// =====================================================
// turni-storage-render.js (bundle storage + render)
// Build: 2025-12-18
// Contenuti:
//// - turni-storage.js
// - turni-render.js
// =====================================================

// ============================
// Storage e validazione turni
// turni-storage.js v 1.0
// ============================

(function () {

  // ===================== SPLIT bootstrap_config : START =====================
  if (!window.AppConfig) {
    throw new Error("CONFIG.MISSING: AppConfig non disponibile (turni-storage.js)");
  }

  const { STORAGE_KEYS } = window.AppConfig;

  const TURNI_KEY     = STORAGE_KEYS.turni;
  const TURNI_VIS_KEY = STORAGE_KEYS.turniVisualizza;

  // ✅ Turnazioni
  const TURNAZIONI_KEY = STORAGE_KEYS.turnazioni;
  const TURNAZIONI_PREF_KEY = STORAGE_KEYS.turnazioniPreferred;

  // ✅ Turno iniziale
  const TURNI_START_KEY = STORAGE_KEYS.turniStart;
  // ===================== SPLIT bootstrap_config : END   =====================

  // ===================== SPLIT storage_turni_personalizzati : START =====================
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
  // ===================== SPLIT storage_turni_personalizzati : END   =====================

  // ===================== SPLIT storage_toggle_visualizzazione_turnazione : START =====================
  // ============================
  // Storage: toggle visualizzazione turnazione
  // ============================

  function loadVisualToggle() {
    try {
      const raw = localStorage.getItem(TURNI_VIS_KEY);
      if (raw === "true") return true;
      if (raw === "false") return false;
      return true; // default: acceso
    } catch {
      return true;
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
  // ===================== SPLIT storage_toggle_visualizzazione_turnazione : END   =====================

  // ===================== SPLIT storage_turnazioni : START =====================
  // ============================
  // ✅ Storage: turnazioni
  // ============================

  function loadTurnazioni() {
    try {
      const raw = localStorage.getItem(TURNAZIONI_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveTurnazioni(arr) {
    try {
      localStorage.setItem(TURNAZIONI_KEY, JSON.stringify(Array.isArray(arr) ? arr : []));

      if (window.Status && typeof Status.markSaved === "function") {
        Status.markSaved();
      }
    } catch (e) {
      console.warn("Salvataggio turnazioni fallito:", e);
    }
  }

  function loadPreferredTurnazioneId() {
    try {
      const v = localStorage.getItem(TURNAZIONI_PREF_KEY);
      return v || null;
    } catch {
      return null;
    }
  }

  function savePreferredTurnazioneId(id) {
    try {
      if (!id) {
        localStorage.removeItem(TURNAZIONI_PREF_KEY);
      } else {
        localStorage.setItem(TURNAZIONI_PREF_KEY, String(id));
      }

      if (window.Status && typeof Status.markSaved === "function") {
        Status.markSaved();
      }
    } catch (e) {
      console.warn("Salvataggio preferita fallito:", e);
    }
  }
  // ===================== SPLIT storage_turnazioni : END   =====================

  // ===================== SPLIT storage_turno_iniziale : START =====================
  // ============================
  // ✅ Storage: turno iniziale
  // payload:
  // { date: "YYYY-MM-DD" | "", slotIndex: number | null }
  // ============================

  function loadTurnoIniziale() {
    try {
      const raw = localStorage.getItem(TURNI_START_KEY);
      if (!raw) return { date: "", slotIndex: null };
      const parsed = JSON.parse(raw) || {};
      return {
        date: (typeof parsed.date === "string") ? parsed.date : "",
        slotIndex: (Number.isInteger(parsed.slotIndex) ? parsed.slotIndex : null)
      };
    } catch {
      return { date: "", slotIndex: null };
    }
  }

  function saveTurnoIniziale(obj) {
    try {
      const payload = obj && typeof obj === "object" ? obj : {};
      const out = {
        date: (typeof payload.date === "string") ? payload.date : "",
        slotIndex: (Number.isInteger(payload.slotIndex) ? payload.slotIndex : null)
      };

      localStorage.setItem(TURNI_START_KEY, JSON.stringify(out));

      if (window.Status && typeof Status.markSaved === "function") {
        Status.markSaved();
      }
    } catch (e) {
      console.warn("Salvataggio turno iniziale fallito:", e);
    }
  }
  // ===================== SPLIT storage_turno_iniziale : END   =====================

  // ===================== SPLIT util_validazione_orario : START =====================
  // ============================
  // Util: parsing / validazione orario
  // Accetta 00:00 .. 23:59 e 24:00
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
  // ===================== SPLIT util_validazione_orario : END   =====================

  // ===================== SPLIT export_api_pubblica : START =====================
  // ============================
  // API pubblica
  // ============================

  window.TurniStorage = {
    loadTurni,
    saveTurni,
    loadVisualToggle,
    saveVisualToggle,
    isValidTime,

    // ✅ Turnazioni
    loadTurnazioni,
    saveTurnazioni,
    loadPreferredTurnazioneId,
    savePreferredTurnazioneId,

    // ✅ Turno iniziale
    loadTurnoIniziale,
    saveTurnoIniziale
  };
  // ===================== SPLIT export_api_pubblica : END   =====================

})();

// ============================
// Render lista turni + font sigla
// turni-render.js v 1.0
// ============================

(function () {
// ===================== SPLIT font-sigla : START =====================
  // ============================
  // Font sigla: gestione dimensione
  // ============================

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
// ===================== SPLIT font-sigla : END =====================


// ===================== SPLIT render-lista-turni : START =====================
  // ============================
  // Render lista turni
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
// ===================== SPLIT render-lista-turni : END =====================


// ===================== SPLIT api-pubblica : START =====================
  // ============================
  // API pubblica
  // ============================

  window.TurniRender = {
    applySiglaFontSize,
    renderTurni
  };
// ===================== SPLIT api-pubblica : END =====================
})();
