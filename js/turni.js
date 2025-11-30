// ============================
// turni.js
// Pannello Turni (Impostazioni → Turni)
// Gestisce:
// - storage turni (localStorage)
// - render lista turni salvati
// - form "Aggiungi turno"
// - toggle "visualizza turnazione" (solo storage, non agganciato alla UI)
// ============================

(function () {
  if (!window.AppConfig) {
    throw new Error("CONFIG.MISSING: AppConfig non disponibile (turni.js)");
  }

  const { STORAGE_KEYS } = window.AppConfig;
  const TURNI_KEY     = STORAGE_KEYS.turni;          // chiave storage turni personalizzati
  const TURNI_VIS_KEY = STORAGE_KEYS.turniVisualizza; // chiave storage toggle visualizzazione turnazione

  // ============================
  // Storage: turni personalizzati
  // ============================

  // Legge l'array dei turni da localStorage
  function loadTurni() {
    try {
      const raw = localStorage.getItem(TURNI_KEY);   // stringa JSON salvata
      if (!raw) return [];                           // nessun dato → array vuoto

      const parsed = JSON.parse(raw);                // tenta il parse
      return Array.isArray(parsed) ? parsed : [];    // garantisce sempre array
    } catch {
      return [];                                     // in caso di errore → array vuoto
    }
  }

  // Salva l'array dei turni in localStorage
  function saveTurni(turni) {
    try {
      localStorage.setItem(TURNI_KEY, JSON.stringify(turni)); // serializza array turni

      // Notifica salvataggio all'icona stato (se presente)
      if (window.Status && typeof Status.markSaved === "function") {
        Status.markSaved();
      }
    } catch (e) {
      console.warn("Salvataggio turni fallito:", e); // log soft, l'app continua a funzionare
    }
  }

  // ============================
  // Storage: toggle visualizzazione turnazione
  // (solo storage; non ancora collegato al calendario nella UI attuale)
  // ============================

  // Legge il valore del toggle "visualizza turnazione"
  function loadVisualToggle() {
    try {
      const raw = localStorage.getItem(TURNI_VIS_KEY); // stringa "true" / "false"
      if (raw === "true") return true;
      if (raw === "false") return false;
      return false;                                    // default: spento
    } catch {
      return false;                                    // se qualcosa va storto → spento
    }
  }

  // Salva il valore del toggle "visualizza turnazione"
  function saveVisualToggle(isOn) {
    try {
      localStorage.setItem(TURNI_VIS_KEY, isOn ? "true" : "false"); // salva "true"/"false"

      // Notifica salvataggio
      if (window.Status && typeof Status.markSaved === "function") {
        Status.markSaved();
      }
    } catch (e) {
      console.warn("Salvataggio toggle turnazione fallito:", e);
    }
  }

  // ============================
  // Render lista turni (pannello Impostazioni → Turni)
  // ============================

  // Disegna la lista dei turni salvati nella card Turni
  function renderTurni(listEl, turni, emptyHintEl, editBtn) {
    if (!listEl) return;              // se manca il contenitore lista, esci

    listEl.innerHTML = "";            // pulisce la lista corrente

    // Nessun turno salvato
    if (!Array.isArray(turni) || !turni.length) {
      if (emptyHintEl) {
        emptyHintEl.hidden = false;   // mostra hint "Nessun turno salvato"
      }
      if (editBtn) {
        editBtn.disabled = true;      // disabilita "Modifica"
      }
      return;
    }

    // Ci sono turni salvati
    if (emptyHintEl) {
      emptyHintEl.hidden = true;      // nasconde l'hint
    }
    if (editBtn) {
      editBtn.disabled = false;       // abilita "Modifica" (funzione futura)
    }

    // Render riga per riga
    turni.forEach(t => {
      const row = document.createElement("div");   // wrapper riga singolo turno
      row.className = "turno-item";

      // [SIGLA] → pill quadrata, testo con colore scelto
      const siglaPill = document.createElement("span");
      siglaPill.className = "turno-sigla-pill";

      const siglaEl = document.createElement("span");
      siglaEl.className = "turno-sigla";
      siglaEl.textContent = t.sigla || "";         // sigla (es. M, N, R)
      if (t.colore) {
        siglaEl.style.color = t.colore;            // colore sigla, se definito
      }

      siglaPill.appendChild(siglaEl);

      // Nome turno (testo principale)
      const nameEl = document.createElement("span");
      nameEl.className = "turno-name";
      nameEl.textContent = t.nome || "";           // es. "Mattino"

      // Orario turno (a destra)
      const orarioEl = document.createElement("span");
      orarioEl.className = "turno-orario";
      if (t.inizio && t.fine) {
        orarioEl.textContent = `${t.inizio} - ${t.fine}`; // es. "06:00 - 14:00"
      }

      // Monta la riga
      row.appendChild(siglaPill);
      row.appendChild(nameEl);
      row.appendChild(orarioEl);

      // Aggiunge la riga alla lista
      listEl.appendChild(row);
    });
  }

  // ============================
  // Util: parsing / validazione orario
  // Accetta 00:00 .. 23:59 e 24:00
  // ============================

  // Controlla se una stringa è un orario valido nel formato HH:MM
  function isValidTime(str) {
    if (typeof str !== "string") return false;

    const s = str.trim();                   // rimuove spazi
    const m = /^(\d{1,2}):(\d{2})$/.exec(s); // match "H:MM" o "HH:MM"
    if (!m) return false;

    const h   = parseInt(m[1], 10);        // ore
    const min = parseInt(m[2], 10);        // minuti

    if (Number.isNaN(h) || Number.isNaN(min)) return false;
    if (min < 0 || min > 59) return false;
    if (h < 0 || h > 24) return false;
    if (h === 24 && min !== 0) return false; // consente solo 24:00

    return true;
  }

  // ============================
  // Init pannello UI Turni
  // (lista + pannello "Aggiungi turno")
  // ============================

  function initTurniPanel() {
    const settingsView = document.querySelector(".view-settings"); // vista Impostazioni
    if (!settingsView) return;

    // Pannello principale turni (lista)
    const panelTurni = settingsView.querySelector('.settings-panel.settings-turni[data-settings-id="turni"]');
    // Pannello "Aggiungi turno"
    const panelAdd   = settingsView.querySelector('.settings-panel.settings-turni-add[data-settings-id="turni-add"]');

    if (!panelTurni || !panelAdd) return;  // se manca uno dei pannelli, esci

    // --- elementi pannello lista ---
    const listEl     = panelTurni.querySelector("[data-turni-list]");        // contenitore lista turni
    const emptyHint  = panelTurni.querySelector("[data-turni-empty-hint]");  // hint "Nessun turno salvato"
    const btnAdd     = panelTurni.querySelector("[data-turni-add]");         // pulsante "+" per aggiungere
    const btnEdit    = panelTurni.querySelector("[data-turni-edit]");        // pulsante "Modifica" (futuro)

    // --- elementi pannello "Aggiungi turno" ---
    const formEl       = panelAdd.querySelector("[data-turni-add-form]");          // contenitore form
    const inputNome    = panelAdd.querySelector("#addTurnoNome");                  // campo Turno (nome)
    const inputSigla   = panelAdd.querySelector("#addTurnoSigla");                 // campo Sigla
    const inputInizio  = panelAdd.querySelector("#addTurnoOraInizio");             // campo Ora inizio
    const inputFine    = panelAdd.querySelector("#addTurnoOraFine");               // campo Ora fine
    const colorInput   = panelAdd.querySelector("[data-turni-color]");             // input type="color" nascosto
    const colorPreview = panelAdd.querySelector("[data-turni-color-preview]");     // pallino colore visivo
    const colorTrigger = panelAdd.querySelector("[data-turni-color-trigger]");     // bottone/pallino cliccabile
    const colorWrapper = panelAdd.querySelector(".turni-color-wrapper");           // wrapper pallino + (futura) preview
    const saveBtn      = panelAdd.querySelector("[data-turni-save]");              // bottone "Salva"
    const errorEl      = panelAdd.querySelector("[data-turni-error]");             // testo errore "Compila tutti i campi"

    // Se manca qualcosa di essenziale nel form, non inizializzare
    if (
      !listEl || !btnAdd || !formEl ||
      !inputNome || !inputSigla || !inputInizio || !inputFine ||
      !colorInput || !colorPreview || !colorTrigger ||
      !saveBtn || !errorEl
    ) {
      return;
    }

    // ============================
    // Render iniziale turni dalla storage
    // ============================

    const turniIniziali = loadTurni();                    // legge turni da localStorage
    renderTurni(listEl, turniIniziali, emptyHint, btnEdit); // popola la lista nella card Turni

    // ============================
    // Gestione colore sigla (pallino + input color)
    // ============================

    // Applica il colore selezionato al pallino di preview
    function applyColorPreview() {
      const v = colorInput.value || "#0a84ff";            // colore attuale o default
      colorPreview.style.backgroundColor = v;             // aggiorna sfondo pallino
      // in futuro qui potrai aggiornare anche la cella preview sigla [M]
    }

    // Prova ad aprire il color picker in modo compatibile desktop/mobile
    function openColorPicker() {
      if (!colorInput) return;

      try {
        // API moderna: apre il picker in modo esplicito, dove supportato
        if (typeof colorInput.showPicker === "function") {
          colorInput.showPicker();
        } else {
          // fallback classico: click programmatico sull'input colore
          colorInput.click();
        }
      } catch (e) {
        // se showPicker() fallisce per policy del browser, ripiega sul click
        try {
          colorInput.click();
        } catch {
          // se anche questo viene bloccato, non facciamo altro
        }
      }
    }

    // Colore iniziale pallino
    applyColorPreview();

    // Cambiando il valore dell'input colore (da picker) aggiorna il pallino
    colorInput.addEventListener("input", applyColorPreview);
    colorInput.addEventListener("change", applyColorPreview);

    // Click diretto sul pallino: apre il color picker
    colorTrigger.addEventListener("click", (ev) => {
      ev.preventDefault();          // evita focus strano sul bottone
      openColorPicker();            // prova ad aprire il picker
    });

    // Click in qualunque punto del wrapper colore: apre il picker (hitbox ampia)
    if (colorWrapper) {
      colorWrapper.addEventListener("click", (ev) => {
        // se il target è già l'input colore, lascia lavorare il browser
        if (ev.target === colorInput) return;
        ev.preventDefault();
        openColorPicker();
      });
    }

    // ============================
    // Gestione errori form "Aggiungi turno"
    // ============================

    let errorTimer = null;          // timer per nascondere il messaggio errore

    // Nasconde l'errore e pulisce lo stato dei campi
    function clearError() {
      if (errorTimer) {
        clearTimeout(errorTimer);
        errorTimer = null;
      }

      errorEl.hidden = true;        // nasconde il testo errore

      // rimuove stato errore dai campi coinvolti
      [inputNome, inputSigla, inputInizio, inputFine].forEach(inp => {
        inp.classList.remove("is-invalid");
      });
    }

    // Mostra l'errore per un breve periodo, poi lo nasconde
    function showError() {
      clearError();                 // resetta eventuali timer precedenti
      errorEl.hidden = false;       // mostra il messaggio errore

      // dopo 2s nasconde il messaggio e resetta i bordi rossi
      errorTimer = setTimeout(() => {
        errorEl.hidden = true;
        [inputNome, inputSigla, inputInizio, inputFine].forEach(inp => {
          inp.classList.remove("is-invalid");
        });
      }, 2000);
    }

    // Appena l'utente digita in uno dei campi, togliamo il bordo rosso
    [inputNome, inputSigla, inputInizio, inputFine].forEach(inp => {
      inp.addEventListener("input", () => {
        inp.classList.remove("is-invalid");
      });
    });

    // ============================
    // Reset form "Aggiungi turno"
    // ============================

    // Ripristina il form allo stato iniziale (per nuovo inserimento)
    function resetAddForm() {
      clearError();                    // cancella eventuale errore esistente

      inputNome.value   = "";          // pulisce campo nome turno
      inputSigla.value  = "";          // pulisce campo sigla
      inputInizio.value = "";          // pulisce ora inizio
      inputFine.value   = "";          // pulisce ora fine

      colorInput.value  = "#0a84ff";   // ripristina colore di default
      applyColorPreview();             // aggiorna pallino colore
    }

    // ============================
    // Apertura pannello "Aggiungi turno"
    // ============================

    // Click su "+" nel pannello Turni → apre il pannello "Aggiungi turno"
    btnAdd.addEventListener("click", () => {
      resetAddForm();                                          // azzera il form

      if (window.SettingsUI && typeof SettingsUI.openPanel === "function") {
        SettingsUI.openPanel("turni-add");                     // apre il pannello aggiunta in Impostazioni
      }
    });

    // ============================
    // Salvataggio nuovo turno
    // ============================

    // Click su "Salva" nel pannello "Aggiungi turno"
    saveBtn.addEventListener("click", () => {
      clearError();                                            // resetta eventuale stato errore

      const nome   = (inputNome.value || "").trim();           // testo turno
      const sigla  = (inputSigla.value || "").trim();          // testo sigla
      const inizio = (inputInizio.value || "").trim();         // orario inizio
      const fine   = (inputFine.value || "").trim();           // orario fine
      const colore = colorInput.value || "#0a84ff";            // colore sigla

      let hasError = false;                                    // flag errori validazione

      // Validazione campi: nome obbligatorio
      if (!nome) {
        inputNome.classList.add("is-invalid");
        hasError = true;
      }

      // Validazione campi: sigla obbligatoria
      if (!sigla) {
        inputSigla.classList.add("is-invalid");
        hasError = true;
      }

      // Validazione campi: ora inizio obbligatoria e valida
      if (!inizio || !isValidTime(inizio)) {
        inputInizio.classList.add("is-invalid");
        hasError = true;
      }

      // Validazione campi: ora fine obbligatoria e valida
      if (!fine || !isValidTime(fine)) {
        inputFine.classList.add("is-invalid");
        hasError = true;
      }

      // Se ci sono errori mostra il messaggio e non salva
      if (hasError) {
        showError();
        return;
      }

      // Nessun errore → aggiunge il nuovo turno alla lista
      const turni = loadTurni();                               // rilegge lista da storage
      turni.push({ nome, sigla, inizio, fine, colore });       // aggiunge il nuovo turno
      saveTurni(turni);                                       // salva in localStorage
      renderTurni(listEl, turni, emptyHint, btnEdit);         // aggiorna la lista in UI

      // Pulisce il form per il prossimo inserimento
      resetAddForm();

      // Torna alla schermata Turni (lista)
      if (window.SettingsUI && typeof SettingsUI.openPanel === "function") {
        SettingsUI.openPanel("turni");                         // torna alla card Turni
      }
    });

    // (toggle visualizza turnazione potrà usare loadVisualToggle/saveVisualToggle in futuro)
  }

  // ============================
  // API pubblica Turni
  // ============================

  window.Turni = {
    init: initTurniPanel,                   // inizializza pannello Turni in Impostazioni
    getTurni: loadTurni,                    // espone lista turni salvati
    getVisualizzaTurnazione: loadVisualToggle // espone valore toggle visualizza turnazione
    // saveVisualToggle resta interno per ora, ma è pronto se ti serve in futuro
  };
})();
