// ============================
// turni-render.js
// Render lista turni + font sigla
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
