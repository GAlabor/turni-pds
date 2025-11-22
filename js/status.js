// ============================
// Icona stato / salvataggio
// ============================

(function () {
  const Status = {
    el: null,
    timer: null,
    SAVED_DELAY: 1200, // durata animazione OK prima di tornare idle

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

      if (this.timer) clearTimeout(this.timer);

      this.timer = setTimeout(() => {
        this.setIdle();
      }, this.SAVED_DELAY);
    },

    // ----------------------------
    // Nuova API pubblica
    // ----------------------------
    markSaved() {
      this.setSaving();
      setTimeout(() => {
        this.setOk();
      }, 800); // piccola pausa per vedere l’anello girare
    }
  };

  window.Status = Status;
})();
