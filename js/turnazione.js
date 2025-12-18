// ============================
// turnazione.js
// Wrapper di compatibilità: delega al nuovo modulo Turnazioni
// (così non devi cambiare subito i tuoi <script> se non vuoi)
// ============================

(function () {
  if (window.Turnazioni && typeof Turnazioni.init === "function") {
    // Turni.js chiama già Turnazioni.init con un ctx migliore.
    // Qui non facciamo nulla per non doppiare init.
    return;
  }
})();
