
// ============================
// Config globale app Turni PdS
// ============================

// ===================== SPLIT iife-wrapper : START =====================
(function () {

  // ===================== SPLIT guard-duplicated-load : START =====================
  // Evita di sovrascrivere se per qualche motivo venisse richiamato due volte
  if (window.AppConfig) {
    return;
  }
  // ===================== SPLIT guard-duplicated-load : END =====================


  // ===================== SPLIT base-path : START =====================
  // ============================
  // PATH / BASE URL
  // ============================
  // In locale: base vuota
  // In produzione: /turni-pds
  const BASE = (location.hostname === "localhost") ? "" : "/turni-pds";
  // ===================== SPLIT base-path : END =====================


  // ===================== SPLIT app-config-root : START =====================
  window.AppConfig = {

    // Debug (true su localhost)
    DEBUG: (location.hostname === "localhost"),

    // ===================== SPLIT paths-pwa : START =====================
    // ============================
    // PERCORSI / PWA
    // ============================
    PATHS: {
      base: BASE,
      svgBase: `${BASE}/svg`,
      swScope: `${BASE}/`,
      swFile: `${BASE}/service-worker.js`
    },
    // ===================== SPLIT paths-pwa : END =====================


    // ===================== SPLIT storage-keys : START =====================
    // ============================
    // STORAGE KEYS (localStorage)
    // ============================
    STORAGE_KEYS: {
      theme: "turnipds-theme",

      // Turni personalizzati
      turni: "turnipds-turni",

      // Toggle "visualizza turnazione su calendario"
      turniVisualizza: "turnipds-turni-visualizza",

      // ✅ Turnazioni
      turnazioni: "turnipds-turnazioni",
      turnazioniPreferred: "turnipds-turnazioni-preferred",

      // ✅ Inizio Turnazione (data + indice turno rotazione)
      turniStart: "turnipds-turni-start",

      // Chiavi future (NON usate al momento)
      indennita: "turnipds-indennita",
      festivita: "turnipds-festivita",
      inspag: "turnipds-inspag",
      preferenze: "turnipds-preferenze"
    },
    // ===================== SPLIT storage-keys : END =====================


    // ===================== SPLIT ui-texts : START =====================
    // ============================
    // TESTI UI GLOBALI (usati dai JS)
    // ============================
    UI: {
      themeLabels: {
        system: "Sistema",
        light: "Chiaro",
        dark: "Scuro"
      }
    },
    // ===================== SPLIT ui-texts : END =====================


    // ===================== SPLIT status-config : START =====================
    // ============================
    // STATO / ANIMAZIONI (Status.js)
    // ============================
    STATUS: {
      savedDelay: 1200,
      spinnerVisibleMs: 800
    },
    // ===================== SPLIT status-config : END =====================

// ===================== SPLIT calendar-config : START =====================
// ============================
// CALENDARIO (solo logica, non UI)
// ============================
CALENDAR: {
  // riferimento visivo ideale (1–2 char)
  turnoSiglaFontPx: 23,

  // compat: se fontPx è null, usa scale (qui resta 1)
  turnoSiglaScale: 1,
  turnoSiglaFontWeight: 350,
  turnoSiglaLetterSpacing: "0.02em"
},

// ===================== SPLIT calendar-config : END =======================


    // ===================== SPLIT version-label : START =====================
    // ============================
    // VERSIONE / LABEL
    // ============================
    VERSION: {
      labelElementId: "versionLabel"
    }
    // ===================== SPLIT version-label : END =====================

  };
  // ===================== SPLIT app-config-root : END =====================

})();
// ===================== SPLIT iife-wrapper : END =====================
// 
// ============================
// Calendario con viste:
// giorni / mesi / anni
// calendar.js v 1.0
// ============================

(function () {

// ===================== SPLIT costanti-e-stato : START =====================

  const monthNames = [
    "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
    "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
  ];

  const monthShort = [
    "Gen", "Feb", "Mar", "Apr", "Mag", "Giu",
    "Lug", "Ago", "Set", "Ott", "Nov", "Dic"
  ];

  const MODES = {
    DAYS: "days",
    MONTHS: "months",
    YEARS: "years"
  };

  // 12 anni per pagina, centrati: 5 prima, 6 dopo
  const YEARS_PAGE_SIZE = 12;

  let today = new Date();
  let currentYear = today.getFullYear();
  let currentMonth = today.getMonth(); // 0–11
  let currentMode = MODES.DAYS;

  // range anni visibile in modalità anni: Y-5 ... Y+6
  let yearRangeStart = currentYear - 5;

  // Riferimenti DOM
  let gridDays = null;
  let gridMonths = null;
  let gridYears = null;
  let monthLabel = null;
  let prevBtn = null;
  let nextBtn = null;
  let calendarContainer = null;

// ===================== SPLIT costanti-e-stato : END =====================


// ===================== SPLIT util-day-cell-size : START =====================

  // ============================
  // Util: misura larghezza cella giorno → variabile CSS
  // ============================

  // cache locale: aggiorno la CSS var solo se la larghezza cambia davvero
  let _lastCalDaySize = null;

  function updateDayCellSize() {
    if (!gridDays || !calendarContainer) return false;
    if (currentMode !== MODES.DAYS) return false;

    const dayEl = gridDays.querySelector(".day:not(.empty)");
    if (!dayEl) return false;

    const rect = dayEl.getBoundingClientRect();
    if (!rect.width) return false;

    // stabilizzo a mezzo pixel per evitare invalidazioni inutili
    const w = Math.round(rect.width * 2) / 2;

    if (_lastCalDaySize != null && Math.abs(w - _lastCalDaySize) < 0.25) {
      return false;
    }

    _lastCalDaySize = w;
    document.documentElement.style.setProperty("--cal-day-size", w + "px");
    return true;
  }

// ===================== SPLIT util-day-cell-size : END =====================



// ===================== SPLIT turnazione-overlay : START =====================
// =========================================================
// Turnazione → sigla in cella calendario (solo vista giorni)
// =========================================================

function getPreferredTurnazioneForCalendar() {
  if (!window.TurniStorage) return null;

  const turnazioni = TurniStorage.loadTurnazioni();
  if (!Array.isArray(turnazioni) || !turnazioni.length) return null;

  const preferredId = TurniStorage.loadPreferredTurnazioneId();
  if (preferredId) {
    const pick = turnazioni.find(t => String(t.id) === String(preferredId));
    if (pick) return pick;
  }
  return turnazioni[turnazioni.length - 1] || null;
}

function toLocalMidnight(dateObj) {
  if (!(dateObj instanceof Date)) return null;
  return new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
}

function parseISODateToLocalMidnight(iso) {
  if (!iso || typeof iso !== "string") return null;

  const parts = iso.split("-");
  if (parts.length < 3) return null;

  const y = Number(parts[0]);
  const mo = Number(parts[1]) - 1;
  const d = Number(parts[2]);

  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;

  return new Date(y, mo, d);
}

// ✅ DST-safe: numero di giorni assoluti (UTC) indipendente da mezzanotte locale / 23h/25h
function toUTCDayNumber(dateObj) {
  if (!(dateObj instanceof Date)) return null;
  const y = dateObj.getFullYear();
  const m = dateObj.getMonth();
  const d = dateObj.getDate();
  const t = Date.UTC(y, m, d);
  if (!Number.isFinite(t)) return null;
  return Math.trunc(t / 86400000);
}

function safeMod(n, m) {
  if (!m) return 0;
  return ((n % m) + m) % m;
}



function getCalendarSiglaSizingConfig(siglaText) {
  const cal =
    window.AppConfig &&
    window.AppConfig.CALENDAR
      ? window.AppConfig.CALENDAR
      : null;

  const len = (siglaText || "").length;

  // -----------------------------
  // FONT SIZE (base, deterministico)
  // -----------------------------
  let fontPx = null;

  // 1–2 caratteri → sempre 23px (zero calcoli, indipendente da config)
  if (len > 0 && len <= 2) {
    fontPx = 23;
  }

  if (fontPx === null && cal && cal.turnoSiglaFontPx != null) {
    const fCfg = cal.turnoSiglaFontPx;

    if (typeof fCfg === "object") {
      // compat vecchia config (short/medium/long)
      if (len <= 2) fontPx = fCfg.short;
      else if (len === 3) fontPx = fCfg.medium;
      else fontPx = fCfg.long;
    } else if (Number.isFinite(Number(fCfg))) {
      // nuova config: valore unico (base)
      fontPx = Number(fCfg);
    }
  }

  // fallback sensato se non c'è config
  if (fontPx === null) {
    fontPx = 23;
  }

  // -----------------------------
  // SCALE
  // -----------------------------
  const scale =
    cal && Number.isFinite(Number(cal.turnoSiglaScale))
      ? Number(cal.turnoSiglaScale)
      : 1.0;

  // -----------------------------
  // FONT WEIGHT
  // -----------------------------
  const fontWeight =
    cal &&
    (Number.isFinite(Number(cal.turnoSiglaFontWeight)) ||
      typeof cal.turnoSiglaFontWeight === "string")
      ? cal.turnoSiglaFontWeight
      : null;

  // -----------------------------
  // LETTER SPACING
  // -----------------------------
  const letterSpacing =
    cal && typeof cal.turnoSiglaLetterSpacing === "string"
      ? cal.turnoSiglaLetterSpacing
      : null;

  return {
    fontPx: Number.isFinite(fontPx) && fontPx > 0 ? fontPx : null,
    scale: Number.isFinite(scale) && scale > 0 ? scale : 1.0,
    fontWeight,
    letterSpacing
  };
}

// Colore turno: fonte primaria = lista Turni (Impostazioni Turni)
// Fallback = colore salvato nella turnazione (per compat / seed iniziale)
function getTurniColorForSigla(sigla) {
  if (!window.TurniStorage) return "";

  const s = (sigla != null) ? String(sigla).trim().toUpperCase() : "";
  if (!s) return "";

  const list = (typeof TurniStorage.loadTurni === "function") ? TurniStorage.loadTurni() : [];
  if (!Array.isArray(list) || !list.length) return "";

  const hit = list.find(t => {
    const ts = (t && t.sigla != null) ? String(t.sigla).trim().toUpperCase() : "";
    return ts === s;
  }) || null;

  const col = hit && hit.colore != null ? String(hit.colore).trim() : "";
  return col || "";
}




// Ritorna { sigla, colore } oppure null
function getCalendarSiglaForDate(dateObj) {
  if (!window.TurniStorage) return null;

  // toggle visualizzazione
  const show = TurniStorage.loadVisualToggle();
  if (!show) return null;

  const t = getPreferredTurnazioneForCalendar();
  if (!t) return null;

  const days = Number(t.days) || 0;
  const slots = Array.isArray(t.slots) ? t.slots : [];
  const restIdx = Array.isArray(t.restIndices) ? t.restIndices : [];

  if (!days || slots.length < days) return null;

  const cfg = TurniStorage.loadTurnoIniziale();
  if (!cfg || !cfg.date || !Number.isInteger(cfg.slotIndex)) return null;

  const startDate = parseISODateToLocalMidnight(cfg.date);
  const target = toLocalMidnight(dateObj);
  if (!startDate || !target) return null;

  // ✅ DST-safe diff: confronto su "day number" UTC, non su millisecondi/24h
  const startDayNum = toUTCDayNumber(startDate);
  const targetDayNum = toUTCDayNumber(target);
  if (startDayNum === null || targetDayNum === null) return null;

  const diffDays = targetDayNum - startDayNum;

  const idx = safeMod((cfg.slotIndex || 0) + diffDays, days);
  const slot = slots[idx] || null;

  const baseSigla = slot && slot.sigla ? String(slot.sigla).trim() : "";
  const baseColore = slot && slot.colore ? String(slot.colore).trim() : "";

  const isRest = restIdx.includes(idx);

  // Riposi fissi: solo quando il giorno calcolato è un riposo.
  if (isRest && t.riposiFissi && typeof t.riposiFissi === "object") {
    const dow = dateObj.getDay(); // 0 Dom ... 6 Sab
    // Lun=1, Mar=2
    if (dow === 1 && t.riposiFissi.lunedi) {
      const rf = t.riposiFissi.lunedi;
      const sig = rf.sigla ? String(rf.sigla).trim() : "";
      const col = rf.colore ? String(rf.colore).trim() : "";
      if (sig) return { sigla: sig, colore: col };
    }
    if (dow === 2 && t.riposiFissi.martedi) {
      const rf = t.riposiFissi.martedi;
      const sig = rf.sigla ? String(rf.sigla).trim() : "";
      const col = rf.colore ? String(rf.colore).trim() : "";
      if (sig) return { sigla: sig, colore: col };
    }
  }

  if (!baseSigla) return null;

// Se esiste un colore aggiornato in Impostazioni Turni per la stessa sigla,
// usiamo quello.
const fromTurni = getTurniColorForSigla(baseSigla);
const finalColore = fromTurni || baseColore;
return { sigla: baseSigla, colore: finalColore };

}

// =====================================================
// Sigle calendario: batch + cache fitting (A + C)
// - A: le sigle restano invisibili finché fit+centraggio non è completato,
//      poi diventano visibili tutte insieme.
// - C: caching del font-size finale per evitare ricalcoli e "flash".
// =====================================================

const _siglaFitCache = new Map();
let _siglaBatchPending = [];
let _siglaBatchScheduled = false;

function _siglaCacheKey(el, siglaText, baseFs) {
  if (!el) return null;

  const rectW = el.clientWidth || Math.round(el.getBoundingClientRect().width);
  if (!rectW) return null;

  const css = getComputedStyle(el);
  const fam = css.fontFamily || "";
  const wgt = css.fontWeight || "";
  const ls  = css.letterSpacing || "";

  const w = Math.round(rectW * 2) / 2;
  const b = Number.isFinite(Number(baseFs)) ? (Math.round(Number(baseFs) * 2) / 2) : "";

  // Chiave: testo + larghezza disponibile + contesto tipografico rilevante
  return `${String(siglaText || "")}::w${w}::b${b}::${fam}::${wgt}::${ls}`;
}

function _applyFitWithCache(el, siglaText, baseFs) {
  if (!el) return;

  const txt = (siglaText != null) ? String(siglaText) : "";
  const len = txt.length;

  // 3.1 Regole semplici: 1–2 caratteri → sempre 23px, zero misure/cache.
  if (len > 0 && len <= 2) {
    el.style.fontSize = "23px";
    return;
  }

  // 3.1 Regole semplici: 3–4 caratteri → fitting solo se serve.
  // Se già ci sta, non faccio cache-key, non faccio fit.
  if (len >= 3 && len <= 4) {
    const avail = el.clientWidth || Math.round(el.getBoundingClientRect().width);
    const need = el.scrollWidth;
    if (avail && need && need <= avail + 0.5) {
      return;
    }
  }

  const key = _siglaCacheKey(el, txt, baseFs);
  if (!key) return;

  const cached = _siglaFitCache.get(key);
  if (cached != null) {
    el.style.fontSize = cached + "px";
    return;
  }

  // Miss: calcolo una volta sola, poi memorizzo.
  autoFitCalendarSigla(el, baseFs);

  const finalFs = parseFloat(getComputedStyle(el).fontSize);
  if (Number.isFinite(finalFs) && finalFs > 0) {
    _siglaFitCache.set(key, Math.round(finalFs * 2) / 2);
  }
}

function _scheduleSiglaBatch() {
  if (_siglaBatchScheduled) return;
  _siglaBatchScheduled = true;

  requestAnimationFrame(() => {
    _siglaBatchScheduled = false;
    const batch = _siglaBatchPending;
    _siglaBatchPending = [];
    if (!batch.length) return;

    // 1) Fit (da cache o misura) su tutte le sigle del batch
    batch.forEach((it) => {
      if (!it || !it.el) return;
      _applyFitWithCache(it.el, it.txt, it.baseFs);
    });

    // 2) Centraggio ottico, poi sblocco visibilità tutte insieme
    requestAnimationFrame(() => {
      batch.forEach((it) => {
        if (!it || !it.el) return;
        autoCenterCalendarSigla(it.el);
      });
      batch.forEach((it) => {
        if (!it || !it.el) return;
        it.el.classList.add("sigla-ready");
      });
    });
  });
}

function autoFitCalendarSigla(el, baseFontPx) {
  if (!el) return;

  const baseFont = Number(baseFontPx);

  const css = getComputedStyle(el);
  const curFs = parseFloat(css.fontSize);

  const startingFs = (Number.isFinite(baseFont) && baseFont > 0)
    ? baseFont
    : (Number.isFinite(curFs) && curFs > 0 ? curFs : 0);

  if (!startingFs) return;

  // serve essere già nel DOM per misure affidabili
  const avail = el.clientWidth || Math.round(el.getBoundingClientRect().width);
  const need = el.scrollWidth;

  if (!avail || !need) return;

  if (need <= avail + 0.5) return;

  const ratio = avail / need;
  let fitted = startingFs * ratio;
  fitted *= 1.06;

  // guardrail (non una soglia "logica": evita font a 0)
  if (!Number.isFinite(fitted) || fitted <= 0) return;
  fitted = Math.max(8, fitted);

  const fittedRounded = (Math.round(fitted * 2) / 2);
  el.style.fontSize = fittedRounded + "px";
}

function autoCenterCalendarSigla(el) {
  if (!el) return;

  // reset per misure pulite
  el.style.transform = "";

  if (!document.createRange) return;

  const range = document.createRange();
  range.selectNodeContents(el);

  const textRect = range.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();

  if (!textRect.width || !elRect.width) return;

  const textCx = textRect.left + (textRect.width / 2);
  const elCx = elRect.left + (elRect.width / 2);

  const dx = elCx - textCx;
  if (!Number.isFinite(dx)) return;

  // ignora micro-subpixel inutili
  if (Math.abs(dx) < 0.25) return;

  el.style.transform = `translateX(${dx}px)`;
}

function applyTurnazioneOverlayToCell(cellEl, dateObj) {
  if (!cellEl || !(dateObj instanceof Date)) return;

  const old = cellEl.querySelector(".cal-turno-sigla");
  if (old) old.remove();

  const info = getCalendarSiglaForDate(dateObj);
  if (!info) return;

  const el = document.createElement("div");
  el.className = "cal-turno-sigla";
  el.textContent = info.sigla;

  if (info.colore) el.style.color = info.colore;

  // no ellissi (gestiamo noi il fit dopo il render)
  el.style.textOverflow = "clip";

  const sizing = getCalendarSiglaSizingConfig(info.sigla);

  // base: riferimento estetico (es. 23px)
  if (sizing.fontPx) {
    const px = Math.max(1, sizing.fontPx);
    el.style.fontSize = (Math.round(px * 2) / 2) + "px";
  } else if (sizing.scale !== 1.0) {
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (Number.isFinite(fs) && fs > 0) {
      const scaled = fs * sizing.scale;
      el.style.fontSize = (Math.round(scaled * 2) / 2) + "px";
    }
  }

  el.style.textRendering = "geometricPrecision";
  el.style.setProperty("-webkit-font-smoothing", "antialiased");
  el.style.setProperty("-moz-osx-font-smoothing", "grayscale");

  if (sizing.fontWeight !== null && sizing.fontWeight !== undefined && sizing.fontWeight !== "") {
    el.style.fontWeight = String(sizing.fontWeight);
  }
  if (sizing.letterSpacing !== null && sizing.letterSpacing !== undefined && sizing.letterSpacing !== "") {
    el.style.letterSpacing = String(sizing.letterSpacing);
  }

  cellEl.appendChild(el);

  // Batch: fit + centraggio su tutte le sigle, poi visibili insieme
  const baseFs = sizing.fontPx ? Number(sizing.fontPx) : parseFloat(getComputedStyle(el).fontSize);
  _siglaBatchPending.push({ el, txt: info.sigla, baseFs });
  _scheduleSiglaBatch();
}


// ===================== SPLIT turnazione-overlay : END =======================





// ===================== SPLIT header-e-classi-mode : START =====================

  // ============================
  // Render header
  // ============================

  function updateHeader() {
    if (!monthLabel) return;

    if (currentMode === MODES.DAYS) {
      monthLabel.textContent = `${monthNames[currentMonth]} ${currentYear}`;
      return;
    }

    if (currentMode === MODES.MONTHS) {
      monthLabel.textContent = String(currentYear);
      return;
    }

    if (currentMode === MODES.YEARS) {
      const end = yearRangeStart + YEARS_PAGE_SIZE - 1;
      monthLabel.textContent = `${yearRangeStart} - ${end}`;
    }
  }

  function updateContainerModeClass() {
    if (!calendarContainer) return;
    calendarContainer.classList.remove("mode-days", "mode-months", "mode-years");
    if (currentMode === MODES.DAYS) {
      calendarContainer.classList.add("mode-days");
    } else if (currentMode === MODES.MONTHS) {
      calendarContainer.classList.add("mode-months");
    } else if (currentMode === MODES.YEARS) {
      calendarContainer.classList.add("mode-years");
    }
  }

// ===================== SPLIT header-e-classi-mode : END =====================


// ===================== SPLIT render-giorni : START =====================

  // ============================
  // Render giorni
  // ============================

  function renderDays() {
    if (!gridDays) return;

    gridDays.innerHTML = "";

    const firstDay = new Date(currentYear, currentMonth, 1);

    // JS: 0 = Domenica ... 6 = Sabato
    // Noi vogliamo: 0 = Lunedì ... 6 = Domenica
    const startIndex = (firstDay.getDay() + 6) % 7;

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const isCurrentMonth =
      currentYear === today.getFullYear() &&
      currentMonth === today.getMonth();

    // Celle vuote prima del giorno 1
    for (let i = 0; i < startIndex; i++) {
      const empty = document.createElement("div");
      empty.className = "day empty";
      gridDays.appendChild(empty);
    }

    // Tutti i giorni del mese
    for (let d = 1; d <= daysInMonth; d++) {
      const cell = document.createElement("div");
      cell.className = "day";
      cell.textContent = d;

      // Colonna (0 = Lun, ... 6 = Dom)
      const colIndex = (startIndex + d - 1) % 7;

      // Solo Domenica (colIndex: 0 = Lun ... 6 = Dom)
      if (colIndex === 6) {
        cell.classList.add("sunday");
      }

      // Oggi
      if (isCurrentMonth && d === today.getDate()) {
        cell.classList.add("today");
      }

      // Turnazione: sigla in basso (se abilitata)
      const dateObj = new Date(currentYear, currentMonth, d);
      applyTurnazioneOverlayToCell(cell, dateObj);

      gridDays.appendChild(cell);
    }

    updateHeader();
    updateDayCellSize();
  }

// ===================== SPLIT render-giorni : END =====================


// ===================== SPLIT render-mesi : START =====================

  // ============================
  // Render mesi
  // ============================

  function renderMonths() {
    if (!gridMonths) return;

    gridMonths.innerHTML = "";

    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();

    for (let m = 0; m < 12; m++) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "month-cell";
      cell.textContent = monthShort[m];

      // evidenzia SOLO se è il mese reale di oggi nello stesso anno
      if (currentYear === todayYear && m === todayMonth) {
        cell.classList.add("is-current");
      }

      cell.addEventListener("click", () => {
        currentMonth = m;
        currentMode = MODES.DAYS;
        updateContainerModeClass();
        renderDays();
      });

      gridMonths.appendChild(cell);
    }

    updateHeader();
  }

// ===================== SPLIT render-mesi : END =====================


// ===================== SPLIT render-anni : START =====================

  // ============================
  // Render anni
  // ============================

  function renderYears() {
    if (!gridYears) return;

    gridYears.innerHTML = "";

    const end = yearRangeStart + YEARS_PAGE_SIZE - 1;
    const todayYear = today.getFullYear();

    for (let y = yearRangeStart; y <= end; y++) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "year-cell";
      cell.textContent = y;

      // evidenzia SOLO l'anno reale di oggi
      if (y === todayYear) {
        cell.classList.add("is-current");
      }

      cell.addEventListener("click", () => {
        currentYear = y;
        currentMode = MODES.MONTHS;
        updateContainerModeClass();
        renderMonths();
      });

      gridYears.appendChild(cell);
    }

    updateHeader();
  }

