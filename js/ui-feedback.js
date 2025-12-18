// ============================
// ui-feedback.js
// Helper UI condiviso: errori temporizzati (show/hide)
// ============================

(function () {

  // ===================== SPLIT helper-create-temp-error : START =====================
  function createTempError(el, ms) {
    const duration = Number(ms) > 0 ? Number(ms) : 2000;
    let t = null;

    function clear() {
      if (!el) return;
      if (t) {
        clearTimeout(t);
        t = null;
      }
      el.hidden = true;
    }

    function show() {
      if (!el) return;
      clear();
      el.hidden = false;
      t = setTimeout(() => {
        el.hidden = true;
        t = null;
      }, duration);
    }

    return { show, clear };
  }
  // ===================== SPLIT helper-create-temp-error : END =======================


  // ===================== SPLIT export-global : START =====================
  window.UIFeedback = { createTempError };
  // ===================== SPLIT export-global : END =======================

})();
