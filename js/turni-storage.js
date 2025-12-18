// ============================
// turni-storage.js
// Storage e validazione turni
// ============================

(function () {
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
})();