// ===================== SPLIT render-anni : END =====================


// ===================== SPLIT switch-modalita : START =====================

  // ============================
  // Switch modalità
  // ============================

  function setMode(mode) {
    if (mode === currentMode && mode !== MODES.YEARS) {
      return;
    }

    currentMode = mode;

    if (currentMode === MODES.YEARS) {
      // centra la finestra: 5 anni prima, 6 dopo
      yearRangeStart = currentYear - 5;
    }

    updateContainerModeClass();

    if (currentMode === MODES.DAYS) {
      renderDays();
    } else if (currentMode === MODES.MONTHS) {
      renderMonths();
    } else if (currentMode === MODES.YEARS) {
      renderYears();
    }
  }

// ===================== SPLIT switch-modalita : END =====================


// ===================== SPLIT navigazione-frecce : START =====================

  // ============================
  // Navigazione frecce
  // ============================

  function goPrev() {
    if (currentMode === MODES.DAYS) {
      currentMonth--;
      if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
      }
      renderDays();
      return;
    }

    if (currentMode === MODES.MONTHS) {
      currentYear--;
      renderMonths();
      return;
    }

    if (currentMode === MODES.YEARS) {
      yearRangeStart -= YEARS_PAGE_SIZE;
      renderYears();
    }
  }

  function goNext() {
    if (currentMode === MODES.DAYS) {
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
      renderDays();
      return;
    }

    if (currentMode === MODES.MONTHS) {
      currentYear++;
      renderMonths();
      return;
    }

    if (currentMode === MODES.YEARS) {
      yearRangeStart += YEARS_PAGE_SIZE;
      renderYears();
    }
  }

// ===================== SPLIT navigazione-frecce : END =====================


// ===================== SPLIT click-fuori-calendario : START =====================

  // ============================
  // Click fuori dal calendario
  // ============================

  function setupOutsideClickHandler() {
    document.addEventListener("click", (ev) => {
      if (!calendarContainer) return;
      if (currentMode === MODES.DAYS) return;

      const target = ev.target;

      // se clicchi dentro il contenitore,
      // sul titolo, o sulle frecce → NON resettare
      if (
        calendarContainer.contains(target) ||
        (monthLabel && monthLabel.contains(target)) ||
        (prevBtn && prevBtn.contains(target)) ||
        (nextBtn && nextBtn.contains(target))
      ) {
        return;
      }

      // Torna alla vista giorni mantenendo year/month correnti
      currentMode = MODES.DAYS;
      updateContainerModeClass();
      renderDays();
    });
  }

// ===================== SPLIT click-fuori-calendario : END =====================


// ===================== SPLIT api-pubblica-e-init : START =====================

  // ============================
  // API pubblica calendario
  // ============================

  function resetToToday() {
    today = new Date();
    currentYear = today.getFullYear();
    currentMonth = today.getMonth();
    currentMode = MODES.DAYS;
    updateContainerModeClass();
    renderDays();
  }

  function getState() {
    return {
      year: currentYear,
      month: currentMonth,
      mode: currentMode
    };
  }

  function setState(state) {
    if (!state) return;

    const y = parseInt(state.year, 10);
    const m = parseInt(state.month, 10);
    const mode = state.mode;

    if (!Number.isNaN(y)) currentYear = y;
    if (!Number.isNaN(m)) currentMonth = m;

    if (mode === MODES.DAYS || mode === MODES.MONTHS || mode === MODES.YEARS) {
      currentMode = mode;
    }

    updateContainerModeClass();

    if (currentMode === MODES.DAYS) renderDays();
    if (currentMode === MODES.MONTHS) renderMonths();
    if (currentMode === MODES.YEARS) renderYears();
  }

  // =====================================================
  // Reflow sigle turnazione (senza ricostruire tutto)
  // =====================================================

  function reflowTurnoSigle() {
    if (currentMode !== MODES.DAYS) return;

    // assicura visibilità (nei reflow le sigle esistono già)
    const all = gridDays ? gridDays.querySelectorAll(".turno-sigla") : [];
    if (all && all.length) {
      all.forEach(el => {
        // assicura visibilità (nei reflow le sigle esistono già)
        el.classList.add("sigla-ready");
      });
    }
  }

  function onEnterCalendarView() {
    if (currentMode !== MODES.DAYS) return;

    if (_calendarDirty) {
      _calendarDirty = false;
      renderDays(); // qui il fit post-render funziona perché ora è visibile
      return;
    }

    // se non è dirty, basta il reflow
    reflowTurnoSigle();
  }

  function init() {
    gridDays = document.getElementById("calendar-grid");
    gridMonths = document.getElementById("month-grid");
    gridYears = document.getElementById("year-grid");
    monthLabel = document.querySelector(".month-label");
    prevBtn = document.querySelector(".prev");
    nextBtn = document.querySelector(".next");
    calendarContainer = document.getElementById("calendarContainer");

    if (!gridDays || !monthLabel || !calendarContainer) return;

    updateContainerModeClass();

if (prevBtn) {
  prevBtn.addEventListener("click", goPrev);
}

if (nextBtn) {
  nextBtn.addEventListener("click", goNext);
}



    // Click sul titolo: Giorni → Mesi → Anni
    monthLabel.addEventListener("click", () => {
      if (currentMode === MODES.DAYS) {
        setMode(MODES.MONTHS);
      } else if (currentMode === MODES.MONTHS) {
        setMode(MODES.YEARS);
      }
      // in modalità anni il click sul titolo non fa nulla
    });

    setupOutsideClickHandler();
    renderDays();


// ===================== calendar-dirty-guard : START =====================
let _calendarDirty = false;

function isCalendarViewActive() {
  const v = document.querySelector(".view-calendar");
  return !!(v && v.classList.contains("is-active"));
}
// ===================== calendar-dirty-guard : END =======================

// Aggiorna calendario in tempo reale quando cambi impostazioni/turnazioni/inizio turnazione
window.addEventListener("turnipds:storage-changed", () => {
  if (currentMode !== MODES.DAYS) return;

  if (isCalendarViewActive()) {
    renderDays();
  } else {
    _calendarDirty = true;
  }
});

// Sync anche se una seconda tab cambia localStorage
window.addEventListener("storage", (ev) => {
  if (!ev || !ev.key) return;
  if (currentMode !== MODES.DAYS) return;

  if (isCalendarViewActive()) {
    renderDays();
  } else {
    _calendarDirty = true;
  }
});
    // Aggiorna larghezza cella su resize/orientamento (senza raffiche)
    let _calResizeRaf = 0;
    let _calResizeTimer = 0;

    function scheduleCalendarResizeUpdate() {
      if (currentMode !== MODES.DAYS) return;

      // 1) throttle su rAF (massimo 1 per frame)
      if (!_calResizeRaf) {
        _calResizeRaf = requestAnimationFrame(() => {
          _calResizeRaf = 0;

          const changed = updateDayCellSize();
          if (changed) {
            // invalidare cache solo se la larghezza cella cambia davvero
            if (typeof _siglaFitCache !== "undefined" && _siglaFitCache && typeof _siglaFitCache.clear === "function") {
              _siglaFitCache.clear();
            }

            // se la vista calendario è attiva, riallineo le sigle senza ricostruire
            if (isCalendarViewActive()) {
              reflowTurnoSigle();
            }
          }
        });
      }

      // 2) debounce: un ultimo pass quando l'utente ha finito di ridimensionare
      if (_calResizeTimer) clearTimeout(_calResizeTimer);
      _calResizeTimer = setTimeout(() => {
        const changed = updateDayCellSize();
        if (changed) {
          if (typeof _siglaFitCache !== "undefined" && _siglaFitCache && typeof _siglaFitCache.clear === "function") {
            _siglaFitCache.clear();
          }
          if (isCalendarViewActive()) {
            reflowTurnoSigle();
          }
        }
      }, 160);
    }

    window.addEventListener("resize", scheduleCalendarResizeUpdate);
    window.addEventListener("orientationchange", scheduleCalendarResizeUpdate);
  }

  window.Calendar = {
    init,
    resetToToday,
    getState,
    setState,
    reflowTurnoSigle,
    onEnterCalendarView
  };

// ===================== SPLIT api-pubblica-e-init : END =====================




})();
// =====================================================
// status-theme-icons.js (bundle UI global)
// Build: 2025-12-18
// Contenuti:
//// - status.js
// - theme.js
// - icons.js
// =====================================================

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

// ============================
// Tema: system / light / dark
// Salvataggio preferenza in localStorage
// Attributo data-theme su <html>
// Sincronizzazione con pannello Impostazioni → Tema
// theme.js v 1.0
// ============================

(function () {

  // ===================== SPLIT guard_config : START =====================
  if (!window.AppConfig) {
    throw new Error("CONFIG.MISSING: AppConfig non disponibile (theme.js)");
  }

  const { STORAGE_KEYS, UI } = window.AppConfig;
  const THEME_KEY    = STORAGE_KEYS.theme;
  const THEME_LABELS = UI.themeLabels || {};
  // ===================== SPLIT guard_config : END   =====================


  // ===================== SPLIT apply_theme_html : START =====================
  // ============================
  // Applicazione tema a <html>
  // ============================

  // Applica il tema al documento:
  // - "light" / "dark" → data-theme sull’elemento <html>
  // - "system" → rimozione data-theme, usa prefers-color-scheme
  function applyTheme(theme) {
    const root = document.documentElement;

    if (theme === "light" || theme === "dark") {
      root.setAttribute("data-theme", theme);
    } else {
      root.removeAttribute("data-theme");
    }
  }
  // ===================== SPLIT apply_theme_html : END   =====================


  // ===================== SPLIT sync_ui_panel : START =====================
  // ============================
  // Sincronizzazione UI (pannello Tema)
  // ============================

  // Evidenzia il pulsante attivo e aggiorna il riepilogo
  // in riga Impostazioni → Tema (elemento #themeSummary)
  function syncThemeUI(theme) {
    const choices = document.querySelectorAll(".settings-choice");
    choices.forEach(btn => {
      const value = btn.dataset.theme;
      btn.classList.toggle("is-active", value === theme);
    });

    const summary = document.getElementById("themeSummary");
    if (summary) {
      summary.textContent = THEME_LABELS[theme] || "";
    }
  }

  // Riempie le label interne dei pulsanti tema
  // usando AppConfig.UI.themeLabels (system / light / dark)
  function fillThemeLabels() {
    const labels = document.querySelectorAll("[data-theme-label]");
    labels.forEach(el => {
      const key = el.dataset.themeLabel;
      if (!key) return;

      const txt = THEME_LABELS[key];
      if (typeof txt === "string" && txt.trim() !== "") {
        el.textContent = txt;
      } else {
        // fallback dignitoso se manca qualcosa nel config
        el.textContent = key;
      }
    });
  }
  // ===================== SPLIT sync_ui_panel : END   =====================


  // ===================== SPLIT storage_load_save : START =====================
  // ============================
  // Caricamento / salvataggio tema
  // ============================

  // Legge il tema da localStorage (default: "system")
  function loadTheme() {
    let saved = localStorage.getItem(THEME_KEY);
    if (!saved) saved = "system";

    applyTheme(saved);
    syncThemeUI(saved);
  }

  // Gestione click sui pulsanti tema
  function setupThemeControls() {
    const choices = document.querySelectorAll(".settings-choice");
    if (!choices.length) return;

    choices.forEach(btn => {
      btn.addEventListener("click", () => {
        const value = btn.dataset.theme;
        if (!value) return;

        localStorage.setItem(THEME_KEY, value);
        applyTheme(value);
        syncThemeUI(value);

        if (window.Status && typeof Status.markSaved === "function") {
          Status.markSaved();
        }
      });
    });
  }
  // ===================== SPLIT storage_load_save : END   =====================


  // ===================== SPLIT public_init_export : START =====================
  // ============================
  // Init pubblico
  // ============================

  function initTheme() {
    // 1) riempie le etichette dei pulsanti dal config
    // 2) applica il tema salvato
    // 3) aggancia i listener di click
    fillThemeLabels();
    loadTheme();
    setupThemeControls();
  }

  window.Theme = {
    init: initTheme
  };
  // ===================== SPLIT public_init_export : END   =====================

})();

// ============================
// Icone SVG:
// Tabbar (Calendario / InsPag / Riepilogo / Impostazioni)
// Icona stato / login (in alto a destra)
// icons.js v 1.0
// ============================

