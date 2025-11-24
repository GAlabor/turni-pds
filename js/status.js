// status.js

// ============================
// Icona stato / salvataggio
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

    setIdle() {
      if (!this.el) return;
      this.el.classList.remove("status-saving", "status-ok");
      this.el.classList.add("status-idle");
    },

    setSaving() {
      if (!this.el) return;
      this.el.classList.remove("status-idle", "status-ok");
      this.el.classList.add("status-saving");

      if (this.timer) {
        clearTimeout(this.timer);
        this.timer = null;
      }
    },

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

    // API pubblica
    markSaved() {
      this.setSaving();
      setTimeout(() => {
        this.setOk();
      }, this.SPINNER_MS);
    }
  };

  window.Status = Status;
})();
