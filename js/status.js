// ============================
// Icona stato / salvataggio
// ============================

(function () {
  const Status = {
    el: null,
    timer: null,

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
      }, 1500);
    }
  };

  window.Status = Status;
})();