(function () {

  // ===================== SPLIT bootstrap_guard_config : START =====================
  if (!window.AppConfig) {
    throw new Error("CONFIG.MISSING: AppConfig non disponibile (icons.js)");
  }

  const { PATHS } = window.AppConfig;
  const SVG_BASE = PATHS.svgBase;
  // ===================== SPLIT bootstrap_guard_config : END   =====================

  // ===================== SPLIT util_load_svg_into_host : START =====================
  // ============================
  // Util: inietta un file SVG in un elemento con id dato
  // ============================
  async function loadSVGInto(id, file) {
    const host = document.getElementById(id);
    if (!host) return;

    try {
      const res = await fetch(`${SVG_BASE}/${file}`, {
        cache: "no-store",
        credentials: "same-origin"
      });

      if (!res.ok) return;

      const txt = await res.text();
      host.innerHTML = txt.trim();
    } catch (err) {
      console.error("Errore icona:", file, err);
    }
  }
  // ===================== SPLIT util_load_svg_into_host : END   =====================

  // ===================== SPLIT calendar_icon_dynamic_date : START =====================
  // ============================
  // Calendario: mese/giorno dinamici dentro calendar.svg
  // ============================
  function setCalendarIconDateInSvg() {
    const host = document.getElementById("icoCalendar");
    if (!host) return;

    const now = new Date();
    const months = ["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];

    const monthEl = host.querySelector("#calMonth");
    const dayEl   = host.querySelector("#calDay");

    if (monthEl) monthEl.textContent = months[now.getMonth()];
    if (dayEl)   dayEl.textContent   = now.getDate();
  }
  // ===================== SPLIT calendar_icon_dynamic_date : END   =====================

  // ===================== SPLIT tabbar_icons_loader : START =====================
  // ============================
  // Tabbar: 4 icone principali
  // (chiamato da app.js → Icons.initTabbar())
  // ============================
  async function loadTabbarIcons() {
    // Calendario: icona con giorno/mese dinamici
    await loadSVGInto("icoCalendar", "calendar.svg");
    setCalendarIconDateInSvg();

    // Inserimenti / Pagamenti
    await loadSVGInto("icoInspag", "inspag.svg");

    // Riepilogo
    await loadSVGInto("icoRiepilogo", "riepilogo.svg");

    // Impostazioni
    await loadSVGInto("icoSettings", "settings.svg");

    // Quando tutte le icone sono pronte, rendi visibili gli SVG
    const tabbar = document.querySelector(".tabbar");
    if (tabbar) {
      tabbar.classList.add("tabbar-icons-ready");
    }
  }
  // ===================== SPLIT tabbar_icons_loader : END   =====================

  // ===================== SPLIT status_icon_loader : START =====================
  // ============================
  // Icona stato / login:
  // - SVG login.svg dentro #icoStatus
  // - gli stati (idle/saving/ok) sono gestiti da status.js via classi sul wrapper
  // ============================
  async function loadStatusIcon() {
    await loadSVGInto("icoStatus", "login.svg");
  }
  // ===================== SPLIT status_icon_loader : END   =====================

  // ===================== SPLIT public_api_exports : START =====================
  // ============================
  // API pubblica
  // ============================
  window.Icons = {
    initTabbar: loadTabbarIcons,
    loadStatusIcon
  };
  // ===================== SPLIT public_api_exports : END   =====================

})();
// =====================================================
// turni-storage-render.js (bundle storage + render)
// Build: 2025-12-18
// Contenuti:
//// - turni-storage.js
// - turni-render.js
// =====================================================

// ============================
// Storage e validazione turni
// turni-storage.js v 1.0
// ============================

(function () {

  // ===================== SPLIT bootstrap_config : START =====================
  if (!window.AppConfig) {
    throw new Error("CONFIG.MISSING: AppConfig non disponibile (turni-storage.js)");
  }

  const { STORAGE_KEYS } = window.AppConfig;

  const TURNI_KEY     = STORAGE_KEYS.turni;
  const TURNI_VIS_KEY = STORAGE_KEYS.turniVisualizza;

  // ✅ Turnazioni
  const TURNAZIONI_KEY = STORAGE_KEYS.turnazioni;
  const TURNAZIONI_PREF_KEY = STORAGE_KEYS.turnazioniPreferred;

  // ✅ Turno iniziale
  const TURNI_START_KEY = STORAGE_KEYS.turniStart;
  // ===================== SPLIT bootstrap_config : END   =====================

  // ===================== SPLIT storage-change-events : START =====================
// Notifica interna: utile per aggiornare UI in tempo reale (es. calendario).
function emitStorageChange(key) {
  try {
    window.dispatchEvent(new CustomEvent("turnipds:storage-changed", { detail: { key: String(key || "") } }));
  } catch {}
}
// ===================== SPLIT storage-change-events : END =======================


  // ===================== SPLIT storage_turni_personalizzati : START =====================
  // ============================
  // Storage: turni personalizzati
  // ============================

  function seedFactoryDefaultsIfNeeded() {
    try {
      const hasTurni = !!localStorage.getItem(TURNI_KEY);
      const hasTurnazioni = !!localStorage.getItem(TURNAZIONI_KEY);
      const hasStart = !!localStorage.getItem(TURNI_START_KEY);

      // Seed SOLO alla primissima apertura (se manca il “pacchetto base”)
      if (hasTurni || hasTurnazioni || hasStart) return false;

      const pad2 = (n) => String(n).padStart(2, "0");
      const now = new Date();
      const todayISO = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;

      const turniFactory = [
        { nome: "Sera",        sigla: "S", colore: "#30B0C7", inizio: "18:55", fine: "00:08", noTime: false },
        { nome: "Pomeriggio",  sigla: "P", colore: "#34C759", inizio: "12:55", fine: "19:08", noTime: false },
        { nome: "Mattina",     sigla: "M", colore: "#FFC83D", inizio: "06:55", fine: "13:08", noTime: false },
        { nome: "Notte",       sigla: "N", colore: "#5856D6", inizio: "23:55", fine: "07:08", noTime: false },
        { nome: "Riposo",      sigla: "R", colore: "#8E8E93", inizio: "",      fine: "",      noTime: true  }
      ];

      const turnazioneId = "factory-turnazione-in-quinta";

      const turnazioniFactory = [
        {
          id: turnazioneId,
          name: "Turnazione in quinta",
          days: 5,
          slots: [
            { nome: "Sera",         sigla: "S", colore: "#30B0C7" },
            { nome: "Pomeriggio",   sigla: "P", colore: "#34C759" },
            { nome: "Mattina",      sigla: "M", colore: "#FFC83D" },
            { nome: "Notte",        sigla: "N", colore: "#5856D6" },
            { nome: "Riposo",       sigla: "R", colore: "#8E8E93" }
          ],
          restDaysAllowed: 1,
          restIndices: [4],
          riposiFissi: {
            lunedi:  { nome: "Giorno Libero", sigla: "GL", colore: "#A1A1A6" },
            martedi: { nome: "Add. Prof.",    sigla: "AP", colore: "#FF9500" }
          }
        }
      ];

      localStorage.setItem(TURNI_KEY, JSON.stringify(turniFactory));
      localStorage.setItem(TURNAZIONI_KEY, JSON.stringify(turnazioniFactory));
      localStorage.setItem(TURNAZIONI_PREF_KEY, String(turnazioneId));
      localStorage.setItem(TURNI_VIS_KEY, "true");
      localStorage.setItem(TURNI_START_KEY, JSON.stringify({ date: todayISO, slotIndex: 0 }));

      return true;
    } catch {
      return false;
    }
  }

  function loadTurni() {
    try {
      seedFactoryDefaultsIfNeeded();

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


      emitStorageChange(TURNI_KEY);

      if (window.Status && typeof Status.markSaved === "function") {
        Status.markSaved();
      }
    } catch (e) {
      console.warn("Salvataggio turni fallito:", e);
    }
  }
  // ===================== SPLIT storage_turni_personalizzati : END   =====================



  // ===================== SPLIT storage_toggle_visualizzazione_turnazione : START =====================
  // ============================
  // Storage: toggle visualizzazione turnazione
  // ============================

  function loadVisualToggle() {
    try {
      const raw = localStorage.getItem(TURNI_VIS_KEY);
      if (raw === "true") return true;
      if (raw === "false") return false;
      return true; // default: acceso
    } catch {
      return true;
    }
  }

  function saveVisualToggle(isOn) {
    try {
      localStorage.setItem(TURNI_VIS_KEY, isOn ? "true" : "false");


      emitStorageChange(TURNI_VIS_KEY);

      if (window.Status && typeof Status.markSaved === "function") {
        Status.markSaved();
      }
    } catch (e) {
      console.warn("Salvataggio toggle turnazione fallito:", e);
    }
  }
  // ===================== SPLIT storage_toggle_visualizzazione_turnazione : END   =====================

  // ===================== SPLIT storage_turnazioni : START =====================
  // ============================
  // ✅ Storage: turnazioni
  // ============================

  function loadTurnazioni() {
    try {
      const raw = localStorage.getItem(TURNAZIONI_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveTurnazioni(arr) {
    try {
      localStorage.setItem(TURNAZIONI_KEY, JSON.stringify(Array.isArray(arr) ? arr : []));


      emitStorageChange(TURNAZIONI_KEY);

      if (window.Status && typeof Status.markSaved === "function") {
        Status.markSaved();
      }
    } catch (e) {
      console.warn("Salvataggio turnazioni fallito:", e);
    }
  }

  function loadPreferredTurnazioneId() {
    try {
      const v = localStorage.getItem(TURNAZIONI_PREF_KEY);
      return v || null;
    } catch {
      return null;
    }
  }

  function savePreferredTurnazioneId(id) {
    try {
      if (!id) {
        localStorage.removeItem(TURNAZIONI_PREF_KEY);
      } else {
        localStorage.setItem(TURNAZIONI_PREF_KEY, String(id));
      }

      emitStorageChange(TURNAZIONI_PREF_KEY);

      if (window.Status && typeof Status.markSaved === "function") {
        Status.markSaved();
      }
    } catch (e) {
      console.warn("Salvataggio preferita fallito:", e);
    }
  }
  // ===================== SPLIT storage_turnazioni : END   =====================

  // ===================== SPLIT storage_turno_iniziale : START =====================
  // ============================
  // ✅ Storage: turno iniziale
  // payload:
  // { date: "YYYY-MM-DD" | "", slotIndex: number | null }
  // ============================

  function loadTurnoIniziale() {
    try {
      const raw = localStorage.getItem(TURNI_START_KEY);
      if (!raw) return { date: "", slotIndex: null };
      const parsed = JSON.parse(raw) || {};
      return {
        date: (typeof parsed.date === "string") ? parsed.date : "",
        slotIndex: (Number.isInteger(parsed.slotIndex) ? parsed.slotIndex : null)
      };
    } catch {
      return { date: "", slotIndex: null };
    }
  }

  function saveTurnoIniziale(obj) {
    try {
      const payload = obj && typeof obj === "object" ? obj : {};
      const out = {
        date: (typeof payload.date === "string") ? payload.date : "",
        slotIndex: (Number.isInteger(payload.slotIndex) ? payload.slotIndex : null)
      };

      localStorage.setItem(TURNI_START_KEY, JSON.stringify(out));

      emitStorageChange(TURNI_START_KEY);

      if (window.Status && typeof Status.markSaved === "function") {
        Status.markSaved();
      }
    } catch (e) {
      console.warn("Salvataggio turno iniziale fallito:", e);
    }
  }
  // ===================== SPLIT storage_turno_iniziale : END   =====================

  // ===================== SPLIT util_validazione_orario : START =====================
  // ============================
  // Util: parsing / validazione orario
  // Accetta 00:00 .. 23:59 e 24:00
  // ============================

  function isValidTime(str) {
    if (typeof str !== "string") return false;
    const s = str.trim();
    const m = /^(\d{1,2}):(\d{2})$/.exec(s);
    if (!m) return false;

    const h   = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);

    if (Number.isNaN(h) || Number.isNaN(min)) return false;
    if (min < 0 || min > 59) return false;
    if (h < 0 || h > 24) return false;
    if (h === 24 && min !== 0) return false;

    return true;
  }
  // ===================== SPLIT util_validazione_orario : END   =====================

    // ===================== SPLIT export_api_pubblica : START =====================
  // ============================
  // API pubblica
  // ============================

  window.TurniStorage = {
    seedFactoryDefaultsIfNeeded,
    loadTurni,
    saveTurni,
    loadVisualToggle,
    saveVisualToggle,
    isValidTime,

    // ✅ Turnazioni
    loadTurnazioni,
    saveTurnazioni,
    loadPreferredTurnazioneId,
    savePreferredTurnazioneId,

    // ✅ Turno iniziale
    loadTurnoIniziale,
    saveTurnoIniziale
  };
  // ===================== SPLIT export_api_pubblica : END   =====================


})();

// ============================
// Render lista turni + font sigla
// turni-render.js v 1.0
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
// =====================================================
// turnazioni.js (bundle feature turnazioni)
// Build: 2025-12-18
// Contenuti:
//// - turnazioni-list.js
// - turnazioni-add.js
// - turnazioni.js
// =====================================================

// ============================
// Rendering lista turnazioni (mini-card) + preferita + hint
// turnazioni-list.js v 1.0
// ============================

(function () {
	// espongo funzioni dopo init
	let openEditTurnazioneImpl = null;
	let clearEditTurnazioneImpl = null;
// ===================== SPLIT helpers_formatting : START =====================
  // split start
function formatSigle(turnazione) {
  const n = Number(turnazione && turnazione.days) || 0;
  const slots = Array.isArray(turnazione && turnazione.slots) ? turnazione.slots : [];
  const restIdx = Array.isArray(turnazione && turnazione.restIndices) ? turnazione.restIndices : [];

  const out = [];
  let prevWasRest = false;

  for (let i = 0; i < n; i++) {
    const slot = slots[i] || null;
    const sigla = slot && slot.sigla ? String(slot.sigla).trim() : "";

    const isRest = restIdx.includes(i);

    if (isRest) {
      const s = sigla || "R";

      // Se due (o più) riposi sono consecutivi, li unisco tipo R/RF
      if (prevWasRest && out.length) {
        out[out.length - 1] = out[out.length - 1] + "/" + s;
      } else {
        out.push(s);
      }
      prevWasRest = true;
    } else {
      out.push(sigla || "?");
      prevWasRest = false;
    }
  }

  // Riposi fissi (Lun/Mar) -> append "(GL/AP)"
  const riposiFissi = (turnazione && turnazione.riposiFissi) ? turnazione.riposiFissi : null;
  if (riposiFissi && typeof riposiFissi === "object") {
    const sigLun = riposiFissi.lunedi && riposiFissi.lunedi.sigla ? String(riposiFissi.lunedi.sigla).trim() : "";
    const sigMar = riposiFissi.martedi && riposiFissi.martedi.sigla ? String(riposiFissi.martedi.sigla).trim() : "";

    const extra = [];
    if (sigLun) extra.push(sigLun);
    if (sigMar) extra.push(sigMar);

    if (extra.length) {
      return out.join(" - ") + " (" + extra.join("/") + ")";
    }
  }

  return out.join(" - ");
}
// split end


  function getPreferred(savedTurnazioni, preferredId) {
    if (!Array.isArray(savedTurnazioni) || savedTurnazioni.length === 0) return null;

    let pick = null;
    if (preferredId) {
      pick = savedTurnazioni.find(t => String(t.id) === String(preferredId)) || null;
    }
    if (!pick) pick = savedTurnazioni[savedTurnazioni.length - 1];
    return pick;
  }
// ===================== SPLIT helpers_formatting : END =======================


// ===================== SPLIT render-lista-turnazioni : START =====================
  // split start
function renderTurnazioni(listEl, turnazioni, emptyHintEl, editBtn, options) {
  if (!listEl) return;

  const opts = options || {};
  const isEditing = !!opts.isEditing;
  const onDelete = typeof opts.onDelete === "function" ? opts.onDelete : null;

  // ✅ In modalità Modifica NON deve esistere il click “seleziona preferita”
  const onSelect = (!isEditing && typeof opts.onSelect === "function") ? opts.onSelect : null;

  const preferredId = opts.preferredId != null ? String(opts.preferredId) : null;

  listEl.innerHTML = "";

  const has = Array.isArray(turnazioni) && turnazioni.length > 0;

  if (!has) {
    listEl.classList.remove("editing");

    if (emptyHintEl) emptyHintEl.hidden = false;
    if (editBtn) {
      editBtn.disabled = true;
      editBtn.classList.remove("icon-circle-btn");
      editBtn.textContent = "Modifica";
      editBtn.removeAttribute("aria-pressed");
    }
    return;
  }

  listEl.classList.toggle("editing", isEditing);

  if (emptyHintEl) emptyHintEl.hidden = true;

  if (editBtn) {
    editBtn.disabled = false;

    if (isEditing) {
      editBtn.setAttribute("aria-pressed", "true");
      editBtn.classList.add("icon-circle-btn");
      editBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M6 12.5 L10 16.5 L18 7.5" />
        </svg>
      `;
    } else {
      editBtn.removeAttribute("aria-pressed");
      editBtn.classList.remove("icon-circle-btn");
      editBtn.textContent = "Modifica";
    }
  }

  turnazioni.forEach((t, index) => {
    const row = document.createElement("div");
    row.className = "turno-item";
    row.dataset.index = String(index);
    row.dataset.turnazioneId = t && t.id != null ? String(t.id) : "";

    const isSel = preferredId && t && String(t.id) === preferredId;
    row.classList.toggle("is-selected", !!isSel);

    if (isEditing && onDelete) {
      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "turno-delete-btn";
      delBtn.setAttribute("aria-label", "Elimina turnazione");

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

    const nameEl = document.createElement("span");
    nameEl.className = "turno-name";
    nameEl.textContent = t && t.name ? String(t.name) : "";
    row.appendChild(nameEl);

    const sigleEl = document.createElement("span");
    sigleEl.className = "turno-orario";
    sigleEl.textContent = formatSigle(t);
    row.appendChild(sigleEl);

    // ✅ click selezione SOLO fuori dalla modalità Modifica
    if (onSelect) {
      row.addEventListener("click", () => onSelect(index));
    }

    listEl.appendChild(row);
  });
}
  // split end
// ===================== SPLIT render-lista-turnazioni : END =====================



// ===================== SPLIT api_state_and_init : START =====================
  const api = {
    panelTurni: null,
    listEl: null,
    emptyEl: null,
    visualHintEl: null,

    saved: [],
    preferredId: null,

    init(ctx) {
      this.panelTurni = ctx && ctx.panelTurni ? ctx.panelTurni : null;
      this.listEl = ctx && ctx.turnazioniListEl ? ctx.turnazioniListEl : null;
      this.emptyEl = ctx && ctx.turnazioniEmptyEl ? ctx.turnazioniEmptyEl : null;
      this.visualHintEl = ctx && ctx.visualHintEl ? ctx.visualHintEl : null;

      // opzionale: bottone modifica, per render identico a Turni
      this.editBtn = ctx && ctx.turnazioniEditBtn ? ctx.turnazioniEditBtn : null;

      this.refresh();
    },
// ===================== SPLIT api_state_and_init : END   =====================

// ===================== SPLIT api_refresh_rendering : START =====================
    refresh(options) {
      if (!window.TurniStorage) return;

      const hasStorage =
        window.TurniStorage &&
        typeof TurniStorage.loadTurnazioni === "function" &&
        typeof TurniStorage.saveTurnazioni === "function" &&
        typeof TurniStorage.loadPreferredTurnazioneId === "function" &&
        typeof TurniStorage.savePreferredTurnazioneId === "function";

      this.saved = hasStorage ? TurniStorage.loadTurnazioni() : [];
      this.preferredId = hasStorage ? TurniStorage.loadPreferredTurnazioneId() : null;

      const has = Array.isArray(this.saved) && this.saved.length > 0;

      // preferita valida?
      if (this.preferredId && has) {
        const ok = this.saved.some(t => String(t.id) === String(this.preferredId));
        if (!ok) this.preferredId = null;
      }

      // se non c’è preferita, scegli ultima
      if (!this.preferredId && hasStorage && has) {
        this.preferredId = String(this.saved[this.saved.length - 1].id);
        TurniStorage.savePreferredTurnazioneId(this.preferredId);
      }

      const opts = options || {};

      renderTurnazioni(
        this.listEl,
        this.saved,
        this.emptyEl,
        this.editBtn,
        {
          isEditing: !!opts.isEditing,
          preferredId: this.preferredId,
          onDelete: opts.onDelete,
          onSelect: (idx) => {
            const t = this.saved && this.saved[idx] ? this.saved[idx] : null;
            if (!t) return;
            this.preferredId = String(t.id);
            if (hasStorage) TurniStorage.savePreferredTurnazioneId(this.preferredId);
            // re-render per highlight
            this.refresh(options);
            this.syncVisualHint();
            this.notifyTurnoIniziale();
          }
        }
      );

      this.syncVisualHint();
      this.notifyTurnoIniziale();
    },
// ===================== SPLIT api_refresh_rendering : END   =====================

// ===================== SPLIT api_visual_hint : START =====================
    syncVisualHint() {
      if (!this.visualHintEl) return;

      const has = Array.isArray(this.saved) && this.saved.length > 0;
      if (!has) {
        this.visualHintEl.textContent = "Nessuna turnazione impostata.";
        return;
      }

      const pick = getPreferred(this.saved, this.preferredId);
      this.visualHintEl.textContent = (pick && pick.name) ? pick.name : "Turnazione";
    },
// ===================== SPLIT api_visual_hint : END   =====================

// ===================== SPLIT api_notify_and_export : START =====================
    notifyTurnoIniziale() {
      if (window.Turni && typeof Turni.syncTurnoInizialeUI === "function") {
        Turni.syncTurnoInizialeUI();
      }
      if (window.TurniStart && typeof TurniStart.syncFromTurnazioniChange === "function") {
        TurniStart.syncFromTurnazioniChange();
      }
    }
  };

  window.TurnazioniList = api;
// ===================== SPLIT api_notify_and_export : END   =====================
})();

// ============================
// UI "Aggiungi turnazione" + picker turni + riposi + reset/dirty + salvataggio
// turnazioni-add.js v 1.0
// ============================

(function () {

// ===================== SPLIT helpers_base : START =====================
  function sameTurno(a, b) {
    if (!a || !b) return false;
    const an = (a.nome || "").trim();
    const as = (a.sigla || "").trim();
    const bn = (b.nome || "").trim();
    const bs = (b.sigla || "").trim();
    return an === bn && as === bs;
  }
// ===================== SPLIT helpers_base : END =======================

// ===================== SPLIT init_entrypoint : START =====================
  function initTurnazioniAddUI(ctx) {
    if (!window.TurniStorage) return;
    if (!window.TurniRender) return;
// ===================== SPLIT init_entrypoint : END =======================

// ===================== SPLIT dom_refs_panels : START =====================
    const panelAdd = document.querySelector(
      '.settings-panel.settings-turnazioni-add[data-settings-id="turnazioni-add"]'
    );
    if (!panelAdd) return;

    const panelPick = document.querySelector(
      '.settings-panel.settings-turnazioni-pick[data-settings-id="turnazioni-pick"]'
    );

    const panelTurni = (ctx && ctx.panelTurni)
      ? ctx.panelTurni
      : document.querySelector('.settings-panel.settings-turni[data-settings-id="turni"]');
// ===================== SPLIT dom_refs_panels : END =======================

// ===================== SPLIT dom_refs_list_hint : START =====================
    const turnazioniListEl = (ctx && ctx.turnazioniListEl)
      ? ctx.turnazioniListEl
      : (panelTurni ? panelTurni.querySelector("[data-turnazioni-list]") : null);

    const turnazioniEmptyEl = (ctx && ctx.turnazioniEmptyEl)
      ? ctx.turnazioniEmptyEl
      : (panelTurni ? panelTurni.querySelector("[data-turnazioni-empty-hint]") : null);

    const visualHintEl = (ctx && ctx.visualHintEl)
      ? ctx.visualHintEl
      : (panelTurni ? panelTurni.querySelector("[data-turni-visual-hint]") : null);
// ===================== SPLIT dom_refs_list_hint : END =======================

// ===================== SPLIT dom_refs_toolbar_days_name : START =====================
    // toolbar Salva
    const btnSave = panelAdd.querySelector("[data-turnazioni-save]");
    const errEl   = panelAdd.querySelector("[data-turnazioni-error]");
    const errorCtl = (window.UIFeedback && typeof UIFeedback.createTempError === "function")
      ? UIFeedback.createTempError(errEl, 2000)
      : null;

    // Giorni + griglia
    const select = panelAdd.querySelector("#turnazioniDaysSelect");
    const input  = panelAdd.querySelector("#turnazioniDaysInput");
    const grid   = panelAdd.querySelector("#turnazioniDaysGrid");

    const subtitleEl    = panelAdd.querySelector("#turnazioniDaysSubtitle");
    const placeholderEl = panelAdd.querySelector("#turnazioniDaysPlaceholder");

    // Nome turnazione
    const nameInput = panelAdd.querySelector("#turnazioniNome");
// ===================== SPLIT dom_refs_toolbar_days_name : END =======================

// ===================== SPLIT dom_refs_picker_rest : START =====================
    // picker list
    const pickListEl = panelPick ? panelPick.querySelector("#turnazioniPickList") : null;
    const pickEmpty  = panelPick ? panelPick.querySelector("#turnazioniPickEmpty") : null;
    const pickHint   = panelPick ? panelPick.querySelector("#turnazioniPickHint") : null;

    // riposo nel picker
    const restRowEl    = panelPick ? panelPick.querySelector("#turnazioniPickRestRow") : null;
    const restToggleEl = panelPick ? panelPick.querySelector("#turnazioniRestToggle") : null;

    // card "Giorni di Riposo" (1/2)
    const restDaysBtns = panelAdd.querySelectorAll('[data-turnazioni-rest-days]');
// ===================== SPLIT dom_refs_picker_rest : END =======================

// ===================== SPLIT state_dirty_rotation_rest : START =====================
    // ----------------------------
    // Dirty + reset
    // ----------------------------
    let isDirty = false;
    let lastSaveTs = 0;
    function markDirty() { isDirty = true; }

    // stato rotazione
    let rotationDaysCount = null;                // 1..7 o null
    let rotationSlots = new Array(7).fill(null); // slot -> turno obj oppure null
    let activePickIndex = null;                  // 0..6

    // riposi
    let restDaysAllowed = 1; // 1 o 2
    let restDayIndices = [];
// ===================== SPLIT state_dirty_rotation_rest : END =======================

// ===================== SPLIT storage_load_initial : START =====================
    const hasStorage =
      window.TurniStorage &&
      typeof TurniStorage.loadTurnazioni === "function" &&
      typeof TurniStorage.saveTurnazioni === "function" &&
      typeof TurniStorage.loadPreferredTurnazioneId === "function" &&
      typeof TurniStorage.savePreferredTurnazioneId === "function";

    let savedTurnazioni = hasStorage ? TurniStorage.loadTurnazioni() : [];
    let preferredId     = hasStorage ? TurniStorage.loadPreferredTurnazioneId() : null;

	    // ----------------------------
	    // Modifica turnazione (stato edit)
	    // ----------------------------
	    let editingIndex = null; // number | null
	    let editingId = null;    // string | null
	    const originalPanelTitle = panelAdd.dataset.settingsTitle || "Aggiungi turnazione";
// ===================== SPLIT storage_load_initial : END =======================

// ===================== SPLIT errors_ui : START =====================
    // ----------------------------
    // Errori
    // ----------------------------
    function clearError() {
      if (!errEl) return;
      if (errorCtl) errorCtl.clear();
      else errEl.hidden = true;
    }

    function showError() {
      if (!errEl) return;
      if (errorCtl) errorCtl.show();
      else {
        errEl.hidden = false;
        setTimeout(() => { errEl.hidden = true; }, 2000);
      }
    }
// ===================== SPLIT errors_ui : END =======================

// ===================== SPLIT helpers_days_ui : START =====================
    // ----------------------------
    // Helpers UI giorni
    // ----------------------------
    // Hook: serve a sincronizzare (abilitare/disabilitare) i "Riposi fissi" (Lun/Mar).
    // Viene riassegnato quando i componenti riposo vengono creati.
    let syncRiposiFissiEnabled = function () {};

    function clampRestDaysAllowed(v) {
      const n = Number(v);
      return (n === 2) ? 2 : 1;
    }

    function normalizeRestIndicesToAllowed() {
      if (restDayIndices.length > restDaysAllowed) {
        restDayIndices = restDayIndices.slice(0, restDaysAllowed);
      }
    }

    function isRestIndex(idx) {
      return restDayIndices.includes(idx);
    }

    function hasAnyRotationRest() {
      // Considera "riposo" valido solo se:
      // - l'indice è marcato come riposo
      // - esiste davvero un turno assegnato a quel giorno
      return Array.isArray(restDayIndices)
        && restDayIndices.some(i => i != null && i >= 0 && i <= 6 && !!rotationSlots[i]);
    }

    function applyDaysUIState(n) {
      const hasDays = !!n && n >= 1 && n <= 7;

      if (subtitleEl) {
        subtitleEl.textContent = hasDays
          ? "Tocca una casella per scegliere il turno"
          : "Nessuna rotazione impostata";
      }

      if (placeholderEl) {
        placeholderEl.style.display = hasDays ? "none" : "block";
        placeholderEl.textContent = "Seleziona da 1 a 7 per visualizzare la rotazione";
      }

      if (grid) {
        grid.style.display = hasDays ? "grid" : "none";
      }

      if (hasDays) {
        restDayIndices = restDayIndices.filter(i => i < n);
      } else {
        restDayIndices = [];
      }

      normalizeRestIndicesToAllowed();
    }

    function applySiglaFontSize(el, txt) {
      if (window.TurniRender && typeof TurniRender.applySiglaFontSize === "function") {
        TurniRender.applySiglaFontSize(el, txt);
      }
    }
// ===================== SPLIT helpers_days_ui : END =======================

// ===================== SPLIT rest_days_card_1_2 : START =====================
    // ----------------------------
    // Card "Giorni di Riposo" (1 / 2)
    // ----------------------------
    function syncRestDaysCardUI() {
      if (!restDaysBtns || !restDaysBtns.length) return;

      restDaysBtns.forEach(btn => {
        const v = clampRestDaysAllowed(btn.dataset.turnazioniRestDays);
        const isActive = (v === restDaysAllowed);
        btn.classList.toggle("is-active", isActive);
        btn.setAttribute("aria-pressed", isActive ? "true" : "false");
      });
    }

    function setRestDaysAllowed(next) {
      restDaysAllowed = clampRestDaysAllowed(next);
      normalizeRestIndicesToAllowed();
      syncRestDaysCardUI();
      syncRestToggleUI();
      renderDaysGrid(rotationDaysCount);
      markDirty();
    }

    if (restDaysBtns && restDaysBtns.length) {
      setRestDaysAllowed(1);
      restDaysBtns.forEach(btn => {
        btn.addEventListener("click", () => {
          const v = btn.dataset.turnazioniRestDays;
          setRestDaysAllowed(v);
        });
      });
    }
// ===================== SPLIT rest_days_card_1_2 : END =======================

// ===================== SPLIT rest_toggle_picker : START =====================
    // ----------------------------
    // Riposo: toggle nel picker
    // ----------------------------
    function syncRestToggleUI() {
      if (!restToggleEl) return;

      const isOn = (activePickIndex !== null && isRestIndex(activePickIndex));
      restToggleEl.classList.toggle("is-on", isOn);
      restToggleEl.setAttribute("aria-checked", isOn ? "true" : "false");
    }

    function setRestForActiveDay(nextOn) {
      if (activePickIndex === null) return;

      if (nextOn) {
        if (!isRestIndex(activePickIndex)) {
          restDayIndices.push(activePickIndex);
          restDayIndices = [...new Set(restDayIndices)];
          while (restDayIndices.length > restDaysAllowed) {
            restDayIndices.shift(); // FIFO
          }
        }
      } else {
        restDayIndices = restDayIndices.filter(i => i !== activePickIndex);
      }

      syncRestToggleUI();
      renderDaysGrid(rotationDaysCount);
      markDirty();
    }

    if (restToggleEl) {
      restToggleEl.addEventListener("click", () => {
        const isOn = restToggleEl.classList.contains("is-on");
        setRestForActiveDay(!isOn);
      });
    }
// ===================== SPLIT rest_toggle_picker : END =======================

// ===================== SPLIT picker_open_setslot : START =====================
    function openPickPanelForDay(index) {
      activePickIndex = index;

      if (pickHint) pickHint.textContent = `Seleziona un turno per il giorno ${index + 1}.`;
      if (restRowEl) restRowEl.style.display = "flex";

      syncRestToggleUI();
      renderPickList();

      if (window.SettingsUI && typeof SettingsUI.openPanel === "function") {
        SettingsUI.openPanel("turnazioni-pick", { internal: true });
      }
    }

    function setSlotFromTurno(index, turnoObj) {
      if (index == null || index < 0 || index > 6) return;
      rotationSlots[index] = turnoObj || null;
      renderDaysGrid(rotationDaysCount);
      markDirty();
    }
// ===================== SPLIT picker_open_setslot : END =======================

// ===================== SPLIT render_pick_list : START =====================
    function renderPickList() {
      if (!pickListEl) return;

      const turni = (window.TurniStorage && typeof TurniStorage.loadTurni === "function")
        ? TurniStorage.loadTurni()
        : [];

      pickListEl.innerHTML = "";

      const hasTurni = Array.isArray(turni) && turni.length > 0;

      if (pickEmpty) pickEmpty.hidden = hasTurni;
      if (!hasTurni) return;

      const selected = (activePickIndex !== null) ? rotationSlots[activePickIndex] : null;

      turni.forEach((t) => {
        const row = document.createElement("button");
        row.type = "button";
        row.className = "turnazioni-pick-row";

        if (selected && sameTurno(selected, t)) {
          row.classList.add("is-selected");
        }

        const name = document.createElement("span");
        name.className = "turnazioni-pick-name";
        name.textContent = t.nome || "";

        row.appendChild(name);

        row.addEventListener("click", () => {
          if (activePickIndex !== null) setSlotFromTurno(activePickIndex, t);

          if (window.SettingsUI && typeof SettingsUI.openPanel === "function") {
            SettingsUI.openPanel("turnazioni-add", { internal: true });
          }
        });

        pickListEl.appendChild(row);
      });
    }
// ===================== SPLIT render_pick_list : END =======================

// ===================== SPLIT render_days_grid : START =====================
    function renderDaysGrid(n) {
      if (!grid) return;

      rotationDaysCount = n || null;
      grid.innerHTML = "";

      for (let i = 1; i <= 7; i++) {
        if (!n || i > n) {
          const ghost = document.createElement("div");
          ghost.style.visibility = "hidden";
          grid.appendChild(ghost);
          continue;
        }

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "turnazioni-day-pill";

        const pill = document.createElement("div");
        pill.className = "turni-sigla-preview-pill";
        pill.style.position = "relative";

        const txt = document.createElement("span");
        txt.className = "turni-sigla-preview-text";

        const slot = rotationSlots[i - 1];

        if (!slot) {
          btn.classList.add("is-empty");
          txt.textContent = String(i);
          applySiglaFontSize(txt, String(i));
          txt.style.color = "";
        } else {
          const siglaVal = (slot.sigla || "").trim();
          txt.textContent = siglaVal;
          applySiglaFontSize(txt, siglaVal);
          txt.style.color = slot.colore ? slot.colore : "";
        }

        pill.appendChild(txt);

        if (isRestIndex(i - 1) && slot) {
          const badge = document.createElement("span");
          badge.className = "turnazioni-rest-badge";
          badge.textContent = "R";
          pill.appendChild(badge);
        }

        btn.appendChild(pill);

        btn.addEventListener("click", () => {
          openPickPanelForDay(i - 1);
        });

        grid.appendChild(btn);
      }

      applyDaysUIState(n);

      // Se non esiste nessun giorno marcato come "Riposo" nella rotazione,
      // i riposi fissi (Lun/Mar) devono essere bloccati.
      if (typeof syncRiposiFissiEnabled === "function") syncRiposiFissiEnabled();
    }
// ===================== SPLIT render_days_grid : END =======================

// ===================== SPLIT riposo_cards_component : START =====================
    // ----------------------------
    // Riposo cards component (riuso del tuo componente)
    // ----------------------------
    let riposo1Reset = null;
    let riposo2Reset = null;
    let riposo1GetData = null;
    let riposo2GetData = null;
    let riposo1SetData = null;
    let riposo2SetData = null;

    function initRiposoCard(opts) {
      const {
        cardSel,
        toggleSel,
        bodySel,
        helpBtnSel,
        helpToastSel,
        inputNomeSel,
        inputSiglaSel,
        colorInputSel,
        colorPrevSel,
        siglaPrevSel,
        isEnabledFn,
        disabledHintText
      } = opts || {};

      const cardEl    = panelAdd.querySelector(cardSel);
      const toggleBtn = panelAdd.querySelector(toggleSel);
      const bodyEl    = panelAdd.querySelector(bodySel);

      const helpBtn   = panelAdd.querySelector(helpBtnSel);
      const helpToast = panelAdd.querySelector(helpToastSel);

      const inputNome  = panelAdd.querySelector(inputNomeSel);
      const inputSigla = panelAdd.querySelector(inputSiglaSel);

      const colorInput = panelAdd.querySelector(colorInputSel);
      const colorPrev  = panelAdd.querySelector(colorPrevSel);
      const siglaPrev  = panelAdd.querySelector(siglaPrevSel);

      if (!cardEl || !toggleBtn || !bodyEl) {
        return {
          reset: function () {},
          getData: function () { return null; },
          setData: function () {},
          syncEnabled: function () {}
        };
      }

      // Hint visibile solo quando disabilitato (mancano "Riposi" nella rotazione)
      const headerEl = cardEl.querySelector(".turnazioni-riposo-header");
      let disabledHintEl = cardEl.querySelector("[data-turnazioni-riposo-disabled-hint]");
      if (!disabledHintEl) {
        disabledHintEl = document.createElement("p");
        disabledHintEl.className = "turnazioni-riposo-disabled-hint";
        disabledHintEl.setAttribute("data-turnazioni-riposo-disabled-hint", "");
        // Inseriscilo subito sotto l'header, prima del body (così sta "sotto il titolo")
        if (headerEl && headerEl.parentNode) {
          headerEl.insertAdjacentElement("afterend", disabledHintEl);
        } else {
          cardEl.insertBefore(disabledHintEl, bodyEl);
        }
      }
      disabledHintEl.textContent = disabledHintText || "Nessun turno impostato come Riposo in Turni Rotazione";

      let on = false;

      function isEnabled() {
        return (typeof isEnabledFn === "function") ? !!isEnabledFn() : true;
      }

      function applyColorPreview() {
        if (!colorInput || !colorPrev || !siglaPrev) return;
        const v = colorInput.value || "#0a84ff";
        colorPrev.style.backgroundColor = v;
        siglaPrev.style.color = v;
      }

      function updateSiglaPreview() {
        if (!siglaPrev || !inputSigla) return;
        const txt = (inputSigla.value || "").trim();
        siglaPrev.textContent = txt || "";
        applySiglaFontSize(siglaPrev, txt);
      }

      function clearFields() {
        if (inputNome)  inputNome.value = "";
        if (inputSigla) inputSigla.value = "";
        if (siglaPrev)  siglaPrev.textContent = "";

        if (colorInput) colorInput.value = "#0a84ff";
        applyColorPreview();
        updateSiglaPreview();
      }

      function applyState() {
        const enabled = isEnabled();

        // Se disabilitato, forziamo OFF (così non rimangono stati "fantasma")
        if (!enabled && on) {
          on = false;
          clearFields();
        }

        toggleBtn.classList.toggle("is-on", on);
        toggleBtn.setAttribute("aria-checked", on ? "true" : "false");
        toggleBtn.setAttribute("aria-disabled", enabled ? "false" : "true");
        toggleBtn.disabled = !enabled;
        toggleBtn.classList.toggle("is-disabled", !enabled);

        cardEl.classList.toggle("is-on", on);
        cardEl.classList.toggle("is-disabled", !enabled);

        // Il testo lo fa vedere/nascondere la CSS via .is-disabled
        if (disabledHintEl) {
          disabledHintEl.textContent = disabledHintText || "Nessun turno impostato come Riposo in Turni Rotazione";
        }

        bodyEl.hidden = !on;
      }

      function syncEnabled() {
        applyState();
      }

      function reset() {
        on = false;
        clearFields();
        applyState();
      }

      function getData() {
        if (!on) return null;

        const nome = (inputNome && inputNome.value ? inputNome.value : "").trim();
        const sigla = (inputSigla && inputSigla.value ? inputSigla.value : "").trim();
        const colore = (colorInput && colorInput.value ? colorInput.value : "").trim();

        // Se non c’è almeno la sigla, non ha senso salvarlo/mostrarlo
        if (!sigla) return null;

        return { nome, sigla, colore };
      }

      // Serve per ricaricare lo stato quando entri in "Modifica turnazione"
      function setData(data) {
        if (!data) {
          reset();
          return;
        }

        // Se al momento non è consentito usare i riposi fissi, ignora (forza OFF)
        if (!isEnabled()) {
          reset();
          return;
        }

        on = true;

        const nome = (data && typeof data.nome === "string") ? data.nome : "";
        const sigla = (data && typeof data.sigla === "string") ? data.sigla : "";
        const colore = (data && typeof data.colore === "string") ? data.colore : "";

        if (inputNome) inputNome.value = nome;
        if (inputSigla) inputSigla.value = sigla;

        if (colorInput) colorInput.value = colore || "#0a84ff";
        applyColorPreview();
        updateSiglaPreview();
        applyState();
      }

      bodyEl.hidden = true;
      reset();

      toggleBtn.addEventListener("click", () => {
        if (!isEnabled()) return;
        on = !on;
        markDirty();
        if (!on) clearFields();
        applyState();
      });

      if (colorInput) {
        colorInput.addEventListener("input", () => { markDirty(); applyColorPreview(); });
        colorInput.addEventListener("change", () => { markDirty(); applyColorPreview(); });
      }

      if (inputSigla) {
        inputSigla.addEventListener("input", () => {
          markDirty();
          updateSiglaPreview();
        });
      }

      if (inputNome) inputNome.addEventListener("input", markDirty);

      if (helpBtn && helpToast) {
        let t = null;
        function showToast() {
          helpToast.hidden = false;
          if (t) clearTimeout(t);
          t = setTimeout(() => {
            helpToast.hidden = true;
            t = null;
          }, 3000);
        }
        helpBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          showToast();
        });
      }

      return { reset, getData, setData, syncEnabled };
    }

    const riposo1 = initRiposoCard({
      cardSel:      "[data-turnazioni-riposo-card]",
      toggleSel:    "[data-turnazioni-riposo-toggle]",
      bodySel:      "[data-turnazioni-riposo-body]",
      helpBtnSel:   "[data-turnazioni-help]",
      helpToastSel: "[data-turnazioni-help-toast]",
      inputNomeSel: "#turnazioniRiposoNome",
      inputSiglaSel:"#turnazioniRiposoSigla",
      colorInputSel:"[data-turnazioni-riposo-color]",
      colorPrevSel: "[data-turnazioni-riposo-color-preview]",
      siglaPrevSel: "[data-turnazioni-riposo-sigla-preview]",
      isEnabledFn:  hasAnyRotationRest,
      disabledHintText: "Nessun turno impostato come Riposo in Turni Rotazione"
    });

    const riposo2 = initRiposoCard({
      cardSel:      "[data-turnazioni-riposo2-card]",
      toggleSel:    "[data-turnazioni-riposo2-toggle]",
      bodySel:      "[data-turnazioni-riposo2-body]",
      helpBtnSel:   "[data-turnazioni-help2]",
      helpToastSel: "[data-turnazioni-help-toast2]",
      inputNomeSel: "#turnazioniRiposo2Nome",
      inputSiglaSel:"#turnazioniRiposo2Sigla",
      colorInputSel:"[data-turnazioni-riposo2-color]",
      colorPrevSel: "[data-turnazioni-riposo2-color-preview]",
      siglaPrevSel: "[data-turnazioni-riposo2-sigla-preview]",
      isEnabledFn:  hasAnyRotationRest,
      disabledHintText: "Nessun turno impostato come Riposo in Turni Rotazione"
    });

    // Aggancia hook globale usato da renderDaysGrid()
    syncRiposiFissiEnabled = function () {
      if (riposo1 && typeof riposo1.syncEnabled === "function") riposo1.syncEnabled();
      if (riposo2 && typeof riposo2.syncEnabled === "function") riposo2.syncEnabled();
    };

    // Prima sync (utile in apertura pannello / reset)
    if (typeof syncRiposiFissiEnabled === "function") syncRiposiFissiEnabled();

    riposo1Reset = riposo1 && typeof riposo1.reset === "function" ? riposo1.reset : null;
    riposo2Reset = riposo2 && typeof riposo2.reset === "function" ? riposo2.reset : null;

    riposo1GetData = riposo1 && typeof riposo1.getData === "function" ? riposo1.getData : null;
    riposo2GetData = riposo2 && typeof riposo2.getData === "function" ? riposo2.getData : null;

    riposo1SetData = riposo1 && typeof riposo1.setData === "function" ? riposo1.setData : null;
    riposo2SetData = riposo2 && typeof riposo2.setData === "function" ? riposo2.setData : null;
// ===================== SPLIT riposo_cards_component : END =======================


// ===================== SPLIT reset_form : START =====================
    // ----------------------------
    // Reset form
    // ----------------------------
    function resetTurnazioneForm() {
      clearError();

      if (nameInput) nameInput.value = "";
      if (input) input.value = "";
      if (select) select.value = "";

      rotationDaysCount = null;
      rotationSlots = new Array(7).fill(null);
      restDayIndices = [];
      restDaysAllowed = 1;
      syncRestDaysCardUI();

      renderDaysGrid(null);

      if (typeof riposo1Reset === "function") riposo1Reset();
      if (typeof riposo2Reset === "function") riposo2Reset();

      isDirty = false;
    }

	    function clearEditContext() {
	      editingIndex = null;
	      editingId = null;
	      // ripristina titolo pannello
	      panelAdd.dataset.settingsTitle = originalPanelTitle;
	    }

	    function enterEditTurnazione(turnazione, index) {
	      if (!turnazione) return;
	      editingIndex = (typeof index === "number") ? index : null;
	      editingId = turnazione && turnazione.id != null ? String(turnazione.id) : null;
	      panelAdd.dataset.settingsTitle = "Modifica turnazione";

	      clearError();

	      // nome
	      if (nameInput) nameInput.value = (turnazione.name || "");

	      // giorni
	      const days = Number(turnazione.days) || null;
	      rotationDaysCount = days;
	      if (select) select.value = days ? String(days) : "";
	      if (input) input.value = days ? String(days) : "";

	      // slots
	      rotationSlots = new Array(7).fill(null);
	      const slots = Array.isArray(turnazione.slots) ? turnazione.slots : [];
	      for (let i = 0; i < (days || 0); i++) {
	        const s = slots[i];
	        rotationSlots[i] = s ? {
	          nome: s.nome || "",
	          sigla: s.sigla || "",
	          colore: s.colore || ""
	        } : null;
	      }

	      // riposi
	      restDaysAllowed = clampRestDaysAllowed(turnazione.restDaysAllowed);
	      restDayIndices = Array.isArray(turnazione.restIndices)
	        ? turnazione.restIndices.slice(0, restDaysAllowed)
	        : [];
	      normalizeRestIndicesToAllowed();
	      syncRestDaysCardUI();

        // riposi fissi (Lun/Mar): NON resettare, ricarica da storage
        const rf = (turnazione && turnazione.riposiFissi && typeof turnazione.riposiFissi === "object")
          ? turnazione.riposiFissi
          : null;

        if (typeof riposo1SetData === "function") {
          riposo1SetData(rf && rf.lunedi ? rf.lunedi : null);
        } else if (typeof riposo1Reset === "function") {
          riposo1Reset();
        }

        if (typeof riposo2SetData === "function") {
          riposo2SetData(rf && rf.martedi ? rf.martedi : null);
        } else if (typeof riposo2Reset === "function") {
          riposo2Reset();
        }

	      renderDaysGrid(days);
	      isDirty = false;
	    }

	    // funzioni esportate (dopo init)
	    openEditTurnazioneImpl = function (turnazione, index) {
	      enterEditTurnazione(turnazione, index);
	      if (window.SettingsUI && typeof SettingsUI.openPanel === "function") {
	        SettingsUI.openPanel("turnazioni-add", { internal: true });
	      }
	    };
	    clearEditTurnazioneImpl = function () {
	      clearEditContext();
	    };


// ===================== SPLIT reset_form : END =======================

// ===================== SPLIT validate_and_payload : START =====================
    // ----------------------------
    // Validazione + payload
    // ----------------------------
    function validateTurnazione() {
      const name = (nameInput && nameInput.value ? nameInput.value : "").trim();
      const days = Number(rotationDaysCount);

      if (!name) return { ok: false, msg: "nome" };
      if (!days || days < 1 || days > 7) return { ok: false, msg: "giorni" };

      for (let i = 0; i < days; i++) {
        if (!rotationSlots[i]) return { ok: false, msg: "turni" };
      }

      return { ok: true, name, days };
    }

	    function buildPayload(name, days, idOverride) {
      const slots = [];
      for (let i = 0; i < days; i++) {
        const s = rotationSlots[i];
        slots.push({
          nome:   s && s.nome   ? s.nome   : "",
          sigla:  s && s.sigla  ? s.sigla  : "",
          colore: s && s.colore ? s.colore : ""
        });
      }

      const lun = (typeof riposo1GetData === "function") ? riposo1GetData() : null;
      const mar = (typeof riposo2GetData === "function") ? riposo2GetData() : null;

      const riposiFissi = {};
      if (lun) riposiFissi.lunedi = lun;
      if (mar) riposiFissi.martedi = mar;

	      return {
	        id: (idOverride != null) ? String(idOverride) : String(Date.now()),
        name,
        days,
        slots,
        restDaysAllowed,
        restIndices: restDayIndices.slice(0, restDaysAllowed),
        riposiFissi: (Object.keys(riposiFissi).length ? riposiFissi : null)
      };
    }
// ===================== SPLIT validate_and_payload : END =======================


// ===================== SPLIT save_click_handler : START =====================
    if (btnSave) {
      btnSave.addEventListener("click", () => {
        clearError();

        if (!hasStorage) {
          showError();
          return;
        }

        const v = validateTurnazione();
        if (!v.ok) {
          showError();
          return;
        }

	        // Se sto modificando: sovrascrivi l'elemento (stesso id)
	        const payload = buildPayload(v.name, v.days, editingId);

	        savedTurnazioni = TurniStorage.loadTurnazioni();
	        if (editingIndex !== null && editingIndex >= 0 && editingIndex < savedTurnazioni.length) {
	          savedTurnazioni[editingIndex] = payload;
	        } else {
	          savedTurnazioni.push(payload);
	        }
	        TurniStorage.saveTurnazioni(savedTurnazioni);

	        // preferita: resta quella modificata/aggiunta
	        preferredId = String(payload.id);
	        TurniStorage.savePreferredTurnazioneId(preferredId);

        lastSaveTs = Date.now();
        isDirty = false;

	        // aggiorna lista e hint (preserva modalità modifica lista se serve)
	        if (window.TurnazioniList) {
	          TurnazioniList.refresh();
	        }

	        // dopo salvataggio: esci da Modifica (lista) e resetta contesto edit
	        if (window.Turnazioni && typeof Turnazioni.exitEditMode === "function") {
	          Turnazioni.exitEditMode();
	        }
	        clearEditContext();
	        resetTurnazioneForm();

        if (window.SettingsUI && typeof SettingsUI.openPanel === "function") {
          SettingsUI.openPanel("turni", { internal: true });
        }
      });
    }
// ===================== SPLIT save_click_handler : END =======================

// ===================== SPLIT init_add_ui_bindings : START =====================
    // ----------------------------
    // Stato iniziale UI add
    // ----------------------------
    if (select && input && grid) {
      renderDaysGrid(null);

      if (nameInput) nameInput.addEventListener("input", markDirty);

      // Desktop select
      select.addEventListener("change", () => {
        markDirty();

        const v = Number(select.value) || null;
        input.value = select.value;

        if (v && v >= 1 && v <= 7) {
          for (let k = v; k < 7; k++) rotationSlots[k] = null;
          restDayIndices = restDayIndices.filter(i => i < v);
          normalizeRestIndicesToAllowed();
        } else {
          rotationSlots = new Array(7).fill(null);
          restDayIndices = [];
        }

        renderDaysGrid(v);
      });

      // Mobile input
      input.addEventListener("input", () => {
        const digits = (input.value || "").replace(/\D/g, "");
        const last = digits.slice(-1);
        const v = Number(last);

        if (!v || v < 1 || v > 7) {
          markDirty();

          input.value = "";
          if (select) select.value = "";
          rotationSlots = new Array(7).fill(null);
          restDayIndices = [];
          renderDaysGrid(null);
          return;
        }

        markDirty();

        input.value = last;
        if (select) select.value = last;

        for (let k = v; k < 7; k++) rotationSlots[k] = null;
        restDayIndices = restDayIndices.filter(i => i < v);
        normalizeRestIndicesToAllowed();

        renderDaysGrid(v);
      });
    }
// ===================== SPLIT init_add_ui_bindings : END =======================

// ===================== SPLIT settings_onchange_reset_guard : START =====================
    // ----------------------------
    // RESET quando esci da "turnazioni-add" senza salvare
    // (usiamo SettingsUI.onChange invece di MutationObserver)
    // ----------------------------
    if (window.SettingsUI && typeof SettingsUI.onChange === "function") {
      SettingsUI.onChange((prevId, nextId) => {
        if (prevId === "turnazioni-add" && nextId !== "turnazioni-add") {
          const justSaved = (Date.now() - lastSaveTs) < 800;

          // se vai al picker: non resettare
          if (nextId === "turnazioni-pick") return;

	          if (!justSaved) {
	            // Nessun salvataggio: nessuna modifica, esco dalla modalità Modifica
	            resetTurnazioneForm();
	            clearEditContext();
	            if (window.Turnazioni && typeof Turnazioni.exitEditMode === "function") {
	              Turnazioni.exitEditMode();
	            }
	          }
        }
      });
    }
// ===================== SPLIT settings_onchange_reset_guard : END =======================

// ===================== SPLIT turnazioni_list_init_fallback : START =====================
    // init lista turnazioni se esiste modulo list (così non dipende dall’ordine)
    if (window.TurnazioniList && typeof TurnazioniList.init === "function") {
      TurnazioniList.init({
        panelTurni,
        turnazioniListEl,
        turnazioniEmptyEl,
        visualHintEl,
        // Se Turnazioni.init non viene chiamato (ordine init / cache / ecc.),
        // senza passare questo ref il render non può abilitare il pulsante.
        turnazioniEditBtn: panelTurni ? panelTurni.querySelector("[data-turnazioni-edit]") : null
      });
    } else {
      // fallback: almeno niente crash
    }
// ===================== SPLIT turnazioni_list_init_fallback : END =======================

  }
// ===================== SPLIT initTurnazioniAddUI_close : START =====================
	  window.TurnazioniAdd = {
	    init: initTurnazioniAddUI,
	    openEdit: function (turnazione, index) {
	      if (typeof openEditTurnazioneImpl === "function") {
	        openEditTurnazioneImpl(turnazione, index);
	      }
	    },
	    clearEdit: function () {
	      if (typeof clearEditTurnazioneImpl === "function") {
	        clearEditTurnazioneImpl();
	      }
	    }
	  };
// ===================== SPLIT initTurnazioniAddUI_close : END =======================

})();

// ============================
// Orchestratore Turnazioni:
// collapse card
// open pannello add
// init lista + init add/picker
// turnazioni.js v 1.0
// ============================

(function () {
  // ===================== SPLIT module-shell : START =====================
  const Turnazioni = {
    _setCollapsed: null,
	  _exitEditMode: null,
	  exitEditMode() {
	    if (typeof this._exitEditMode === "function") this._exitEditMode();
	  },

    init(ctx) {
      // ===================== SPLIT init-context : START =====================
      const {
        panelTurni,
        turnazioniCard,
        turnazioniToggleBtn,
        turnazioniHeader,
        turnazioniAddBtn,
        turnazioniEditBtn,
        visualHintEl
      } = ctx || {};
      // ===================== SPLIT init-context : END   =====================

      // ===================== SPLIT guard-missing-panel : START =====================
      if (!panelTurni) {
        // anche se manca la card, l’UI add può esistere
        if (window.TurnazioniAdd && typeof TurnazioniAdd.init === "function") {
          TurnazioniAdd.init(ctx);
        }
        return;
      }
      // ===================== SPLIT guard-missing-panel : END   =====================

      // ===================== SPLIT dom-query : START =====================
      const turnazioniListEl = panelTurni.querySelector("[data-turnazioni-list]");
      const turnazioniEmpty  = panelTurni.querySelector("[data-turnazioni-empty-hint]");
      // ===================== SPLIT dom-query : END   =====================

      // ===================== SPLIT state-collapsed : START =====================
      // Stato iniziale
      let turnazioniCollapsed = turnazioniCard
        ? turnazioniCard.classList.contains("is-collapsed")
        : true;

      function getCollapsed() { return turnazioniCollapsed; }
      function setCollapsed(v) { turnazioniCollapsed = !!v; }
      // ===================== SPLIT state-collapsed : END   =====================

      // ===================== SPLIT collapse-behavior : START =====================
      // Collapse behavior
      if (turnazioniCard && turnazioniToggleBtn) {
        if (window.TurniInteractions && typeof TurniInteractions.attachCollapsibleCard === "function") {
          TurniInteractions.attachCollapsibleCard({
  cardEl: turnazioniCard,
  toggleBtn: turnazioniToggleBtn,
  headerEl: turnazioniHeader,
  getCollapsed,
  setCollapsed,
  ignoreClickSelectors: ["[data-turnazioni-add]", "[data-turnazioni-toggle]", "[data-turnazioni-edit]"],
  onCollapse: (collapsed) => {
    // ✅ come "Modifica turni": se chiudi la card, esci da Modifica
    if (collapsed && isEditing) {
      isEditing = false;
      refreshList();
    }
  }
});

        } else {
          function apply() {
            turnazioniCard.classList.toggle("is-collapsed", turnazioniCollapsed);
            turnazioniToggleBtn.setAttribute("aria-expanded", turnazioniCollapsed ? "false" : "true");
          }
          apply();
          turnazioniToggleBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  turnazioniCollapsed = !turnazioniCollapsed;

  // ✅ reset edit quando collassi
  if (turnazioniCollapsed && isEditing) {
    isEditing = false;
    refreshList();
  }

  apply();
});

        }
      }
      // ===================== SPLIT collapse-behavior : END   =====================

      // ===================== SPLIT open-add-panel : START =====================
      // Add -> pannello turnazioni-add
      if (turnazioniAddBtn) {
        turnazioniAddBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          if (window.SettingsUI && typeof SettingsUI.openPanel === "function") {
            SettingsUI.openPanel("turnazioni-add", { internal: true });
          }
        });
      }
      // ===================== SPLIT open-add-panel : END   =====================

	      // ===================== SPLIT edit-mode-state : START =====================
	      let isEditing = false;
	      const getEditing = () => isEditing;
	      const setEditing = (v) => { isEditing = !!v; };

	      const loadTurnazioni = () => (
	        window.TurniStorage && typeof TurniStorage.loadTurnazioni === "function"
	          ? TurniStorage.loadTurnazioni()
	          : []
	      );

	      const saveTurnazioni = (next) => {
	        if (window.TurniStorage && typeof TurniStorage.saveTurnazioni === "function") {
	          TurniStorage.saveTurnazioni(next);
	        }
	      };

	      const normalizePreferredAfterDelete = (nextList) => {
	        if (!window.TurniStorage || typeof TurniStorage.loadPreferredTurnazioneId !== "function") return;
	        if (typeof TurniStorage.savePreferredTurnazioneId !== "function") return;

	        const preferredId = TurniStorage.loadPreferredTurnazioneId();
	        const has = Array.isArray(nextList) && nextList.length > 0;
	        if (!has) {
	          TurniStorage.savePreferredTurnazioneId(null);
	          return;
	        }

	        if (preferredId && nextList.some(t => String(t.id) === String(preferredId))) return;
	        TurniStorage.savePreferredTurnazioneId(String(nextList[nextList.length - 1].id));
	      };

	      const refreshList = () => {
	        if (window.TurnazioniList && typeof TurnazioniList.refresh === "function") {
	          TurnazioniList.refresh({
	            isEditing,
	            onDelete: (index) => {
	              const list = loadTurnazioni();
	              if (!Array.isArray(list) || !list[index]) return;
	              list.splice(index, 1);
	              saveTurnazioni(list);
	              normalizePreferredAfterDelete(list);
	              if (!list.length) setEditing(false);
	              refreshList();
	            }
	          });
	        }
	      };
	      // ===================== SPLIT edit-mode-state : END   =====================

	      // ===================== SPLIT init-list-and-add : START =====================
	      // Init lista + add
	      if (window.TurnazioniList && typeof TurnazioniList.init === "function") {
	        TurnazioniList.init({
	          panelTurni,
	          turnazioniListEl,
	          turnazioniEmptyEl: turnazioniEmpty,
	          visualHintEl,
	          turnazioniEditBtn
	        });
	      }

	      if (window.TurnazioniAdd && typeof TurnazioniAdd.init === "function") {
	        TurnazioniAdd.init({
          panelTurni,
          turnazioniListEl,
          turnazioniEmptyEl: turnazioniEmpty,
          visualHintEl
        });
      }
      // ===================== SPLIT init-list-and-add : END   =====================

	      // ===================== SPLIT interactions-edit-drag : START =====================
	      // Toggle Modifica
	      if (turnazioniEditBtn && window.TurniInteractions && typeof TurniInteractions.attachEditToggle === "function") {
	        TurniInteractions.attachEditToggle({
	          btnEdit: turnazioniEditBtn,
	          getEditing,
	          setEditing,
	          canEdit: () => {
	            const list = loadTurnazioni();
	            return Array.isArray(list) && list.length > 0;
	          },
	          refresh: refreshList
	        });
	      } else if (turnazioniEditBtn) {
	        // fallback minimale
	        turnazioniEditBtn.addEventListener("click", (e) => {
	          e.stopPropagation();
	          const list = loadTurnazioni();
	          if (!Array.isArray(list) || !list.length) return;
	          isEditing = !isEditing;
	          refreshList();
	        });
	      }

	      // Click riga in modalità Modifica = apri pannello Modifica turnazione
	      if (turnazioniListEl && window.TurniInteractions && typeof TurniInteractions.attachRowEditClick === "function") {
	        TurniInteractions.attachRowEditClick({
	          listEl: turnazioniListEl,
	          getEditing,
	          onEditRow: (index) => {
	            const list = loadTurnazioni();
	            const t = list && list[index] ? list[index] : null;
	            if (!t) return;
	            if (window.TurnazioniAdd && typeof TurnazioniAdd.openEdit === "function") {
	              TurnazioniAdd.openEdit(t, index);
	            }
	          }
	        });
	      }

	      // Drag sort (solo in Modifica)
	      if (turnazioniListEl && window.TurniInteractions && typeof TurniInteractions.attachDragSort === "function") {
	        TurniInteractions.attachDragSort({
	          listEl: turnazioniListEl,
	          getEditing,
	          getItems: () => loadTurnazioni(),
	          setItems: () => {},
	          saveItems: (next) => {
	            saveTurnazioni(next);
	          },
	          refresh: refreshList
	        });
	      }
	
	      // Uscita automatica da Modifica quando esci dal pannello Turni o cambi sezione
	      if (window.SettingsUI && typeof SettingsUI.onChange === "function") {
	        SettingsUI.onChange((prevId, nextId) => {
	          // se esco dal pannello turni o entro in qualsiasi altra cosa non-interna, tolgo Modifica
	          if (prevId === "turni" && nextId !== "turni") {
	            if (isEditing) {
	              isEditing = false;
	              refreshList();
	            }
	          }
	        });
	      }
	      // ===================== SPLIT interactions-edit-drag : END   =====================

	      // render iniziale coerente con Turni (pulsante Modifica + selezione)
	      refreshList();

	      // espongo uscita da Modifica (usata quando cambi tab o torni indietro)
	      this._exitEditMode = () => {
	        if (!isEditing) return;
	        isEditing = false;
	        refreshList();
	      };

      // ===================== SPLIT api-set-collapsed : START =====================
      this._setCollapsed = (v) => {
        turnazioniCollapsed = !!v;
        if (turnazioniCard && turnazioniToggleBtn) {
          turnazioniCard.classList.toggle("is-collapsed", turnazioniCollapsed);
          turnazioniToggleBtn.setAttribute("aria-expanded", turnazioniCollapsed ? "false" : "true");
        }
      };
      // ===================== SPLIT api-set-collapsed : END   =====================
    }
  };
  // ===================== SPLIT module-shell : END   =====================

  // ===================== SPLIT export-global : START =====================
  window.Turnazioni = Turnazioni;
  // ===================== SPLIT export-global : END   =====================
})();
// ============================
// Feature "Turno iniziale" (separata da turni.js)
// - summary in card
// - pannelli turni-start e turni-start-pick
// - gating: richiede turnazione preferita
// turni-start.js v 1.0
// ============================

(function () {

  // ===================== SPLIT util_format_date : START =====================
  function formatDateShortISO(iso) {
    if (!iso || typeof iso !== "string") return "";
    const d = new Date(iso + "T00:00:00");
    if (Number.isNaN(d.getTime())) return "";
    try {
      return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
    } catch {
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yy = String(d.getFullYear());
      return `${dd}/${mm}/${yy}`;
    }
  }

    // ===================== SPLIT util_today_iso : START =====================
  function getTodayISO() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  // ===================== SPLIT util_today_iso : END   =====================

  // ===================== SPLIT start_defaults : START =====================
  function applyStartDefaultsIfEmpty() {
    if (!canUse()) return;

    const dateOk = !!(startDraft.date && String(startDraft.date).trim());
    const slotOk = Number.isInteger(startDraft.slotIndex);

    // Richiesta: default SOLO se non c'è né data né turno
    if (dateOk || slotOk) return;

    const t = getPreferredTurnazione();
    if (!t) return;

    const days = Number(t.days) || 0;
    const slots = Array.isArray(t.slots) ? t.slots : [];

    if (!days || !slots.length) return;

    startDraft.date = getTodayISO();
    startDraft.slotIndex = 0; // primo turno della turnazione selezionata
  }
  // ===================== SPLIT start_defaults : END =====================

  // ===================== SPLIT util_format_date : END   =====================

  // ===================== SPLIT storage_preferred_turnazione : START =====================
  function getPreferredTurnazione() {
    if (!window.TurniStorage) return null;
    const { loadTurnazioni, loadPreferredTurnazioneId } = TurniStorage;

    const all = (typeof loadTurnazioni === "function") ? loadTurnazioni() : [];
    if (!Array.isArray(all) || all.length === 0) return null;

    let pref = null;
    const prefId = (typeof loadPreferredTurnazioneId === "function")
      ? loadPreferredTurnazioneId()
      : null;

    if (prefId) {
      pref = all.find(t => String(t.id) === String(prefId)) || null;
    }
    if (!pref) pref = all[all.length - 1];
    return pref || null;
  }

  function canUse() {
    return !!getPreferredTurnazione();
  }
  // ===================== SPLIT storage_preferred_turnazione : END   =====================


// ===================== SPLIT dom_refs_state : START =====================
let startRowBtn = null;
let startSummaryEl = null;
let startChevronEl = null;

let panelStart = null;
let panelStartPick = null;

let startDateInput = null;
let startTurnoRow = null;
let startTurnoSummary = null;

// toolbar (Salva)
let startSaveBtn = null;
let startErrEl = null;
let startErrCtl = null;

// draft non salvata (diventa persistente solo con "Salva")
let startDraft = { date: "", slotIndex: null };
let isDirty = false;

let startPickList = null;
let startPickEmpty = null;

// visibilità condizionata dal toggle “visualizza turnazione”
let visibleByToggle = true;
// ===================== SPLIT dom_refs_state : END   =====================


  // ===================== SPLIT ui_enable_row : START =====================
  function setStartRowEnabled(enabled) {
    if (!startRowBtn) return;
    startRowBtn.classList.toggle("is-disabled", !enabled);
    startRowBtn.setAttribute("aria-disabled", enabled ? "false" : "true");
    if (startChevronEl) startChevronEl.style.display = enabled ? "" : "none";
  }
  // ===================== SPLIT ui_enable_row : END   =====================


// ===================== SPLIT summary_builders : START =====================
function buildStartSummaryText() {
  if (!window.TurniStorage) return "";
  const { loadTurnoIniziale } = TurniStorage;

  const cfg = (typeof loadTurnoIniziale === "function")
    ? loadTurnoIniziale()
    : { date: "", slotIndex: null };

  const dateTxt = cfg.date ? formatDateShortISO(cfg.date) : "";

  const t = getPreferredTurnazione();
  const slotIndex = Number.isInteger(cfg.slotIndex) ? cfg.slotIndex : null;

  let turnoTxt = "";
  if (t && slotIndex !== null && slotIndex >= 0) {
    const slots = Array.isArray(t.slots) ? t.slots : [];
    const s = slots[slotIndex] || null;
    const sigla = s && s.sigla ? String(s.sigla).trim() : "";
    turnoTxt = sigla;
  }

  if (dateTxt && turnoTxt) return `${dateTxt} · ${turnoTxt}`;
  if (dateTxt) return dateTxt;
  if (turnoTxt) return turnoTxt;
  return "";
}

function syncSummaryUI() {
  const ok = canUse();

  // summary nella card "Visualizza turnazione" usa SEMPRE il valore salvato
  const txt = ok ? buildStartSummaryText() : "";
  if (startSummaryEl) startSummaryEl.textContent = txt;

  // nel pannello "Inizio Turnazione" mostriamo il draft (anche non salvato)
  if (startTurnoSummary) {
    if (!ok) {
      startTurnoSummary.textContent = "";
    } else {
      const t = getPreferredTurnazione();
      const idx = Number.isInteger(startDraft.slotIndex) ? startDraft.slotIndex : null;

      let turnoTxt = "";
      if (t && idx !== null) {
        const slots = Array.isArray(t.slots) ? t.slots : [];
        const s = slots[idx] || null;
        const nome = s && s.nome ? String(s.nome).trim() : "";
        turnoTxt = nome;
      }
      startTurnoSummary.textContent = turnoTxt;
    }
  }

  // stato pulsante Salva
  if (startSaveBtn) {
    const canSave = ok;
    startSaveBtn.disabled = !canSave;
    startSaveBtn.classList.toggle("is-disabled", !canSave);
  }

  setStartRowEnabled(ok);
}
// ===================== SPLIT summary_builders : END   =====================


// ===================== SPLIT start_draft_helpers : START =====================
function setDirty(v) {
  isDirty = !!v;
}

function showStartError() {
  if (!startErrEl) return;
  if (startErrCtl) startErrCtl.show();
  else startErrEl.hidden = false;
}

function clearStartError() {
  if (!startErrEl) return;
  if (startErrCtl) startErrCtl.clear();
  else startErrEl.hidden = true;
}

function syncPanelDraftUI() {
  if (!panelStart) return;
  if (startDateInput) startDateInput.value = startDraft.date || "";

  // label turno nel pannello
  if (startTurnoSummary) {
    if (!canUse()) {
      startTurnoSummary.textContent = "";
    } else {
      const t = getPreferredTurnazione();
      let turnoTxt = "";
      if (t && Number.isInteger(startDraft.slotIndex)) {
        const slots = Array.isArray(t.slots) ? t.slots : [];
        const s = slots[startDraft.slotIndex] || null;
        const nome = s && s.nome ? String(s.nome).trim() : "";
        turnoTxt = nome;
      }
      startTurnoSummary.textContent = turnoTxt;
    }
  }

  if (startSaveBtn) {
    const canSave = canUse();
    startSaveBtn.disabled = !canSave;
    startSaveBtn.classList.toggle("is-disabled", !canSave);
  }
}
// ===================== SPLIT start_draft_helpers : END   =====================


// ===================== SPLIT navigation_open_panel : START =====================
function openPanelStart() {
  if (!panelStart) return;
  if (!canUse()) return;

  // carica da storage e azzera dirty
  startDraft = TurniStorage.loadTurnoIniziale();
  if (!startDraft || typeof startDraft !== "object") startDraft = { date: "", slotIndex: null };
  setDirty(false);
  clearStartError();

  // ✅ default automatici: oggi + primo turno (solo se entrambi vuoti)
  applyStartDefaultsIfEmpty();

  syncPanelDraftUI();


  // aggiorna anche la riga riepilogo (quella resta sul valore salvato)
  syncSummaryUI();

  if (window.SettingsUI && typeof SettingsUI.openPanel === "function") {
    SettingsUI.openPanel("turni-start", { internal: true });
  }
}
// ===================== SPLIT navigation_open_panel : END   =====================



// ===================== SPLIT pick_list_render : START =====================
function renderPickList() {
  if (!startPickList) return;

  const t = getPreferredTurnazione();
  startPickList.innerHTML = "";

  // usa la draft se esiste (così la selezione resta visibile anche prima del "Salva")
  const selectedIndex = Number.isInteger(startDraft.slotIndex) ? startDraft.slotIndex : null;

  const has = !!t && (Number(t.days) || 0) > 0 && Array.isArray(t.slots);

  if (startPickEmpty) startPickEmpty.hidden = has;
  if (!has) return;

  const days = Number(t.days) || 0;
  const slots = Array.isArray(t.slots) ? t.slots : [];

  for (let i = 0; i < days; i++) {
    const s = slots[i] || {};
    const sigla = s.sigla ? String(s.sigla).trim() : "";
    const nome  = s.nome  ? String(s.nome).trim()  : "";

    const row = document.createElement("button");
    row.type = "button";
    row.className = "turnazioni-pick-row";
    if (selectedIndex !== null && i === selectedIndex) row.classList.add("is-selected");

    const nameEl = document.createElement("span");
    nameEl.className = "turnazioni-pick-name";

    let label = nome || sigla || "";
    nameEl.textContent = label;
    row.appendChild(nameEl);

    row.addEventListener("click", () => {
      startDraft.slotIndex = i;
      setDirty(true);
      clearStartError();
      syncPanelDraftUI();

      if (window.SettingsUI && typeof SettingsUI.openPanel === "function") {
        SettingsUI.openPanel("turni-start", { internal: true });
      }
    });

    startPickList.appendChild(row);
  }
}
// ===================== SPLIT pick_list_render : END   =====================


  // ===================== SPLIT visibility_sync : START =====================
  function syncVisibility(visualOn) {
    visibleByToggle = !!visualOn;
    if (startRowBtn) startRowBtn.hidden = !visibleByToggle;

    // anche se nascosta, allineiamo summary/abilitazione per coerenza
    syncSummaryUI();
  }
  // ===================== SPLIT visibility_sync : END   =====================

  // ===================== SPLIT external_hooks_sync : START =====================
  function syncFromTurnazioniChange() {
    // chiamata quando cambia preferita/lista turnazioni
    syncSummaryUI();

    // Se sono nel pannello "Inizio Turnazione" e NON sto modificando a mano,
    // applica i default se non c'è né data né turno.
    if (panelStart && panelStart.classList.contains("is-active") && !isDirty) {
      applyStartDefaultsIfEmpty();
      syncPanelDraftUI();
    }

    if (panelStartPick && panelStartPick.classList.contains("is-active")) {
      // Se sono nel picker, ricalcolo lista e selezione evidenziata
      // (i default, se servono, vengono applicati passando dal pannello start)
      renderPickList();
    }
  }

  // ===================== SPLIT external_hooks_sync : END   =====================


// ===================== SPLIT init_bindings : START =====================
function init(ctx) {
  if (!window.TurniStorage) return;

  const panelTurni = ctx && ctx.panelTurni;
  if (!panelTurni) return;

  // riga dentro Visualizza Turnazione
  startRowBtn     = panelTurni.querySelector("[data-turni-start-row]");
  startSummaryEl  = panelTurni.querySelector("[data-turni-start-summary]");
  startChevronEl  = panelTurni.querySelector("[data-turni-start-chevron]");

  const settingsView = document.querySelector(".view-settings");
  panelStart     = settingsView ? settingsView.querySelector('.settings-panel.settings-turni-start[data-settings-id="turni-start"]') : null;
  panelStartPick = settingsView ? settingsView.querySelector('.settings-panel.settings-turni-start-pick[data-settings-id="turni-start-pick"]') : null;

  startDateInput    = panelStart ? panelStart.querySelector("#turniStartDate") : null;
  startTurnoRow     = panelStart ? panelStart.querySelector("[data-turni-start-turno-row]") : null;
  startTurnoSummary = panelStart ? panelStart.querySelector("#turniStartTurnoSummary") : null;

  startSaveBtn      = panelStart ? panelStart.querySelector("[data-turni-start-save]") : null;
  startErrEl        = panelStart ? panelStart.querySelector("[data-turni-start-error]") : null;
  startErrCtl       = (window.UIFeedback && typeof UIFeedback.createTempError === "function")
    ? UIFeedback.createTempError(startErrEl, 2000)
    : null;

  startPickList     = panelStartPick ? panelStartPick.querySelector("#turniStartPickList") : null;
  startPickEmpty    = panelStartPick ? panelStartPick.querySelector("#turniStartPickEmpty") : null;

  // stato iniziale draft = salvato
  startDraft = TurniStorage.loadTurnoIniziale();
  if (!startDraft || typeof startDraft !== "object") startDraft = { date: "", slotIndex: null };

  if (startRowBtn) {
    startRowBtn.addEventListener("click", () => {
      if (startRowBtn.classList.contains("is-disabled")) return;
      openPanelStart();
    });
  }

  // Normalizza date input: forza anno a 4 cifre (YYYY) e lunghezza ISO max 10 (YYYY-MM-DD).
  function normalizeISODateYear4(v) {
    if (typeof v !== "string") return "";
    let s = v.trim();

    // Se qualcuno ha infilato un anno > 4 cifre, tronca alle prime 4
    // e conserva la parte dal primo "-" in poi (se esiste).
    const firstDash = s.indexOf("-");
    if (firstDash > 4) {
      s = s.slice(0, 4) + s.slice(firstDash);
    } else if (firstDash === -1 && /^\d{5,}$/.test(s)) {
      // caso estremo: solo numeri e troppi (fallback strani)
      s = s.slice(0, 4);
    }

    // Taglia qualsiasi eccesso oltre "YYYY-MM-DD"
    if (s.length > 10) s = s.slice(0, 10);

    return s;
  }

  if (startDateInput) {
    // mentre scrivi (desktop/fallback): non far crescere l'anno oltre 4
    startDateInput.addEventListener("input", () => {
      const before = startDateInput.value || "";
      const norm = normalizeISODateYear4(before);
      if (norm !== before) startDateInput.value = norm;
    });

    // quando cambi (anche da date picker): salva sempre un valore pulito
    startDateInput.addEventListener("change", () => {
      const before = startDateInput.value || "";
      const norm = normalizeISODateYear4(before);
      if (norm !== before) startDateInput.value = norm;

      startDraft.date = startDateInput.value || "";
      setDirty(true);
      clearStartError();
      syncPanelDraftUI();
    });
  }

  if (startSaveBtn) {
    startSaveBtn.addEventListener("click", () => {
      if (!canUse()) return;
      clearStartError();

      const dateOk = !!(startDraft.date && String(startDraft.date).trim());
      const slotOk = Number.isInteger(startDraft.slotIndex);

      if (!dateOk || !slotOk) {
        showStartError();
        return;
      }

      TurniStorage.saveTurnoIniziale({
        date: String(startDraft.date || ""),
        slotIndex: startDraft.slotIndex
      });

      setDirty(false);
      syncSummaryUI();

      if (window.SettingsUI && typeof SettingsUI.openPanel === "function") {
        SettingsUI.openPanel("turni", { internal: true });
      }
    });

    // stato iniziale
    startSaveBtn.disabled = !canUse();
    startSaveBtn.classList.toggle("is-disabled", startSaveBtn.disabled);
  }

  if (startTurnoRow) {
    startTurnoRow.addEventListener("click", () => {
      if (!canUse()) return;
      renderPickList();
      if (window.SettingsUI && typeof SettingsUI.openPanel === "function") {
        SettingsUI.openPanel("turni-start-pick", { internal: true });
      }
    });
  }

  // iniziale
  syncSummaryUI();

  // esponi hook per turnazioni
  if (window.Turni) {
    window.Turni.syncTurnoInizialeUI = syncFromTurnazioniChange;
  }
}
// ===================== SPLIT init_bindings : END   =====================


  // ===================== SPLIT public_api : START =====================
  window.TurniStart = {
    init,
    syncVisibility,
    syncFromTurnazioniChange
  };
  // ===================== SPLIT public_api : END   =====================

})();
// ============================
// Interazioni UI condivise per Turni/Turnazioni:
// - collapse card (header + freccia)
// - modalità Modifica (toggle)
// - click rigo in edit -> modifica
// - drag & drop (pointer) con FLIP
// - reset stato quando esci dal pannello "turni"
//   (ora: preferisce SettingsUI.onChange, fallback MutationObserver)
// turni-interactions.js v 1.0
// ============================

(function () {

// ===================== SPLIT helpers : START =====================
  function safeClosest(target, selector) {
    try { return target && target.closest ? target.closest(selector) : null; }
    catch { return null; }
  }
// ===================== SPLIT helpers : END =====================


// ===================== SPLIT collapsible-card : START =====================
  function attachCollapsibleCard(opts) {
    const {
      cardEl,
      toggleBtn,
      headerEl,
      getCollapsed,
      setCollapsed,
      ignoreClickSelectors = [],
      onCollapse = null
    } = opts || {};

    if (!cardEl || !toggleBtn) return;

    function apply() {
      const isCollapsed = !!getCollapsed();
      cardEl.classList.toggle("is-collapsed", isCollapsed);
      toggleBtn.setAttribute("aria-expanded", isCollapsed ? "false" : "true");
    }

    function shouldIgnoreClick(e) {
      if (!e || !e.target) return false;
      return ignoreClickSelectors.some(sel => safeClosest(e.target, sel));
    }

    toggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const next = !getCollapsed();
      setCollapsed(next);
      if (typeof onCollapse === "function") onCollapse(next, "toggle");
      apply();
    });

    if (headerEl) {
      headerEl.addEventListener("click", (e) => {
        if (shouldIgnoreClick(e)) return;
        const next = !getCollapsed();
        setCollapsed(next);
        if (typeof onCollapse === "function") onCollapse(next, "header");
        apply();
      });
    }

    apply();
    return { apply };
  }
// ===================== SPLIT collapsible-card : END =====================


// ===================== SPLIT edit-toggle : START =====================
  function attachEditToggle(opts) {
    const { btnEdit, canEdit, getEditing, setEditing, refresh } = opts || {};
    if (!btnEdit) return;

    btnEdit.addEventListener("click", (e) => {
      e.stopPropagation();
      if (typeof canEdit === "function" && !canEdit()) return;

      const next = !getEditing();
      setEditing(next);

      if (typeof refresh === "function") refresh();
    });
  }
// ===================== SPLIT edit-toggle : END =====================


// ===================== SPLIT row-edit-click : START =====================
  function attachRowEditClick(opts) {
    const {
      listEl,
      getEditing,
      onEditRow,
      ignoreSelectors = [".turno-delete-btn", ".turni-handle"]
    } = opts || {};

    if (!listEl) return;

    function shouldIgnore(e) {
      return ignoreSelectors.some(sel => safeClosest(e.target, sel));
    }

    listEl.addEventListener("click", (e) => {
      if (!getEditing()) return;
      if (shouldIgnore(e)) return;

      const row = safeClosest(e.target, ".turno-item");
      if (!row) return;

      const idx = parseInt(row.dataset.index, 10);
      if (Number.isNaN(idx)) return;

      if (typeof onEditRow === "function") onEditRow(idx);
    });
  }
// ===================== SPLIT row-edit-click : END =====================


// ===================== SPLIT drag-sort : START =====================
  function attachDragSort(opts) {
    const { listEl, getEditing, getItems, setItems, saveItems, refresh } = opts || {};
    if (!listEl) return;

    let draggedRow = null;

    function getDragAfterElement(container, y) {
      const rows = [...container.querySelectorAll(".turno-item:not(.dragging)")];

      return rows.reduce(
        (closest, child) => {
          const box = child.getBoundingClientRect();
          const offset = y - (box.top + box.height / 2);
          if (offset < 0 && offset > closest.offset) {
            return { offset, element: child };
          }
          return closest;
        },
        { offset: Number.NEGATIVE_INFINITY, element: null }
      ).element;
    }

    function onPointerMove(e) {
      if (!draggedRow) return;

      e.preventDefault();
      const y = e.clientY;

      const rows = Array.from(listEl.querySelectorAll(".turno-item"));
      const oldRects = new Map();
      rows.forEach(r => oldRects.set(r, r.getBoundingClientRect()));

      const afterElement = getDragAfterElement(listEl, y);

      if (afterElement === draggedRow || (afterElement && afterElement.previousSibling === draggedRow)) {
        return;
      }

      if (afterElement == null) {
        listEl.appendChild(draggedRow);
      } else {
        listEl.insertBefore(draggedRow, afterElement);
      }

      // FLIP
      const newRows = Array.from(listEl.querySelectorAll(".turno-item"));
      newRows.forEach(r => {
        if (r === draggedRow) return;
        const oldRect = oldRects.get(r);
        if (!oldRect) return;
        const newRect = r.getBoundingClientRect();
        const dy = oldRect.top - newRect.top;

        if (Math.abs(dy) > 1) {
          r.style.transition = "none";
          r.style.transform = `translateY(${dy}px)`;
          requestAnimationFrame(() => {
            r.style.transition = "transform 0.12s ease";
            r.style.transform = "";
          });
        }
      });
    }

    function onPointerUp() {
      if (draggedRow) {
        draggedRow.classList.remove("dragging");

        const items = typeof getItems === "function" ? getItems() : [];
        const newOrder = [];

        const rowEls = listEl.querySelectorAll(".turno-item");
        rowEls.forEach(rowEl => {
          const idx = parseInt(rowEl.dataset.index, 10);
          if (!Number.isNaN(idx) && items[idx]) {
            newOrder.push(items[idx]);
          }
        });

        if (newOrder.length === items.length && typeof setItems === "function") {
          setItems(newOrder);
          if (typeof saveItems === "function") saveItems(newOrder);
          if (typeof refresh === "function") refresh();
        }

        draggedRow = null;
      }

      document.documentElement.classList.remove("turni-no-select");
      document.body.classList.remove("turni-no-select");

      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
    }

    listEl.addEventListener("pointerdown", (e) => {
      if (!getEditing()) return;

      const handle = safeClosest(e.target, ".turni-handle");
      if (!handle) return;

      const row = safeClosest(handle, ".turno-item");
      if (!row) return;

      draggedRow = row;
      draggedRow.classList.add("dragging");

      document.documentElement.classList.add("turni-no-select");
      document.body.classList.add("turni-no-select");

      e.preventDefault();

      if (window.getSelection) {
        const sel = window.getSelection();
        if (sel && sel.removeAllRanges) sel.removeAllRanges();
      }

      document.addEventListener("pointermove", onPointerMove);
      document.addEventListener("pointerup", onPointerUp);
    });
  }
// ===================== SPLIT drag-sort : END =====================


  // ----------------------------
  // Reset quando esci dal pannello "turni"
  // Ora preferisce SettingsUI.onChange per capire prev/next,
  // e usa SettingsUI.consumeInternalNav() per distinguere nav interne.
  // ----------------------------

// ===================== SPLIT panel-exit-reset : START =====================
  function attachPanelExitReset(opts) {
    const { panelEl, onExit } = opts || {};
    if (!panelEl) return;

    // 1) via SettingsUI.onChange (preferito)
    if (window.SettingsUI && typeof SettingsUI.onChange === "function") {
      const off = SettingsUI.onChange((prevId, nextId) => {
        const panelId = panelEl.dataset.settingsId || null;
        if (!panelId) return;

        if (prevId === panelId && nextId !== panelId) {
          const internal = (window.SettingsUI && typeof SettingsUI.consumeInternalNav === "function")
            ? !!SettingsUI.consumeInternalNav()
            : false;

          if (!internal) {
            if (typeof onExit === "function") onExit();
          }
        }
      });

      return { disconnect: off };
    }

    // 2) fallback MutationObserver (se SettingsUI non c’è)
    let wasActive = panelEl.classList.contains("is-active");

    const obs = new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        if (m.type !== "attributes" || m.attributeName !== "class") return;

        const isActiveNow = panelEl.classList.contains("is-active");

        if (wasActive && !isActiveNow) {
          if (typeof onExit === "function") onExit();
        }

        wasActive = isActiveNow;
      });
    });

    obs.observe(panelEl, { attributes: true, attributeFilter: ["class"] });
    return { disconnect: () => obs.disconnect() };
  }
// ===================== SPLIT panel-exit-reset : END =====================


// ===================== SPLIT exports : START =====================
  window.TurniInteractions = {
    attachCollapsibleCard,
    attachEditToggle,
    attachRowEditClick,
    attachDragSort,
    attachPanelExitReset
  };
// ===================== SPLIT exports : END =====================

})();

// ============================
// Orchestratore Pannello Turni
// - Usa TurniStorage per storage/validazione
// - Usa TurniRender per render lista
// - Usa TurniInteractions per interazioni (edit, drag, collapse, reset on exit)
// - Deleghe Turnazioni a turnazioni.js
// - Deleghe Turno Iniziale a turni-start.js
// turni.js v 1.0
// ============================

// ===================== SPLIT bootstrap_guard : START =====================
(function () {
  if (!window.AppConfig) {
    throw new Error("CONFIG.MISSING: AppConfig non disponibile (turni.js)");
  }

  let exitEditModeImpl = function () {};
// ===================== SPLIT bootstrap_guard : END   =====================

// ===================== SPLIT init_panel_entry : START =====================
  function initTurniPanel() {
    const settingsView = document.querySelector(".view-settings");
    if (!settingsView) return;

    if (!window.TurniStorage || !window.TurniRender) {
      console.error("Turni: TurniStorage o TurniRender non disponibili");
      return;
    }
// ===================== SPLIT init_panel_entry : END   =====================

// ===================== SPLIT storage_render_deps : START =====================
    const {
      loadTurni,
      saveTurni,
      isValidTime,
      loadVisualToggle,
      saveVisualToggle
    } = window.TurniStorage;

    const { renderTurni, applySiglaFontSize } = window.TurniRender;
// ===================== SPLIT storage_render_deps : END   =====================

// ===================== SPLIT panel_refs : START =====================
    const panelTurni = settingsView.querySelector('.settings-panel.settings-turni[data-settings-id="turni"]');
    const panelAdd   = settingsView.querySelector('.settings-panel.settings-turni-add[data-settings-id="turni-add"]');
    if (!panelTurni || !panelAdd) return;

    // --- elementi pannello lista ---
    const listEl     = panelTurni.querySelector("[data-turni-list]");
    const emptyHint  = panelTurni.querySelector("[data-turni-empty-hint]");
    const btnAdd     = panelTurni.querySelector("[data-turni-add]");
    const btnEdit    = panelTurni.querySelector("[data-turni-edit]");
    const toggleBtn  = panelTurni.querySelector("[data-turni-toggle]");

    const cardEl   = toggleBtn ? toggleBtn.closest(".turni-card") : null;
    const headerEl = cardEl ? cardEl.querySelector(".turni-card-header") : null;

    // Blocco "Visualizza turnazione"
    const visualToggleBtn = panelTurni.querySelector("[data-turni-visual-toggle]");
    const visualHint      = panelTurni.querySelector("[data-turni-visual-hint]");

    // --- elementi pannello "Aggiungi turno" ---
    const formEl          = panelAdd.querySelector("[data-turni-add-form]");
    const inputNome       = panelAdd.querySelector("#addTurnoNome");
    const inputSigla      = panelAdd.querySelector("#addTurnoSigla");
    const inputInizio     = panelAdd.querySelector("#addTurnoOraInizio");
    const inputFine       = panelAdd.querySelector("#addTurnoOraFine");
    const colorInput      = panelAdd.querySelector("[data-turni-color]");
    const colorPreview    = panelAdd.querySelector("[data-turni-color-preview]");
    const colorTrigger    = panelAdd.querySelector("[data-turni-color-trigger]");
    const saveBtn         = panelAdd.querySelector("[data-turni-save]");
    const errorEl         = panelAdd.querySelector("[data-turni-error]");
    const siglaPreviewEl  = panelAdd.querySelector("[data-turni-sigla-preview]");
    const noTimeToggleBtn = panelAdd.querySelector("[data-turni-no-time-toggle]");

    if (
      !listEl || !btnAdd || !btnEdit || !toggleBtn || !cardEl || !headerEl ||
      !formEl || !inputNome || !inputSigla || !inputInizio || !inputFine ||
      !colorInput || !colorPreview || !colorTrigger ||
      !saveBtn || !errorEl || !siglaPreviewEl || !noTimeToggleBtn
    ) {
      return;
    }

    // ---- Turnazioni refs (passate a Turnazioni.init) ----
    const turnazioniCard      = panelTurni.querySelector(".turnazioni-card");
    const turnazioniToggleBtn = panelTurni.querySelector("[data-turnazioni-toggle]");
    const turnazioniHeader    = turnazioniCard ? turnazioniCard.querySelector(".turni-card-header") : null;
    const turnazioniAddBtn    = panelTurni.querySelector("[data-turnazioni-add]");
    const turnazioniEditBtn   = panelTurni.querySelector("[data-turnazioni-edit]");

    const defaultAddTitle = panelAdd.dataset.settingsTitle || "Aggiungi turno";
    const editTitle       = "Modifica turno";
// ===================== SPLIT panel_refs : END   =====================

// ===================== SPLIT state_and_helpers : START =====================
    let turni = loadTurni();
    let isEditing = false;
    let isCollapsed = cardEl.classList.contains("is-collapsed");
    let editIndex = null;

    // Turno senza orario
    let isNoTime = false;

    // Error helper
    const errorCtl = (window.UIFeedback && typeof UIFeedback.createTempError === "function")
      ? UIFeedback.createTempError(errorEl, 2000)
      : null;

    function getCollapsed() { return isCollapsed; }
    function setCollapsed(v) { isCollapsed = !!v; }

    function applyCollapsedState() {
      cardEl.classList.toggle("is-collapsed", isCollapsed);
      toggleBtn.setAttribute("aria-expanded", isCollapsed ? "false" : "true");
    }

    function refreshList() {
      renderTurni(listEl, turni, emptyHint, btnEdit, {
        isEditing,
        onDelete: (index) => {
          if (index < 0 || index >= turni.length) return;

          turni.splice(index, 1);
          saveTurni(turni);

          if (!turni.length) isEditing = false;
          refreshList();
        }
      });
    }

    refreshList();
    applyCollapsedState();
// ===================== SPLIT state_and_helpers : END   =====================

// ===================== SPLIT visualizza_turnazione_toggle : START =====================
    // ----------------------------
    // Toggle visualizza turnazione
    // ----------------------------
    if (visualToggleBtn && typeof loadVisualToggle === "function") {
      let visualOn = loadVisualToggle();

      function applyVisualState() {
  visualToggleBtn.classList.toggle("is-on", visualOn);
  visualToggleBtn.setAttribute("aria-checked", visualOn ? "true" : "false");

  // ✅ chiudi/apri la card intera
  const visualCard = visualToggleBtn.closest(".turni-card");
  if (visualCard) {
    visualCard.classList.toggle("is-collapsed", !visualOn);
  }

  if (visualHint) {
    visualHint.hidden = !visualOn;
  }

  // se esiste TurniStart, allinea visibilità riga “turno iniziale”
  if (window.TurniStart && typeof TurniStart.syncVisibility === "function") {
    TurniStart.syncVisibility(visualOn);
  }
}


      applyVisualState();

      visualToggleBtn.addEventListener("click", () => {
        visualOn = !visualOn;
        applyVisualState();
        if (typeof saveVisualToggle === "function") {
          saveVisualToggle(visualOn);
        }
      });
    }
// ===================== SPLIT visualizza_turnazione_toggle : END   =====================

// ===================== SPLIT no_time_toggle_helper : START =====================
    // ----------------------------
    // Helper: turno senza orario
    // ----------------------------
    function applyNoTimeState() {
      noTimeToggleBtn.classList.toggle("is-on", isNoTime);
      noTimeToggleBtn.setAttribute("aria-checked", isNoTime ? "true" : "false");

      [inputInizio, inputFine].forEach(inp => {
        inp.disabled = isNoTime;
        inp.classList.remove("is-invalid");
        if (isNoTime) inp.value = "";
      });

      panelAdd.classList.toggle("turni-no-time-on", isNoTime);
    }
// ===================== SPLIT no_time_toggle_helper : END   =====================

// ===================== SPLIT form_errors : START =====================
    // ----------------------------
    // Errori form
    // ----------------------------
    let errorTimer = null;

    function clearError() {
      if (errorTimer) {
        clearTimeout(errorTimer);
        errorTimer = null;
      }
      errorEl.hidden = true;
      [inputNome, inputSigla, inputInizio, inputFine].forEach(inp => inp.classList.remove("is-invalid"));
      if (errorCtl) errorCtl.clear();
    }

    function showError() {
      [inputNome, inputSigla, inputInizio, inputFine].forEach(inp => inp.classList.remove("is-invalid"));
      if (errorCtl) {
        errorCtl.show();
        return;
      }
      // fallback vecchio
      clearError();
      errorEl.hidden = false;
      errorTimer = setTimeout(() => {
        errorEl.hidden = true;
        [inputNome, inputSigla, inputInizio, inputFine].forEach(inp => inp.classList.remove("is-invalid"));
      }, 2000);
    }

    [inputNome, inputInizio, inputFine].forEach(inp => {
      inp.addEventListener("input", () => inp.classList.remove("is-invalid"));
    });
// ===================== SPLIT form_errors : END   =====================

// ===================== SPLIT color_and_sigla_preview : START =====================
    // ----------------------------
    // Colore sigla + anteprima
    // ----------------------------
    function applyColorPreview() {
      const v = colorInput.value || "#0a84ff";
      colorPreview.style.backgroundColor = v;
      siglaPreviewEl.style.color = v;
    }

    function updateSiglaPreview() {
      const txt = (inputSigla.value || "").trim();
      siglaPreviewEl.textContent = txt || "";
      applySiglaFontSize(siglaPreviewEl, txt);
    }

    colorInput.addEventListener("input", applyColorPreview);
    colorInput.addEventListener("change", applyColorPreview);

    inputSigla.addEventListener("input", () => {
      inputSigla.classList.remove("is-invalid");
      updateSiglaPreview();
    });
// ===================== SPLIT color_and_sigla_preview : END   =====================

// ===================== SPLIT form_reset_and_open : START =====================
    // ----------------------------
    // Form: reset / open new / open edit
    // ----------------------------
    function resetAddForm() {
      clearError();
      inputNome.value   = "";
      inputSigla.value  = "";
      inputInizio.value = "";
      inputFine.value   = "";
      siglaPreviewEl.textContent = "";
      applySiglaFontSize(siglaPreviewEl, "");
      colorInput.value  = "#0a84ff";
      applyColorPreview();

      isNoTime = false;
      applyNoTimeState();

      updateSiglaPreview();
    }

    function openNewTurnoPanel() {
      editIndex = null;
      panelAdd.dataset.settingsTitle = defaultAddTitle;
      resetAddForm();

      if (window.SettingsUI && typeof SettingsUI.openPanel === "function") {
        SettingsUI.openPanel("turni-add", { internal: true });
      }
    }

    function openEditTurnoPanel(index) {
      const t = turni[index];
      if (!t) return;

      editIndex = index;
      panelAdd.dataset.settingsTitle = editTitle;

      clearError();

      inputNome.value  = t.nome || "";
      inputSigla.value = t.sigla || "";

      isNoTime = !!t.noTime;

      if (isNoTime) {
        inputInizio.value = "";
        inputFine.value   = "";
      } else {
        inputInizio.value = t.inizio || "";
        inputFine.value   = t.fine || "";
      }

      applyNoTimeState();

      colorInput.value = t.colore || "#0a84ff";
      applyColorPreview();

      siglaPreviewEl.textContent = t.sigla || "";
      applySiglaFontSize(siglaPreviewEl, t.sigla || "");

      if (window.SettingsUI && typeof SettingsUI.openPanel === "function") {
        SettingsUI.openPanel("turni-add", { internal: true });
      }
    }
// ===================== SPLIT form_reset_and_open : END   =====================

// ===================== SPLIT no_time_toggle_events : START =====================
    // ----------------------------
    // Toggle "Turno senza orario"
    // ----------------------------
    applyNoTimeState();

    noTimeToggleBtn.addEventListener("click", () => {
      isNoTime = !isNoTime;
      applyNoTimeState();
    });
// ===================== SPLIT no_time_toggle_events : END   =====================

// ===================== SPLIT open_add_panel_event : START =====================
    // ----------------------------
    // Apertura pannello "Aggiungi turno"
    // ----------------------------
    btnAdd.addEventListener("click", (e) => {
      e.stopPropagation();
      openNewTurnoPanel();
    });
// ===================== SPLIT open_add_panel_event : END   =====================

// ===================== SPLIT save_turno_handler : START =====================
    // ----------------------------
    // Salvataggio nuovo turno / modifica turno
    // ----------------------------
    saveBtn.addEventListener("click", () => {
      clearError();

      const nome   = (inputNome.value || "").trim();
      const sigla  = (inputSigla.value || "").trim();
      let inizio   = (inputInizio.value || "").trim();
      let fine     = (inputFine.value || "").trim();
      const colore = colorInput.value || "#0a84ff";

      let hasError = false;

      if (!nome)  { inputNome.classList.add("is-invalid"); hasError = true; }
      if (!sigla) { inputSigla.classList.add("is-invalid"); hasError = true; }

      if (!isNoTime) {
        if (!inizio || !isValidTime(inizio)) { inputInizio.classList.add("is-invalid"); hasError = true; }
        if (!fine   || !isValidTime(fine))   { inputFine.classList.add("is-invalid");   hasError = true; }
      } else {
        inizio = "";
        fine   = "";
      }

      if (hasError) {
        showError();
        return;
      }

      const payload = { nome, sigla, inizio, fine, colore, noTime: isNoTime };

      if (editIndex !== null && editIndex >= 0 && editIndex < turni.length) {
        turni[editIndex] = payload;
      } else {
        turni.push(payload);
      }

      saveTurni(turni);
      refreshList();

      editIndex = null;
      panelAdd.dataset.settingsTitle = defaultAddTitle;
      resetAddForm();

      if (window.SettingsUI && typeof SettingsUI.openPanel === "function") {
        SettingsUI.openPanel("turni", { internal: true });
      }
    });
// ===================== SPLIT save_turno_handler : END   =====================

// ===================== SPLIT interactions_module_attach : START =====================
    // ----------------------------
    // Interactions: collapse / edit / row click / drag / reset on exit
    // ----------------------------
    if (window.TurniInteractions) {
      TurniInteractions.attachCollapsibleCard({
        cardEl,
        toggleBtn,
        headerEl,
        getCollapsed,
        setCollapsed,
        ignoreClickSelectors: ["[data-turni-edit]", "[data-turni-add]", "[data-turni-toggle]"],
        onCollapse: (collapsed) => {
          if (collapsed && isEditing) {
            isEditing = false;
            refreshList();
          }
        }
      });

      TurniInteractions.attachEditToggle({
        btnEdit,
        canEdit: () => Array.isArray(turni) && turni.length > 0,
        getEditing: () => isEditing,
        setEditing: (v) => { isEditing = !!v; },
        refresh: refreshList
      });

      TurniInteractions.attachRowEditClick({
        listEl,
        getEditing: () => isEditing,
        onEditRow: (idx) => {
          if (!turni[idx]) return;
          openEditTurnoPanel(idx);
        }
      });

      TurniInteractions.attachDragSort({
        listEl,
        getEditing: () => isEditing,
        getItems: () => turni,
        setItems: (arr) => { turni = Array.isArray(arr) ? arr : turni; },
        saveItems: (arr) => saveTurni(arr),
        refresh: refreshList
      });

      TurniInteractions.attachPanelExitReset({
        panelEl: panelTurni,
        onExit: () => {
  isCollapsed = true;
  applyCollapsedState();

  if (window.Turnazioni && typeof Turnazioni._setCollapsed === "function") {
    Turnazioni._setCollapsed(true);
  } else if (turnazioniCard && turnazioniToggleBtn) {
    turnazioniCard.classList.add("is-collapsed");
    turnazioniToggleBtn.setAttribute("aria-expanded", "false");
  }

  // ✅ se stavi modificando i Turni, esci
  if (isEditing) {
    isEditing = false;
    refreshList();
  }

  // ✅ se stavi modificando le Turnazioni, esci (quello che ti manca)
  if (window.Turnazioni && typeof Turnazioni.exitEditMode === "function") {
    Turnazioni.exitEditMode();
  }
}

      });
    }
// ===================== SPLIT interactions_module_attach : END   =====================

// ===================== SPLIT init_turnazioni_module : START =====================
    // ----------------------------
    // Init Turnazioni (modulo separato)
    // ----------------------------
    if (window.Turnazioni && typeof Turnazioni.init === "function") {
      Turnazioni.init({
        panelTurni,
        turnazioniCard,
        turnazioniToggleBtn,
        turnazioniHeader,
        turnazioniAddBtn,
        turnazioniEditBtn,
        visualHintEl: visualHint
      });
    }
// ===================== SPLIT init_turnazioni_module : END   =====================

// ===================== SPLIT init_turni_start_module : START =====================
    // ----------------------------
    // Init Turno Iniziale (modulo separato)
    // ----------------------------
    if (window.TurniStart && typeof TurniStart.init === "function") {
      TurniStart.init({ panelTurni });
    }
// ===================== SPLIT init_turni_start_module : END   =====================

// ===================== SPLIT api_exit_edit_mode : START =====================
    // ----------------------------
    // API: uscita forzata modalità Modifica
    // ----------------------------
    exitEditModeImpl = function () {
      if (!isEditing) return;
      isEditing = false;
      refreshList();

	    // Turnazioni usa la stessa logica: se cambio sezione, devo spegnere pure quella
	    if (window.Turnazioni && typeof Turnazioni.exitEditMode === "function") {
	      Turnazioni.exitEditMode();
	    }
    };
  }
// ===================== SPLIT api_exit_edit_mode : END   =====================

// ===================== SPLIT export_public_api : START =====================
  window.Turni = {
    init: initTurniPanel,
    getTurni: function () {
      return window.TurniStorage ? TurniStorage.loadTurni() : [];
    },
    getVisualizzaTurnazione: function () {
      return window.TurniStorage ? TurniStorage.loadVisualToggle() : false;
    },
    exitEditMode: function () {
      exitEditModeImpl();
    },
    // compat: verrà usata dai moduli, se presente
    syncTurnoInizialeUI: function () {}
  };
})();
// ===================== SPLIT export_public_api : END   =====================
// =====================================================
// core-ui.js (bundle UI + bootstrap + SW)
// Build: 2025-12-18
// Contenuti:
//// - settings.js
// - ui-feedback.js
// - app.js
// - sw-register.js
// =====================================================

// ============================
// Navigazione schermate Impostazioni
// "internal nav" centralizzata qui (niente flag globali sparsi)
// eventi di cambio pannello (SettingsUI.onChange)
// settings.js v 1.0
// ============================

(function () {

  // ===================== SPLIT settings_api_container : START =====================
  // contenitore interno per esporre le funzioni reali
  const settingsApi = {
    showMainFn: null,
    showPanelFn: null
  };
  // ===================== SPLIT settings_api_container : END   =====================

  // ===================== SPLIT navigation_state : START =====================
  // Stato navigazione centralizzato
  let activePanelId = null; // null = main
  let pendingInternalNav = false;
  // ===================== SPLIT navigation_state : END   =====================

  // ===================== SPLIT change_listeners : START =====================
  // listeners cambio pannello
  const changeListeners = new Set();

  function emitChange(prevId, nextId, meta) {
    changeListeners.forEach((cb) => {
      try { cb(prevId, nextId, meta || {}); } catch {}
    });
  }
  // ===================== SPLIT change_listeners : END   =====================

  // ===================== SPLIT internal_nav_flag : START =====================
  function consumeInternalNav() {
    const v = pendingInternalNav;
    pendingInternalNav = false;
    return v;
  }
  // ===================== SPLIT internal_nav_flag : END   =====================

  // ===================== SPLIT init_settings_navigation : START =====================
  function initSettingsNavigation() {
    const settingsView = document.querySelector(".view-settings");
    if (!settingsView) return;

    const main   = settingsView.querySelector(".settings-main");
    const panels = settingsView.querySelectorAll(".settings-panel[data-settings-id]");
    const rows   = settingsView.querySelectorAll(".settings-row[data-settings-page]");

    // Header principale delle impostazioni
    const titleEl = settingsView.querySelector("#settingsTitle");
    const backBtn = settingsView.querySelector("[data-settings-back-main]");

    if (!main || !titleEl || !backBtn) return;

    // ===================== SPLIT back_button_utils : START =====================
    // ----------------------------
    // Util: gestione pulsante back
    // ----------------------------
    function hideBackBtn() {
      backBtn.hidden = true;
      backBtn.style.display = "none";
    }

    function showBackBtn() {
      backBtn.hidden = false;
      backBtn.style.display = "inline-flex";
    }
    // ===================== SPLIT back_button_utils : END   =====================

    // ===================== SPLIT header_title_logic : START =====================
    // ----------------------------
    // Header: titolo per main e pannelli
    // ----------------------------
    function stripSettingsPrefix(txt) {
      const s = (txt == null) ? "" : String(txt).trim();
      if (!s) return "";
      return s.replace(/^Impostazioni\s*-\s*/i, "").trim();
    }

    function setHeaderForMain() {
      titleEl.textContent = "Impostazioni";
      hideBackBtn();
    }

    function setHeaderForPanel(id) {
      let label = id;

      const panel = settingsView.querySelector(`.settings-panel[data-settings-id="${id}"]`);
      if (panel && panel.dataset.settingsTitle) {
        titleEl.textContent = stripSettingsPrefix(panel.dataset.settingsTitle);
        showBackBtn();
        return;
      }

      const row = settingsView.querySelector(`.settings-row[data-settings-page="${id}"]`);
      if (row) {
        const lblEl = row.querySelector(".settings-row-label");
        if (lblEl && lblEl.textContent.trim()) {
          label = lblEl.textContent.trim();
        }
      }

      titleEl.textContent = stripSettingsPrefix(label);
      showBackBtn();
    }
    // ===================== SPLIT header_title_logic : END   =====================


    // ===================== SPLIT view_switch_main_panel : START =====================
    // ----------------------------
    // Switch vista: main / pannelli
    // ----------------------------
    function showMain(meta) {
      // tornando alla lista principale → usciamo dalla modalità Modifica Turni
      if (window.Turni && typeof Turni.exitEditMode === "function") {
        Turni.exitEditMode();
      }

      const prev = activePanelId;
      activePanelId = null;

      main.classList.add("is-active");
      panels.forEach(p => p.classList.remove("is-active"));
      setHeaderForMain();

      emitChange(prev, null, meta);
    }

    function showPanel(id, meta) {
      if (!id) return;

      const prev = activePanelId;
      activePanelId = id;

      // Regole “coerenti” con il tuo flusso:
      // - se lasci il pannello turni → esci da edit mode (ma ci pensa già in parte Turni)
      // - se entri in turni-add / turnazioni-add -> esci da edit mode
      if (prev === "turni" && id !== "turni") {
        if (window.Turni && typeof Turni.exitEditMode === "function") {
          Turni.exitEditMode();
        }
      }
      if (id === "turni-add" || id === "turnazioni-add") {
        if (window.Turni && typeof Turni.exitEditMode === "function") {
          Turni.exitEditMode();
        }
      }

      main.classList.remove("is-active");
      panels.forEach(p => {
        p.classList.toggle("is-active", p.dataset.settingsId === id);
      });
      setHeaderForPanel(id);

      emitChange(prev, id, meta);
    }
    // ===================== SPLIT view_switch_main_panel : END   =====================

    // ===================== SPLIT expose_internal_functions : START =====================
    // esponi le funzioni interne all’API globale
    settingsApi.showMainFn  = showMain;
    settingsApi.showPanelFn = showPanel;
    // ===================== SPLIT expose_internal_functions : END   =====================

    // ===================== SPLIT initial_state : START =====================
    // stato iniziale → schermata principale senza freccia
    showMain({ reason: "init" });
    // ===================== SPLIT initial_state : END   =====================

    // ===================== SPLIT ui_events_rows_back : START =====================
    // ----------------------------
    // Eventi UI
    // ----------------------------
    rows.forEach(row => {
      row.addEventListener("click", () => {
        const id = row.dataset.settingsPage;
        showPanel(id, { reason: "row" });
      });
    });

    backBtn.addEventListener("click", () => {
      // comportamento “back” basato su pannello attivo
      // Nota: qui mantengo i tuoi casi speciali.

      if (activePanelId === "turni-add") {
        showPanel("turni", { reason: "back" });
        return;
      }
      if (activePanelId === "turni-start") {
        showPanel("turni", { reason: "back" });
        return;
      }
      if (activePanelId === "turni-start-pick") {
        showPanel("turni-start", { reason: "back" });
        return;
      }
      if (activePanelId === "turnazioni-add") {
        showPanel("turni", { reason: "back" });
        return;
      }
      if (activePanelId === "turnazioni-pick") {
        showPanel("turnazioni-add", { reason: "back" });
        return;
      }

      showMain({ reason: "back" });
    });
    // ===================== SPLIT ui_events_rows_back : END   =====================
  }
  // ===================== SPLIT init_settings_navigation : END   =====================

  // ===================== SPLIT global_api_settingsui : START =====================
  // ============================
  // API globale SettingsUI
  // ============================
  window.SettingsUI = {
    init: initSettingsNavigation,

    showMain: function () {
      if (typeof settingsApi.showMainFn === "function") {
        settingsApi.showMainFn({ reason: "api" });
      }
    },

    // Backward compatible:
    // SettingsUI.openPanel("id") funziona
    // SettingsUI.openPanel("id", { internal: true }) marca navigazione interna
    openPanel: function (id, opts) {
      if (opts && opts.internal) {
        pendingInternalNav = true;
      }
      if (typeof settingsApi.showPanelFn === "function") {
        settingsApi.showPanelFn(id, { reason: "api", internal: !!(opts && opts.internal) });
      }
    },

    // Stato / internal nav (usato dai moduli per decidere reset)
    getActivePanelId: function () {
      return activePanelId;
    },

    consumeInternalNav: function () {
      return consumeInternalNav();
    },

    // Eventi cambio pannello
    onChange: function (cb) {
      if (typeof cb !== "function") return function () {};
      changeListeners.add(cb);
      return function () { changeListeners.delete(cb); };
    }
  };
  // ===================== SPLIT global_api_settingsui : END   =====================
})();

// ============================
// Backup e Ripristino (azioni ripristino)
// backup-restore.js v 1.0
// ============================

(function () {

  // ===================== SPLIT backup-restore-init : START =====================
  function initBackupRestorePanel() {
    if (!window.AppConfig) return;

    const panel = document.querySelector(
      '.settings-panel.settings-backup-restore[data-settings-id="backup-restore"]'
    );
    if (!panel) return;

    const btnFactory = panel.querySelector("[data-backup-restore-factory]");
    const btnClean   = panel.querySelector("[data-backup-restore-clean]");

        function uiConfirm(opts) {
      const title = (opts && opts.title) ? String(opts.title) : "";
      const text  = (opts && opts.text)  ? String(opts.text)  : "";
      const okText = (opts && opts.okText) ? String(opts.okText) : "OK";
      const variant = (opts && opts.variant) ? String(opts.variant) : "primary"; // primary | danger

      const modal = document.getElementById("uiConfirm");
      const titleEl = document.getElementById("uiConfirmTitle");
      const textEl  = document.getElementById("uiConfirmText");
      const okBtn   = document.getElementById("uiConfirmOk");

      if (!modal || !titleEl || !textEl || !okBtn) {
        // fallback brutale (se manca l'HTML del modal)
        return Promise.resolve(window.confirm(`${title}\n\n${text}`));
      }

      const cancelTargets = modal.querySelectorAll("[data-ui-confirm-cancel]");
      const okTarget = modal.querySelector("[data-ui-confirm-ok]");

      return new Promise((resolve) => {
        let done = false;

        function cleanup() {
          document.body.classList.remove("ui-modal-open");
          modal.hidden = true;
          done = true;
          document.removeEventListener("keydown", onKeyDown, true);
          cancelTargets.forEach(el => el.removeEventListener("click", onCancel, true));
          if (okTarget) okTarget.removeEventListener("click", onOk, true);
        }

        function finish(v) {
          if (done) return;
          cleanup();
          resolve(!!v);
        }

        function onCancel(e) { e.preventDefault(); finish(false); }
        function onOk(e) { e.preventDefault(); finish(true); }

        function onKeyDown(e) {
          if (e.key === "Escape") {
            e.preventDefault();
            finish(false);
          }
        }

        // setup contenuti
        titleEl.textContent = title;
        textEl.textContent = text;
        okBtn.textContent = okText;

        okBtn.classList.remove(
  "ui-confirm-btn--primary",
  "ui-confirm-btn--danger",
  "ui-confirm-btn--danger-filled"
);

if (variant === "danger-filled") {
  okBtn.classList.add("ui-confirm-btn--danger-filled");
} else if (variant === "danger") {
  okBtn.classList.add("ui-confirm-btn--danger");
} else {
  okBtn.classList.add("ui-confirm-btn--primary");
}


        // show
        modal.hidden = false;
        document.body.classList.add("ui-modal-open");

        // bind
        cancelTargets.forEach(el => el.addEventListener("click", onCancel, true));
        if (okTarget) okTarget.addEventListener("click", onOk, true);
        document.addEventListener("keydown", onKeyDown, true);
      });
    }


    function emitStorageChange(key) {
      try {
        window.dispatchEvent(
          new CustomEvent("turnipds:storage-changed", { detail: { key: String(key || "") } })
        );
      } catch {}
    }

    function wipeAppDataKeys() {
      const { STORAGE_KEYS } = window.AppConfig;
      const keys = [
        STORAGE_KEYS.turni,
        STORAGE_KEYS.turniVisualizza,
        STORAGE_KEYS.turnazioni,
        STORAGE_KEYS.turnazioniPreferred,
        STORAGE_KEYS.turniStart,
        STORAGE_KEYS.indennita,
        STORAGE_KEYS.festivita,
        STORAGE_KEYS.inspag,
        STORAGE_KEYS.preferenze
      ];

      keys.forEach((k) => {
        try { localStorage.removeItem(k); } catch {}
      });

      return keys;
    }

    function hardReloadSoon() {
      try {
        setTimeout(() => {
          try { window.location.reload(); } catch {}
        }, 50);
      } catch {
        try { window.location.reload(); } catch {}
      }
    }

    if (btnFactory) {
      btnFactory.addEventListener("click", async () => {
        const ok = await uiConfirm({
          title: "Ripristinare la configurazione iniziale?",
          text:
            "Questa operazione riporta l’app alla configurazione iniziale.\n" +
            "Tutte le modifiche apportate verranno perse.",
          okText: "Ripristina",
          variant: "primary"
        });
        if (!ok) return;

        const touched = wipeAppDataKeys();

        // Seed dati di fabbrica (turni + turnazioni + inizio + visual)
        if (window.TurniStorage && typeof TurniStorage.seedFactoryDefaultsIfNeeded === "function") {
          TurniStorage.seedFactoryDefaultsIfNeeded();
        }

        touched.forEach(emitStorageChange);

        if (window.Status && typeof Status.markSaved === "function") {
          Status.markSaved();
        }

        hardReloadSoon();
      });
    }


    if (btnClean) {
      btnClean.addEventListener("click", async () => {
        const ok = await uiConfirm({
          title: "Cancellare il contenuto?",
          text: "Questa operazione elimina tutti i dati dell’app.",
          okText: "Cancella",
          variant: "danger-filled"
        });
        if (!ok) return;

        const { STORAGE_KEYS } = window.AppConfig;
        const touched = wipeAppDataKeys();

        // Impedisci il seed automatico: setta valori vuoti ma presenti
        try { localStorage.setItem(STORAGE_KEYS.turni, "[]"); } catch {}
        try { localStorage.setItem(STORAGE_KEYS.turnazioni, "[]"); } catch {}
        try { localStorage.setItem(STORAGE_KEYS.turnazioniPreferred, ""); } catch {}
        try { localStorage.setItem(STORAGE_KEYS.turniVisualizza, "false"); } catch {}
        try { localStorage.setItem(STORAGE_KEYS.turniStart, JSON.stringify({ date: "", slotIndex: null })); } catch {}

        // Notifica anche le chiavi risettate
        [
          STORAGE_KEYS.turni,
          STORAGE_KEYS.turnazioni,
          STORAGE_KEYS.turnazioniPreferred,
          STORAGE_KEYS.turniVisualizza,
          STORAGE_KEYS.turniStart
        ].forEach((k) => {
          if (!touched.includes(k)) touched.push(k);
        });

        touched.forEach(emitStorageChange);

        if (window.Status && typeof Status.markSaved === "function") {
          Status.markSaved();
        }

        hardReloadSoon();
      });
    }

  }
  // ===================== SPLIT backup-restore-init : END =======================

  // ===================== SPLIT backup-restore-export : START =====================
  window.BackupRestore = {
    init: initBackupRestorePanel
  };
  // ===================== SPLIT backup-restore-export : END =======================

})();

// ============================
// Helper UI condiviso: errori temporizzati (show/hide)
// ui-feedback.js v 1.0
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

// ============================
// Bootstrap UI core
// - Inizializza moduli principali
// - Gestisce il comportamento della tabbar
// app.js v 1.0
// ============================

(function () {

// ===================== SPLIT tabbar_switch_viste : START =====================
// ============================
// Tabbar: switch viste principali
// ============================
function initTabs() {
  const tabs  = document.querySelectorAll(".tab");
  const views = document.querySelectorAll(".view");

  if (!tabs.length || !views.length) return;

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.tab;

      // vista attiva PRIMA del cambio
      const activeView = document.querySelector(".view.is-active");
      const activeViewId = activeView ? activeView.dataset.view : null;

      // TAB CALENDARIO:
      // se è già attiva → torna al mese/giorno corrente (resetToToday)
      if (target === "calendar") {
        const calendarView = document.querySelector(".view-calendar");
        const isCalendarActive =
          calendarView && calendarView.classList.contains("is-active");

        if (
          isCalendarActive &&
          window.Calendar &&
          typeof Calendar.resetToToday === "function"
        ) {
          Calendar.resetToToday();
          return;
        }
      }

      // TAB IMPOSTAZIONI:
      // se la vista settings è già attiva → torna al menu principale Impostazioni
      if (target === "settings") {
        // Lazy init: inizializza i moduli Settings SOLO quando apri la tab
        if (typeof window.__bootSettingsOnce === "function") {
          window.__bootSettingsOnce();
        }

        const settingsView = document.querySelector(".view-settings");
        const isSettingsActive =
          settingsView && settingsView.classList.contains("is-active");

        if (isSettingsActive) {
          // uscendo / resettando Impostazioni → esci dalla modalità Modifica Turni
          if (window.Turni && typeof Turni.exitEditMode === "function") {
            Turni.exitEditMode();
          }
          // ✅ e anche Turnazioni (indipendente da Turni)
          if (window.Turnazioni && typeof Turnazioni.exitEditMode === "function") {
            Turnazioni.exitEditMode();
          }

          if (window.SettingsUI && typeof SettingsUI.showMain === "function") {
            // siamo già su settings → resetta solo il pannello
            SettingsUI.showMain();
          }
          return;
        }
      }

      // Se stiamo uscendo da Impostazioni verso un'altra vista,
      // assicuriamoci di uscire dalla modalità Modifica Turni
      if (activeViewId === "settings" && target !== "settings") {
        if (window.Turni && typeof Turni.exitEditMode === "function") {
          Turni.exitEditMode();
        }
        // ✅ e anche Turnazioni (indipendente da Turni)
        if (window.Turnazioni && typeof Turnazioni.exitEditMode === "function") {
          Turnazioni.exitEditMode();
        }
      }

      // Comportamento standard delle tab:
      // - aggiorna stato .active sui bottoni
      // - mostra/nasconde le viste con .is-active
      tabs.forEach(t => t.classList.toggle("active", t === tab));
      views.forEach(v => {
        v.classList.toggle("is-active", v.dataset.view === target);
      });

      // Calendario:
      // quando RIENTRI nella vista (da un'altra tab) → torna ad oggi.
      // Poi reflow/dirty-guard quando la vista è visibile.
      if (target === "calendar" && window.Calendar) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (
              activeViewId !== "calendar" &&
              typeof Calendar.resetToToday === "function"
            ) {
              Calendar.resetToToday();
            }

            if (typeof Calendar.onEnterCalendarView === "function") {
              Calendar.onEnterCalendarView();
            }
          });
        });
      }
    });
  });
}
// ===================== SPLIT tabbar_switch_viste : END   =====================






    // ===================== SPLIT bootstrap_domcontentloaded : START =====================
  // ============================
  // Bootstrap all’avvio
  // ============================
  window.addEventListener("DOMContentLoaded", () => {
    // Stato prima di tutto: gli altri possono usarlo subito
    if (window.Status && typeof Status.init === "function") {
      Status.init();
    }

    // Seed dati "di fabbrica" PRIMA del primo render del calendario
    if (window.TurniStorage && typeof TurniStorage.seedFactoryDefaultsIfNeeded === "function") {
      TurniStorage.seedFactoryDefaultsIfNeeded();
    }

    // Calendario (vista principale)
    if (window.Calendar && typeof Calendar.init === "function") {
      Calendar.init();
    }

    // Tema (applica data-theme + sincronizza UI tema)
    if (window.Theme && typeof Theme.init === "function") {
      Theme.init();
    }

    // Lazy init Settings/Turni: definito qui, usato dalla tabbar
    if (!window.__bootSettingsOnce) {
      window.__bootSettingsOnce = (function () {
        let done = false;
        return function () {
          if (done) return;
          done = true;

          // Navigazione Impostazioni (lista principale + pannelli)
          if (window.SettingsUI && typeof SettingsUI.init === "function") {
            SettingsUI.init();
          }

          // Backup e Ripristino (ripristino fabbrica / pulito)
          if (window.BackupRestore && typeof BackupRestore.init === "function") {
            BackupRestore.init();
          }

          // Pannello Turni (lista + form "Aggiungi turno")
          if (window.Turni && typeof Turni.init === "function") {
            Turni.init();
          }
        };
      })();
    }

    // Tabbar (switch tra le viste principali)
    initTabs();

    // Icone SVG (tabbar + icona stato)
    if (window.Icons && typeof Icons.initTabbar === "function") {
      Icons.initTabbar();

      if (typeof Icons.loadStatusIcon === "function") {
        Icons.loadStatusIcon();
      }
    }

    // Se per qualche motivo l'app parte già su Impostazioni, inizializza subito
    const settingsActive = document.querySelector(".view-settings.is-active");
    if (settingsActive && typeof window.__bootSettingsOnce === "function") {
      window.__bootSettingsOnce();
    }

    if (window.BootSplash && typeof BootSplash.hide === "function") {
      BootSplash.hide();
    }
  });
  // ===================== SPLIT bootstrap_domcontentloaded : END   =====================



})();

// ============================
// Service worker + versione
// sw-register.js
// ============================

// ===================== SPLIT bootstrap : START =====================
(function () {
  if (!("serviceWorker" in navigator)) return;
  if (!window.AppConfig) {
    throw new Error("CONFIG.MISSING: AppConfig non disponibile (sw-register.js)");
  }

  const { PATHS, VERSION } = window.AppConfig;
  const BASE       = PATHS.base;
  const SCOPE      = PATHS.swScope || `${BASE}/`;
  const SW_URL_RAW = PATHS.swFile;
// ===================== SPLIT bootstrap : END =====================

  // ===================== SPLIT get_sw_version : START =====================
  // ----------------------------
  // Lettura versione dal file SW
  // ----------------------------
  async function getSWVersion() {
    try {
      const res = await fetch(SW_URL_RAW, {
        cache: "no-store",
        credentials: "same-origin"
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const text = await res.text();
      const m = text.match(/const\s+VERSION\s*=\s*['"]([^'"]+)['"]/);
      if (!m) throw new Error("VERSION non trovata nel file service-worker.js");
      return m[1];
    } catch {
      // NESSUN console.error / warn qui: silenzio in offline
      return null;
    }
  }
  // ===================== SPLIT get_sw_version : END =====================

  // ===================== SPLIT version_label : START =====================
  // ----------------------------
  // Gestione label versione
  // ----------------------------
function setVersionLabel(fullVersion) {
  const elId = VERSION.labelElementId || "versionLabel";
  const el = document.getElementById(elId);
  if (!el) return;

  if (!fullVersion) {
    el.textContent = "";
    return;
  }

  const s = String(fullVersion).trim();

  // Estrae solo i numeri versione (es: "V 1.8.0" -> "1.8.0", "1.8.0" -> "1.8.0")
  let ver = "";
  let m = s.match(/^[Vv]\s*([0-9.]+)\s*$/);
  if (m) {
    ver = m[1];
  } else {
    m = s.match(/([0-9]+(?:\.[0-9]+)+)/);
    ver = m ? m[1] : "";
  }

  el.textContent = ver ? ("v" + ver) : "";
}

  // ===================== SPLIT version_label : END =====================

  // ===================== SPLIT register_sw : START =====================
  // ----------------------------
  // Registrazione SW
  // ----------------------------
  async function registerSW() {
    const swVersion = await getSWVersion();

    // Se non ho potuto leggere la versione (offline o errore),
    // non registro niente e non sporco la console.
    if (!swVersion) {
      setVersionLabel("");
      return;
    }

    setVersionLabel(swVersion);
    const SW_URL = `${SW_URL_RAW}?v=${encodeURIComponent(swVersion)}`;

    try {
      const reg = await navigator.serviceWorker.register(SW_URL, { scope: SCOPE });

      if (reg.waiting) {
        reg.waiting.postMessage({ type: "SKIP_WAITING" });
      }

      reg.addEventListener("updatefound", () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener("statechange", () => {
          if (nw.state === "installed" && navigator.serviceWorker.controller) {
            nw.postMessage({ type: "SKIP_WAITING" });
          }
        });
      });

      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!window.__reloadedForSW) {
          window.__reloadedForSW = true;
          location.reload();
        }
      });

      // Aggiornamenti periodici
      reg.update().catch(() => {});
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          reg.update().catch(() => {});
        }
      });
    } catch {
      // Anche qui: niente casino in console in caso di errori
      setVersionLabel("");
    }
  }
  // ===================== SPLIT register_sw : END =====================

  // ===================== SPLIT schedule_registration : START =====================
  // ----------------------------
  // Wrapper che RISPETTA l’offline
  // ----------------------------
  function scheduleSWRegistration() {
    // Se il browser segnala offline, NON facciamo nessuna fetch
    if (navigator && navigator.onLine === false) {
      setVersionLabel("");
      // Quando torni online, registriamo una sola volta
      window.addEventListener("online", () => {
        registerSW();
      }, { once: true });
      return;
    }

    // Online → procedi normalmente
    registerSW();
  }
  // ===================== SPLIT schedule_registration : END =====================

  // ===================== SPLIT dom_ready_hook : START =====================
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleSWRegistration);
  } else {
    scheduleSWRegistration();
  }
})();
  // ===================== SPLIT dom_ready_hook : END =====================


// ============================
// Namespace unico (compat): App.*
// Evita collisioni globali senza rompere il codice esistente.
// ============================
(function () {
  window.App = window.App || {};
  const keys = [
    "AppConfig",
    "Calendar",
    "Theme",
    "Icons",
    "TurniStorage",
    "TurniRender",
    "TurniStart",
    "TurniInteractions",
    "Turni",
    "SettingsUI"
  ];
  for (const k of keys) {
    if (window[k]) window.App[k] = window[k];
  }
})();
