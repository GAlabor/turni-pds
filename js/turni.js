// ============================
// Pannello Turni
// ============================

(function () {
  function initTurniPanel() {
    const panel = document.querySelector(".settings-panel.settings-turni");
    const TURNI_KEY = "turnipds-turni";
    if (!panel) return;

    // Toggle "Visualizza turnazione su calendario"
    const toggle = panel.querySelector("[data-turni-visual-toggle]");
    if (toggle) {
      toggle.addEventListener("click", () => {
        const isOn = !toggle.classList.contains("is-on");
        toggle.classList.toggle("is-on", isOn);
        toggle.setAttribute("aria-pressed", isOn ? "true" : "false");
        // Per ora UI-only, nessun salvataggio/logica
      });
    }

    // Riga "Aggiungi turno" → apre/chiude il form
    const openBtn = panel.querySelector("[data-turni-open]");
    const form = panel.querySelector("[data-turni-form]");

    if (openBtn && form) {
      openBtn.addEventListener("click", () => {
        const isHidden = form.hasAttribute("hidden");

        if (isHidden) {
          form.removeAttribute("hidden");
          openBtn.setAttribute("aria-expanded", "true");
        } else {
          form.setAttribute("hidden", "");
          openBtn.setAttribute("aria-expanded", "false");
        }
      });
    }

    // Colore: sync preview con input color
    const colorInput = panel.querySelector("[data-turni-color]");
    const colorPreview = panel.querySelector("[data-turni-color-preview]");
    if (colorInput && colorPreview) {
      const applyColor = () => {
        colorPreview.style.backgroundColor = colorInput.value || "#0a84ff";
      };
      applyColor();
      colorInput.addEventListener("input", applyColor);
      colorInput.addEventListener("change", applyColor);
    }

    const colorTrigger = panel.querySelector("[data-turni-color-trigger]");
    if (colorTrigger && colorInput) {
      colorTrigger.addEventListener("click", () => {
        colorInput.click();
      });
    }

    // ----------------------------
    // Gestione lista turni + salvataggio
    // ----------------------------

    const listEl = panel.querySelector("[data-turni-list]");
    const submitBtn = panel.querySelector("[data-turni-submit]");

    const inputNome   = panel.querySelector("#turnoNome");
    const inputSigla  = panel.querySelector("#turnoSigla");
    const inputInizio = panel.querySelector("#turnoOraInizio");
    const inputFine   = panel.querySelector("#turnoOraFine");

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
        // Stato salvataggio
        if (window.Status && typeof Status.setSaving === "function") {
          Status.setSaving();
          setTimeout(() => {
            if (window.Status && typeof Status.setOk === "function") {
              Status.setOk();
            }
          }, 400);
        }
      } catch (e) {
        console.warn("Salvataggio turni fallito:", e);
      }
    }

    function renderTurni(turni) {
      if (!listEl) return;
      listEl.innerHTML = "";
      if (!turni.length) return;

      turni.forEach(t => {
        const row = document.createElement("div");
        row.className = "turno-item";

        const nameEl = document.createElement("span");
        nameEl.className = "turno-name";
        nameEl.textContent = t.nome || "";

        const siglaEl = document.createElement("span");
        siglaEl.className = "turno-sigla";
        siglaEl.textContent = t.sigla || "";

        const orarioEl = document.createElement("span");
        orarioEl.className = "turno-orario";
        if (t.inizio && t.fine) {
          orarioEl.textContent = `${t.inizio} - ${t.fine}`;
        }

        row.appendChild(nameEl);
        row.appendChild(siglaEl);
        row.appendChild(orarioEl);
        listEl.appendChild(row);
      });
    }

    // Render iniziale da localStorage
    const turniIniziali = loadTurni();
    renderTurni(turniIniziali);

    // Click sul bottone "Aggiungi" dentro il form
    if (submitBtn && inputNome && inputSigla && inputInizio && inputFine && colorInput) {
      submitBtn.addEventListener("click", () => {
        const nome   = inputNome.value.trim();
        const sigla  = inputSigla.value.trim();
        const inizio = inputInizio.value;
        const fine   = inputFine.value;
        const colore = colorInput.value || "#0a84ff";

        // Niente UX complicata: se manca qualcosa, non salviamo
        if (!nome || !sigla || !inizio || !fine) {
          return;
        }

        const turni = loadTurni();
        turni.push({ nome, sigla, inizio, fine, colore });
        saveTurni(turni);
        renderTurni(turni);

        // reset campi base
        inputNome.value   = "";
        inputSigla.value  = "";
        inputInizio.value = "";
        inputFine.value   = "";
        // Il colore resta quello scelto
      });
    }
  }

  window.Turni = {
    init: initTurniPanel
  };
})();
