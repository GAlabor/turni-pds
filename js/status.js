// ============================
// Icona stato / salvataggio
// Usa l’elemento #statusIcon con classi:
// - status-idle
// - status-saving
// - status-ok
// I CSS gestiscono cerchi / omino / animazione
// ============================

(function () {
  if (!window.AppConfig) {
    throw new Error("CONFIG.MISSING: AppConfig non disponibile (status.js)");
  }

  const { STATUS } = window.AppConfig;

  const Status = {
    el: null,
    timer: null,
    SAVED_DELAY: STATUS.savedDelay,
    SPINNER_MS: STATUS.spinnerVisibleMs,

    init() {
      this.el = document.getElementById("statusIcon");
      if (!this.el) return;
      this.setIdle();
    },

    // Stato di riposo: cerchio base tenue, nessun spinner
    setIdle() {
      if (!this.el) return;
      this.el.classList.remove("status-saving", "status-ok");
      this.el.classList.add("status-idle");
    },

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

    // API pubblica:
    // chiamata dagli altri moduli dopo un salvataggio completato
    // (es. tema, turni, toggle futuri)
    markSaved() {
      this.setSaving();

      setTimeout(() => {
        this.setOk();
      }, this.SPINNER_MS);
    }
  };

  window.Status = Status;
})();
