// ============================
// Icona stato / salvataggio
// Usa l’elemento #statusIcon con classi:
// - status-idle
// - status-saving
// - status-ok
// I CSS gestiscono cerchi / omino / animazione
// status.js v 1.0
// ============================

(function () {

  // ===================== SPLIT bootstrap-guard : START =====================
  if (!window.AppConfig) {
    throw new Error("CONFIG.MISSING: AppConfig non disponibile (status.js)");
  }
  // ===================== SPLIT bootstrap-guard : END =======================

  // ===================== SPLIT config-bindings : START =====================
  const { STATUS } = window.AppConfig;
  // ===================== SPLIT config-bindings : END =======================

  // ===================== SPLIT status-object : START =====================
  const Status = {
    el: null,
    timer: null,
    SAVED_DELAY: STATUS.savedDelay,
    SPINNER_MS: STATUS.spinnerVisibleMs,

    // ===================== SPLIT lifecycle-init : START =====================
    init() {
      this.el = document.getElementById("statusIcon");
      if (!this.el) return;
      this.setIdle();
    },
    // ===================== SPLIT lifecycle-init : END =======================

    // ===================== SPLIT state-idle : START =====================
    // Stato di riposo: cerchio base tenue, nessun spinner
    setIdle() {
      if (!this.el) return;
      this.el.classList.remove("status-saving", "status-ok");
      this.el.classList.add("status-idle");
    },
    // ===================== SPLIT state-idle : END =======================

    // ===================== SPLIT state-saving : START =====================
    // Stato "salvataggio in corso": spinner attivo
    setSaving() {
      if (!this.el) return;
      this.el.classList.remove("status-idle", "status-ok");
      this.el.classList.add("status-saving");

      if (this.timer) {
        clearTimeout(this.timer);
        this.timer = null;
      }
    },
    // ===================== SPLIT state-saving : END =======================

    // ===================== SPLIT state-ok : START =====================
    // Stato "salvato": cerchio pieno più acceso per un breve periodo
    setOk() {
      if (!this.el) return;
      this.el.classList.remove("status-idle", "status-saving");
      this.el.classList.add("status-ok");

      if (this.timer) {
        clearTimeout(this.timer);
      }

      this.timer = setTimeout(() => {
        this.setIdle();
      }, this.SAVED_DELAY);
    },
    // ===================== SPLIT state-ok : END =======================

    // ===================== SPLIT public-api : START =====================
    // API pubblica:
    // chiamata dagli altri moduli dopo un salvataggio completato
    // (es. tema, turni, toggle futuri)
    markSaved() {
      this.setSaving();

      setTimeout(() => {
        this.setOk();
      }, this.SPINNER_MS);
    }
    // ===================== SPLIT public-api : END =======================
  };
  // ===================== SPLIT status-object : END =======================

  // ===================== SPLIT global-export : START =====================
  window.Status = Status;
  // ===================== SPLIT global-export : END =======================

})();
