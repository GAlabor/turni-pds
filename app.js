
(function () {
  
  if (window.AppConfig) {
    return;
  }
  
  const PROD_BASE = "/turni-pds";
  const path = location.pathname || "/";
  const BASE = (path === PROD_BASE || path.startsWith(PROD_BASE + "/")) ? PROD_BASE : "";
  
  window.AppConfig = {
    
    DEBUG: (location.hostname === "localhost" || location.hostname === "127.0.0.1"),
    
    PATHS: {
      base: BASE,
      svgBase: `${BASE}/svg`,
      swScope: `${BASE}/`,
      swFile: `${BASE}/service-worker.js`
    },
    

    STORAGE_KEYS: {
      theme: "turnipds-theme",
      
      turni: "turnipds-turni",

      turniVisualizza: "turnipds-turni-visualizza",
      
      turnazioni: "turnipds-turnazioni",
      turnazioniPreferred: "turnipds-turnazioni-preferred",
      turniStart: "turnipds-turni-start",
      
      indennita: "turnipds-indennita",
      festivita: "turnipds-festivita",
      inspag: "turnipds-inspag",
      preferenze: "turnipds-preferenze"
    },
    
    
    UI: {
      themeLabels: {
        system: "Sistema",
        light: "Chiaro",
        dark: "Scuro"
      }
    },
    
    
    STATUS: {
      savedDelay: 1200,
      spinnerVisibleMs: 800
    },


CALENDAR: {
  
  turnoSiglaFontPx: 23,
  
  turnoSiglaScale: 1,
  turnoSiglaFontWeight: 350,
  turnoSiglaLetterSpacing: "0.02em"
},
    
    VERSION: {
      labelElementId: "versionLabel"
    }

  };

})();


// UI helper condiviso: lista selezione stile "turnazioni-pick-row"
function renderTurnazioniPickList(opts) {
  if (!opts || !opts.listEl) return;

  const listEl = opts.listEl;
  const emptyEl = opts.emptyEl || null;
  const items = Array.isArray(opts.items) ? opts.items : [];

  listEl.innerHTML = "";

  const has = items.length > 0;
  if (emptyEl) emptyEl.hidden = has;
  if (!has) return;

  const isSelected = (typeof opts.isSelected === "function") ? opts.isSelected : (() => false);
  const getLabel = (typeof opts.getLabel === "function")
    ? opts.getLabel
    : ((it) => (it && (it.nome || it.sigla)) ? String(it.nome || it.sigla) : "");

  const onPick = (typeof opts.onPick === "function") ? opts.onPick : (() => {});

  items.forEach((it, idx) => {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "turnazioni-pick-row";

    if (isSelected(it, idx)) row.classList.add("is-selected");

    const name = document.createElement("span");
    name.className = "turnazioni-pick-name";
    name.textContent = getLabel(it, idx) || "";

    row.appendChild(name);

    row.addEventListener("click", () => onPick(it, idx));

    listEl.appendChild(row);
  });
}


(function () {

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

  
  const YEARS_PAGE_SIZE = 12;

  let today = new Date();
  let currentYear = today.getFullYear();
  let currentMonth = today.getMonth(); 
  let currentMode = MODES.DAYS;
  
  let yearRangeStart = currentYear - 5;
  
  let gridDays = null;
  let gridMonths = null;
  let gridYears = null;
  let monthLabel = null;
  let prevBtn = null;
  let nextBtn = null;
  let calendarContainer = null;
  
  let _lastCalDaySize = null;
  let _calendarDirty = false;
  let _calendarInited = false;



  function updateDayCellSize() {
    if (!gridDays || !calendarContainer) return false;
    if (currentMode !== MODES.DAYS) return false;

    const dayEl = gridDays.querySelector(".day:not(.empty)");
    if (!dayEl) return false;

    const rect = dayEl.getBoundingClientRect();
    if (!rect.width) return false;

    
    const w = Math.round(rect.width * 2) / 2;

    if (_lastCalDaySize != null && Math.abs(w - _lastCalDaySize) < 0.25) {
      return false;
    }

    _lastCalDaySize = w;
    document.documentElement.style.setProperty("--cal-day-size", w + "px");
    return true;
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

  let fontPx = null;

  if (len > 0 && len <= 2) {
    fontPx = 23;
  }

  if (fontPx === null && cal && cal.turnoSiglaFontPx != null) {
    const fCfg = cal.turnoSiglaFontPx;

    if (typeof fCfg === "object") {
      
      if (len <= 2) fontPx = fCfg.short;
      else if (len === 3) fontPx = fCfg.medium;
      else fontPx = fCfg.long;
    } else if (Number.isFinite(Number(fCfg))) {
      
      fontPx = Number(fCfg);
    }
  }

  
  if (fontPx === null) {
    fontPx = 23;
  }
  
  const scale =
    cal && Number.isFinite(Number(cal.turnoSiglaScale))
      ? Number(cal.turnoSiglaScale)
      : 1.0;
  
  const fontWeight =
    cal &&
    (Number.isFinite(Number(cal.turnoSiglaFontWeight)) ||
      typeof cal.turnoSiglaFontWeight === "string")
      ? cal.turnoSiglaFontWeight
      : null;
  
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

function getCalendarSiglaForDate(dateObj) {
  if (!window.TurniStorage) return null;

  
  const show = TurniStorage.loadVisualToggle();
  if (!show) return null;

  const t = (window.TurniStorage && typeof TurniStorage.getPreferredTurnazione === "function")
    ? TurniStorage.getPreferredTurnazione()
    : null;
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

  
  const startDayNum = toUTCDayNumber(startDate);
  const targetDayNum = toUTCDayNumber(target);
  if (startDayNum === null || targetDayNum === null) return null;

  const diffDays = targetDayNum - startDayNum;

  const idx = safeMod((cfg.slotIndex || 0) + diffDays, days);
  const slot = slots[idx] || null;

  const baseSigla = slot && slot.sigla ? String(slot.sigla).trim() : "";
  const baseColore = slot && slot.colore ? String(slot.colore).trim() : "";

  const isRest = restIdx.includes(idx);

  
  if (isRest && t.riposiFissi && typeof t.riposiFissi === "object") {
    const dow = dateObj.getDay(); 
    
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


const fromTurni = getTurniColorForSigla(baseSigla);
const finalColore = fromTurni || baseColore;
return { sigla: baseSigla, colore: finalColore };

}

const _siglaFitCache = new Map();
let _siglaBatchPending = [];
let _siglaBatchScheduled = false;

// Calendario (celle rettangolari): pipeline autofit+batch esposta via facciata
window.SiglaSizing = window.SiglaSizing || {};
window.SiglaSizing.calendarQueue = function (el, txt, baseFs) {
  if (!el) return;
  _siglaBatchPending.push({ el, txt: (txt != null ? String(txt) : ""), baseFs });
  _scheduleSiglaBatch();
};

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

  
  return `${String(siglaText || "")}::w${w}::b${b}::${fam}::${wgt}::${ls}`;
}

function _applyFitWithCache(el, siglaText, baseFs) {
  if (!el) return;

  const txt = (siglaText != null) ? String(siglaText) : "";
  const len = txt.length;

  
  if (len > 0 && len <= 2) {
    el.style.fontSize = "23px";
    return;
  }
  
  
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

    
    batch.forEach((it) => {
      if (!it || !it.el) return;
      _applyFitWithCache(it.el, it.txt, it.baseFs);
    });

    
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

  
  const avail = el.clientWidth || Math.round(el.getBoundingClientRect().width);
  const need = el.scrollWidth;

  if (!avail || !need) return;

  if (need <= avail + 0.5) return;

  const ratio = avail / need;
  let fitted = startingFs * ratio;
  fitted *= 1.06;

  
  if (!Number.isFinite(fitted) || fitted <= 0) return;
  fitted = Math.max(8, fitted);

  const fittedRounded = (Math.round(fitted * 2) / 2);
  el.style.fontSize = fittedRounded + "px";
}

function autoCenterCalendarSigla(el) {
  if (!el) return;

  
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

  
  el.style.textOverflow = "clip";

  const sizing = getCalendarSiglaSizingConfig(info.sigla);

  
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

  
  const baseFs = sizing.fontPx ? Number(sizing.fontPx) : parseFloat(getComputedStyle(el).fontSize);
  if (window.SiglaSizing && typeof SiglaSizing.calendarQueue === "function") {
    SiglaSizing.calendarQueue(el, info.sigla, baseFs);
  } else {
    _siglaBatchPending.push({ el, txt: info.sigla, baseFs });
    _scheduleSiglaBatch();
  }
}

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
  

  function renderDays() {
    if (!gridDays) return;

    gridDays.innerHTML = "";

    const firstDay = new Date(currentYear, currentMonth, 1);

    const startIndex = (firstDay.getDay() + 6) % 7;

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const isCurrentMonth =
      currentYear === today.getFullYear() &&
      currentMonth === today.getMonth();

    
    for (let i = 0; i < startIndex; i++) {
      const empty = document.createElement("div");
      empty.className = "day empty";
      gridDays.appendChild(empty);
    }

    
    for (let d = 1; d <= daysInMonth; d++) {
      const cell = document.createElement("div");
      cell.className = "day";
      cell.textContent = d;

      
      const colIndex = (startIndex + d - 1) % 7;

      const dateObj = new Date(currentYear, currentMonth, d);
      let festNome = null;
      if (window.Festivita && typeof Festivita.getNomeForDate === "function") {
        festNome = Festivita.getNomeForDate(dateObj);
      }

      if (colIndex === 6 || festNome) {
        cell.classList.add("sunday");
      }

      if (festNome) {
        cell.title = festNome;
      }

      if (isCurrentMonth && d === today.getDate()) {
        cell.classList.add("today");
      }

      applyTurnazioneOverlayToCell(cell, dateObj);

      gridDays.appendChild(cell);
    }

    updateHeader();
    updateDayCellSize();
  }

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

  function setMode(mode) {
    if (mode === currentMode && mode !== MODES.YEARS) {
      return;
    }

    currentMode = mode;

    if (currentMode === MODES.YEARS) {
      
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

  function setupOutsideClickHandler() {
    document.addEventListener("click", (ev) => {
      if (!calendarContainer) return;
      if (currentMode === MODES.DAYS) return;

      const target = ev.target;

      if (
        calendarContainer.contains(target) ||
        (monthLabel && monthLabel.contains(target)) ||
        (prevBtn && prevBtn.contains(target)) ||
        (nextBtn && nextBtn.contains(target))
      ) {
        return;
      }

      
      currentMode = MODES.DAYS;
      updateContainerModeClass();
      renderDays();
    });
  }

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

  function reflowTurnoSigle() {
    if (currentMode !== MODES.DAYS) return;

    
    const all = gridDays ? gridDays.querySelectorAll(".cal-turno-sigla") : [];
    if (all && all.length) {
      all.forEach(el => {
        
        el.classList.add("sigla-ready");
      });
    }
  }

  function onEnterCalendarView() {
    if (currentMode !== MODES.DAYS) return;

    if (_calendarDirty) {
      _calendarDirty = false;
      renderDays(); 
      return;
    }
    
    reflowTurnoSigle();
  }

  function init() {
    if (_calendarInited) return;
    _calendarInited = true;
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
    
    monthLabel.addEventListener("click", () => {
      if (currentMode === MODES.DAYS) {
        setMode(MODES.MONTHS);
      } else if (currentMode === MODES.MONTHS) {
        setMode(MODES.YEARS);
      }
      
    });

    setupOutsideClickHandler();
    renderDays();


function isCalendarViewActive() {
  const v = document.querySelector(".view-calendar");
  return !!(v && v.classList.contains("is-active"));
}

window.addEventListener("turnipds:storage-changed", () => {
  if (currentMode !== MODES.DAYS) return;

  if (isCalendarViewActive()) {
    renderDays();
  } else {
    _calendarDirty = true;
  }
});


window.addEventListener("storage", (ev) => {
  if (!ev || !ev.key) return;
  if (currentMode !== MODES.DAYS) return;

  if (isCalendarViewActive()) {
    renderDays();
  } else {
    _calendarDirty = true;
  }
});
    
    let _calResizeRaf = 0;
    let _calResizeTimer = 0;

    function scheduleCalendarResizeUpdate() {
      if (currentMode !== MODES.DAYS) return;

      
      if (!_calResizeRaf) {
        _calResizeRaf = requestAnimationFrame(() => {
          _calResizeRaf = 0;

          const changed = updateDayCellSize();
          if (changed) {
            
            if (typeof _siglaFitCache !== "undefined" && _siglaFitCache && typeof _siglaFitCache.clear === "function") {
              _siglaFitCache.clear();
            }

            
            if (isCalendarViewActive()) {
              reflowTurnoSigle();
            }
          }
        });
      }

      
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


})();


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
    
    markSaved() {
      this.setSaving();

      setTimeout(() => {
        this.setOk();
      }, this.SPINNER_MS);
    }
    
  };
  
  window.Status = Status;  

})();


(function () {
  
  if (!window.AppConfig) {
    throw new Error("CONFIG.MISSING: AppConfig non disponibile (theme.js)");
  }

  const { STORAGE_KEYS, UI } = window.AppConfig;
  const THEME_KEY    = STORAGE_KEYS.theme;
  const THEME_LABELS = UI.themeLabels || {};
  
  function applyTheme(theme) {
    const root = document.documentElement;

    if (theme === "light" || theme === "dark") {
      root.setAttribute("data-theme", theme);
    } else {
      root.removeAttribute("data-theme");
    }
  }

  
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
  
  function fillThemeLabels() {
    const labels = document.querySelectorAll("[data-theme-label]");
    labels.forEach(el => {
      const key = el.dataset.themeLabel;
      if (!key) return;

      const txt = THEME_LABELS[key];
      if (typeof txt === "string" && txt.trim() !== "") {
        el.textContent = txt;
      } else {
        
        el.textContent = key;
      }
    });
  }
  
  function loadTheme() {
    let saved = localStorage.getItem(THEME_KEY);
    if (!saved) saved = "system";

    applyTheme(saved);
    syncThemeUI(saved);
  }

  
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
 

  function initTheme() {
    fillThemeLabels();
    loadTheme();
    setupThemeControls();
  }

  window.Theme = {
    init: initTheme
  };
  

})();


(function () {

  
  if (!window.AppConfig) {
    throw new Error("CONFIG.MISSING: AppConfig non disponibile (icons.js)");
  }

  const { PATHS } = window.AppConfig;
  const SVG_BASE = PATHS.svgBase;
  
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
  
  async function loadTabbarIcons() {
    
    await loadSVGInto("icoCalendar", "calendar.svg");
    setCalendarIconDateInSvg();

    await loadSVGInto("icoInspag", "inspag.svg");

    await loadSVGInto("icoRiepilogo", "riepilogo.svg");
    
    await loadSVGInto("icoSettings", "settings.svg");
    
    const tabbar = document.querySelector(".tabbar");
    if (tabbar) {
      tabbar.classList.add("tabbar-icons-ready");
    }
  }
  
  
  async function loadStatusIcon() {
    await loadSVGInto("icoStatus", "login.svg");
  }
  
  window.Icons = {
    initTabbar: loadTabbarIcons,
    loadStatusIcon
  };
  

})();


(function () {

  
  if (!window.AppConfig) {
    throw new Error("CONFIG.MISSING: AppConfig non disponibile (turni-storage.js)");
  }

  const { STORAGE_KEYS } = window.AppConfig;

  const TURNI_KEY     = STORAGE_KEYS.turni;
  const TURNI_VIS_KEY = STORAGE_KEYS.turniVisualizza;
  
  const TURNAZIONI_KEY = STORAGE_KEYS.turnazioni;
  const TURNAZIONI_PREF_KEY = STORAGE_KEYS.turnazioniPreferred;
  
  const TURNI_START_KEY = STORAGE_KEYS.turniStart;

  const FEST_KEY = STORAGE_KEYS.festivita;

function emitStorageChange(key) {
  try {
    window.dispatchEvent(new CustomEvent("turnipds:storage-changed", { detail: { key: String(key || "") } }));
  } catch {}
}

  function seedFactoryDefaultsIfNeeded() {
    try {
      let seeded = false;

        if (!localStorage.getItem(FEST_KEY)) {
        const defs = [
          { type: "fixed", d: 1,  m: 1,  nome: "Capodanno", livello: "festivo", custom: false },
          { type: "fixed", d: 6,  m: 1,  nome: "Epifania", livello: "festivo", custom: false },
          { type: "easter", offset: 0, nome: "Pasqua", livello: "festivo", custom: false },
          { type: "easter", offset: 1, nome: "Lunedì dell'Angelo", livello: "festivo", custom: false },
          { type: "fixed", d: 25, m: 4,  nome: "Festa della Liberazione", livello: "festivo", custom: false },
          { type: "fixed", d: 1,  m: 5,  nome: "Festa dei Lavoratori", livello: "festivo", custom: false },
          { type: "fixed", d: 2,  m: 6,  nome: "Festa della Repubblica", livello: "festivo", custom: false },
          { type: "fixed", d: 15, m: 8,  nome: "Ferragosto", livello: "festivo", custom: false },
          { type: "fixed", d: 1,  m: 11, nome: "Ognissanti", livello: "festivo", custom: false },
          { type: "fixed", d: 8,  m: 12, nome: "Immacolata Concezione", livello: "festivo", custom: false },
          { type: "fixed", d: 25, m: 12, nome: "Natale", livello: "festivo", custom: false },
          { type: "fixed", d: 26, m: 12, nome: "Santo Stefano", livello: "festivo", custom: false }
        ];
        localStorage.setItem(FEST_KEY, JSON.stringify(defs));
        seeded = true;
      }

      const hasTurni = !!localStorage.getItem(TURNI_KEY);
      const hasTurnazioni = !!localStorage.getItem(TURNAZIONI_KEY);
      const hasStart = !!localStorage.getItem(TURNI_START_KEY);

      if (hasTurni || hasTurnazioni || hasStart) return seeded;

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
  
  function loadVisualToggle() {
    try {
      const raw = localStorage.getItem(TURNI_VIS_KEY);
      if (raw === "true") return true;
      if (raw === "false") return false;
      return true; 
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

    try {
      document.dispatchEvent(new CustomEvent("turnazioni:changed", {
        detail: { source: "TurniStorage.saveTurnazioni" }
      }));
    } catch {}

    if (window.Status && typeof Status.markSaved === "function") {
      Status.markSaved();
    }
  } catch (e) {
    console.warn("Salvataggio turnazioni fallito:", e);
  }
}


function syncTurnazioniForTurnoChange(prevTurno, nextTurno) {
  const prev = prevTurno && typeof prevTurno === "object" ? prevTurno : null;
  const next = nextTurno && typeof nextTurno === "object" ? nextTurno : null;
  if (!prev || !next) return false;

  const prevSigla = prev.sigla != null ? String(prev.sigla).trim() : "";
  const prevNome  = prev.nome  != null ? String(prev.nome).trim()  : "";

  const nextSlot = {
    nome: next.nome != null ? String(next.nome).trim() : "",
    sigla: next.sigla != null ? String(next.sigla).trim() : "",
    colore: next.colore != null ? String(next.colore).trim() : ""
  };

  if (!nextSlot.sigla && !nextSlot.nome) return false;

  const all = loadTurnazioni();
  if (!Array.isArray(all) || !all.length) return false;

  let changed = false;

  const match = (slotObj) => {
    if (!slotObj || typeof slotObj !== "object") return false;
    const sSigla = slotObj.sigla != null ? String(slotObj.sigla).trim() : "";
    const sNome  = slotObj.nome  != null ? String(slotObj.nome).trim()  : "";

    
    if (prevSigla && sSigla && sSigla === prevSigla) return true;
    if (prevNome && sNome && sNome === prevNome) return true;
    return false;
  };

  all.forEach((t) => {
    if (!t || typeof t !== "object") return;

    if (Array.isArray(t.slots)) {
      t.slots = t.slots.map((s) => {
        if (!match(s)) return s;
        changed = true;
        return Object.assign({}, s, nextSlot);
      });
    }

    if (t.riposiFissi && typeof t.riposiFissi === "object") {
      Object.keys(t.riposiFissi).forEach((k) => {
        const rf = t.riposiFissi[k];
        if (!match(rf)) return;
        changed = true;
        t.riposiFissi[k] = Object.assign({}, rf, nextSlot);
      });
    }
  });

  if (!changed) return false;
  saveTurnazioni(all);
  return true;
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
  

  function getPreferredTurnazione() {
    const all = loadTurnazioni();
    if (!Array.isArray(all) || all.length === 0) return null;

    const preferredId = loadPreferredTurnazioneId();
    if (preferredId) {
      const pick = all.find(t => String(t.id) === String(preferredId));
      if (pick) return pick;
    }

    return all[all.length - 1] || null;
  }

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

  
  function loadFestivitaDefs() {
    try {
      seedFactoryDefaultsIfNeeded();
      const raw = localStorage.getItem(FEST_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveFestivitaDefs(arr) {
    try {
      localStorage.setItem(FEST_KEY, JSON.stringify(Array.isArray(arr) ? arr : []));
      emitStorageChange(FEST_KEY);
      if (window.Status && typeof Status.markSaved === "function") {
        Status.markSaved();
      }
    } catch (e) {
      console.warn("Salvataggio festività fallito:", e);
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
  

  window.TurniStorage = {
    seedFactoryDefaultsIfNeeded,
    loadTurni,
    saveTurni,
    loadVisualToggle,
    saveVisualToggle,
    isValidTime,
    
    loadTurnazioni,
    saveTurnazioni,
    syncTurnazioniForTurnoChange,
    loadPreferredTurnazioneId,
    savePreferredTurnazioneId,
    
    getPreferredTurnazione,
    loadTurnoIniziale,
    saveTurnoIniziale,

    loadFestivita: loadFestivitaDefs,
    saveFestivita: saveFestivitaDefs
  };
  


})();

(function () {
  function pad2(n) { return String(n).padStart(2, '0'); }

  function easterDate(year) {
    const y = parseInt(year, 10);
    const a = y % 19;
    const b = Math.floor(y / 100);
    const c = y % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(y, month - 1, day);
  }

  function addDays(dateObj, days) {
    const d = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
    d.setDate(d.getDate() + (Number(days) || 0));
    return d;
  }

  function iso(d) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }

  const MESI = [
    'Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
    'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'
  ];

  const FEST_KEY = (window.AppConfig && window.AppConfig.STORAGE_KEYS)
    ? window.AppConfig.STORAGE_KEYS.festivita
    : 'turnipds-festivita';

  let defs = [];
  let isEditing = false;
  let cacheYear = null;
  let cacheMap = null;

  let panel = null;
  let listEl = null;
  let btnEdit = null;
  let btnAdd = null;

  let panelAdd = null;
  let inputNome = null;
  let inputData = null;
  let levelBtns = [];
  let btnSave = null;
  let errEl = null;

  let editingIndex = null;
  let selectedLevel = 'festivo';

  function getDefs() {
    const t = (window.TurniStorage && typeof TurniStorage.loadFestivita === 'function')
      ? TurniStorage.loadFestivita()
      : [];
    return Array.isArray(t) ? t : [];
  }

  function normalizeDefs(list) {
    const arr = Array.isArray(list) ? list : [];
    let changed = false;

    const out = arr.map((it) => {
      const o = (it && typeof it === 'object') ? { ...it } : null;
      if (!o) return null;
      if (o.livello !== 'festivo' && o.livello !== 'superfestivo') {
        o.livello = 'festivo';
        changed = true;
      }
      if (typeof o.custom !== 'boolean') {
        o.custom = false;
        changed = true;
      }
      return o;
    }).filter(Boolean);

    if (changed && window.TurniStorage && typeof TurniStorage.saveFestivita === 'function') {
      TurniStorage.saveFestivita(out);
    }

    return out;
  }

  function resolveDateForDef(def, year) {
    const y = parseInt(year, 10);
    const type = String(def.type || 'fixed');
    if (type === 'easter') {
      const base = easterDate(y);
      const off = Number(def.offset) || 0;
      return addDays(base, off);
    }
    const dd = parseInt(def.d, 10);
    const mm = parseInt(def.m, 10);
    if (!dd || !mm) return null;
    return new Date(y, mm - 1, dd);
  }

  function buildListForYear(year) {
    const y = parseInt(year, 10);
    const out = [];
    defs.forEach((it, idx) => {
      if (!it || typeof it !== 'object') return;
      const dObj = resolveDateForDef(it, y);
      if (!dObj) return;
      const nome = (typeof it.nome === 'string') ? it.nome : '';
      if (!nome) return;
      const livello = (it.livello === 'superfestivo') ? 'superfestivo' : 'festivo';
      const custom = !!it.custom;
      out.push({
        defIndex: idx,
        dateObj: dObj,
        iso: iso(dObj),
        d: dObj.getDate(),
        m: dObj.getMonth() + 1,
        nome,
        livello,
        custom
      });
    });
    out.sort((a, b) => (a.m - b.m) || (a.d - b.d));
    return out;
  }

  function buildMapForYear(year) {
    const y = parseInt(year, 10);
    if (cacheYear === y && cacheMap) return cacheMap;
    const map = new Map();
    buildListForYear(y).forEach((it) => {
      map.set(it.iso, it.nome);
    });
    cacheYear = y;
    cacheMap = map;
    return map;
  }

  function getNomeForDate(dateObj) {
    if (!(dateObj instanceof Date)) return null;
    const y = dateObj.getFullYear();
    const map = (cacheYear === y && cacheMap) ? cacheMap : buildMapForYear(y);
    return map.get(iso(dateObj)) || null;
  }

  function setEditButtonState() {
    if (!btnEdit) return;

    if (!listEl || !defs.length) {
      btnEdit.disabled = true;
      btnEdit.classList.remove('icon-circle-btn');
      btnEdit.textContent = 'Modifica';
      btnEdit.removeAttribute('aria-pressed');
      return;
    }

    btnEdit.disabled = false;

    if (isEditing) {
      btnEdit.setAttribute('aria-pressed', 'true');
      btnEdit.classList.add('icon-circle-btn');
      btnEdit.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M6 12.5 L10 16.5 L18 7.5" />
        </svg>
      `;
    } else {
      btnEdit.removeAttribute('aria-pressed');
      btnEdit.classList.remove('icon-circle-btn');
      btnEdit.textContent = 'Modifica';
    }
  }

  function renderSettingsPanel() {
    if (!panel) {
      panel = document.querySelector('.settings-panel.settings-festivita[data-settings-id="festivita"]');
    }
    if (!panel) return;

    panel.innerHTML = '';

    const group = document.createElement('div');
    group.className = 'settings-group';

    const hint = document.createElement('p');
    hint.className = 'settings-hint';
    hint.textContent = 'Festività nazionali + personalizzate.';
    group.appendChild(hint);

    const actionsBar = document.createElement('div');
    actionsBar.className = 'turni-card-header';

    const actionsLeft = document.createElement('div');

    const actions = document.createElement('div');
    actions.className = 'turni-card-actions';

    btnEdit = document.createElement('button');
    btnEdit.className = 'pill-btn';
    btnEdit.type = 'button';
    btnEdit.textContent = 'Modifica';
    btnEdit.setAttribute('data-festivita-edit', '');

    btnAdd = document.createElement('button');
    btnAdd.className = 'icon-circle-btn';
    btnAdd.type = 'button';
    btnAdd.setAttribute('data-festivita-add', '');
    btnAdd.setAttribute('aria-label', 'Aggiungi festività');
    btnAdd.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <use href="#ico-plus"></use>
      </svg>
    `;

    actions.appendChild(btnEdit);
    actions.appendChild(btnAdd);

    actionsBar.appendChild(actionsLeft);
    actionsBar.appendChild(actions);

    const card = document.createElement('div');
    card.className = 'turni-card festivita-card';

    listEl = document.createElement('div');
    listEl.className = 'turni-list';
    listEl.classList.toggle('editing', isEditing);

    const y = new Date().getFullYear();
    const rows = buildListForYear(y);

    rows.forEach((it) => {
      const row = document.createElement('div');
      row.className = 'turno-item turno-item--festivita';
      row.dataset.index = String(it.defIndex);

      if (isEditing && it.custom) {
        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'turno-delete-btn';
        delBtn.setAttribute('aria-label', 'Elimina festività');
        const iconSpan = document.createElement('span');
        iconSpan.className = 'turno-delete-icon';
        iconSpan.textContent = '−';
        delBtn.appendChild(iconSpan);
        delBtn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          deleteFestivita(it.defIndex);
        });
        row.appendChild(delBtn);
      }

      const left = document.createElement('div');
      left.className = 'festivita-left';

      const dd = String(it.d).padStart(2, '0');
      const mese = MESI[(Number(it.m) || 1) - 1] || '';

      const dateEl = document.createElement('span');
      dateEl.className = 'turno-name festivita-date';
      dateEl.textContent = `${dd} ${mese}`;

      const nomeEl = document.createElement('span');
      nomeEl.className = 'turno-orario festivita-nome';
      nomeEl.textContent = it.nome;

      left.appendChild(dateEl);
      left.appendChild(nomeEl);

      const rightEl = document.createElement('span');
      rightEl.className = 'turno-orario festivita-tag';
      rightEl.textContent = (it.livello === 'superfestivo') ? 'Superfestivo' : 'Festivo';

      row.appendChild(left);
      row.appendChild(rightEl);

      listEl.appendChild(row);
    });

    card.appendChild(listEl);
    group.appendChild(actionsBar);
    group.appendChild(card);
    panel.appendChild(group);

    attachInteractions();
    setEditButtonState();
  }

  function clearAddError() {
    if (errEl) errEl.hidden = true;
    if (inputNome) inputNome.classList.remove('is-invalid');
    if (inputData) inputData.classList.remove('is-invalid');
  }

  function showAddError() {
    if (errEl) errEl.hidden = false;
  }

  function setLevel(next) {
    selectedLevel = (next === 'superfestivo') ? 'superfestivo' : 'festivo';
    levelBtns.forEach((b) => {
      const v = b ? String(b.dataset.festivitaLevel || '') : '';
      b.classList.toggle('is-on', v === selectedLevel);
    });
  }

  function resetAddForm() {
    clearAddError();
    editingIndex = null;
    if (inputNome) inputNome.value = '';
    if (inputData) {
      inputData.value = '';
      inputData.disabled = false;
    }
    setLevel('festivo');
  }

  function openNewPanel() {
    if (!panelAdd) return;
    resetAddForm();
    panelAdd.dataset.settingsTitle = 'Aggiungi festività';
    if (window.SettingsUI && typeof SettingsUI.openPanel === 'function') {
      SettingsUI.openPanel('festivita-add', { internal: true });
    }
  }

  function openEditPanel(defIndex) {
    const idx = parseInt(defIndex, 10);
    if (!Number.isInteger(idx) || idx < 0 || idx >= defs.length) return;
    const def = defs[idx];
    if (!def) return;
    if (!panelAdd) return;

    resetAddForm();
    editingIndex = idx;
    panelAdd.dataset.settingsTitle = 'Modifica festività';

    if (inputNome) inputNome.value = def.nome || '';

    const y = new Date().getFullYear();
    const dObj = resolveDateForDef(def, y);
    if (inputData && dObj) {
      inputData.value = iso(dObj);
      inputData.disabled = !def.custom;
    }

    setLevel(def.livello === 'superfestivo' ? 'superfestivo' : 'festivo');

    if (window.SettingsUI && typeof SettingsUI.openPanel === 'function') {
      SettingsUI.openPanel('festivita-add', { internal: true });
    }
  }

  function deleteFestivita(defIndex) {
    const idx = parseInt(defIndex, 10);
    if (!Number.isInteger(idx) || idx < 0 || idx >= defs.length) return;
    const def = defs[idx];
    if (!def || !def.custom) return;

    defs.splice(idx, 1);
    if (window.TurniStorage && typeof TurniStorage.saveFestivita === 'function') {
      TurniStorage.saveFestivita(defs);
    }
    cacheYear = null;
    cacheMap = null;
    if (editingIndex === idx) editingIndex = null;
    renderSettingsPanel();
  }

  function saveFromPanel() {
    clearAddError();
    const nome = (inputNome && inputNome.value != null) ? String(inputNome.value).trim() : '';
    const dateStr = (inputData && inputData.value != null) ? String(inputData.value).trim() : '';

    let hasError = false;
    if (!nome) { if (inputNome) inputNome.classList.add('is-invalid'); hasError = true; }
    if (editingIndex === null && !dateStr) { if (inputData) inputData.classList.add('is-invalid'); hasError = true; }

    const idx = (editingIndex !== null) ? Number(editingIndex) : null;
    const def = (idx !== null && idx >= 0 && idx < defs.length) ? defs[idx] : null;
    const isCustom = def ? !!def.custom : true;

    if (def && !isCustom) {
      if (hasError) {
        showAddError();
        return;
      }
      defs[idx] = { ...def, nome, livello: selectedLevel };
    } else {
      const parts = dateStr.split('-');
      const mm = parseInt(parts[1], 10);
      const dd = parseInt(parts[2], 10);
      if (!mm || !dd) { if (inputData) inputData.classList.add('is-invalid'); hasError = true; }
      if (hasError) {
        showAddError();
        return;
      }

      if (def) {
        defs[idx] = { ...def, type: 'fixed', d: dd, m: mm, nome, livello: selectedLevel, custom: true };
      } else {
        const existingIdx = defs.findIndex((x) => {
          if (!x || typeof x !== 'object') return false;
          if (!x.custom) return false;
          const type = String(x.type || 'fixed');
          if (type !== 'fixed') return false;
          return parseInt(x.d, 10) === dd && parseInt(x.m, 10) === mm;
        });

        const payload = { type: 'fixed', d: dd, m: mm, nome, livello: selectedLevel, custom: true };
        if (existingIdx >= 0) defs[existingIdx] = payload;
        else defs.push(payload);
      }
    }

    if (window.TurniStorage && typeof TurniStorage.saveFestivita === 'function') {
      TurniStorage.saveFestivita(defs);
    }

    cacheYear = null;
    cacheMap = null;
    isEditing = false;
    renderSettingsPanel();

    if (window.SettingsUI && typeof SettingsUI.openPanel === 'function') {
      SettingsUI.openPanel('festivita', { internal: true });
    }
  }

  let _wired = false;
  function attachInteractions() {
    if (btnAdd) {
      btnAdd.addEventListener('click', (e) => {
        e.stopPropagation();
        openNewPanel();
      });
    }

    if (window.TurniInteractions && typeof TurniInteractions.attachEditToggle === 'function') {
      TurniInteractions.attachEditToggle({
        btnEdit,
        canEdit: () => Array.isArray(defs) && defs.length > 0,
        getEditing: () => isEditing,
        setEditing: (v) => { isEditing = !!v; },
        refresh: renderSettingsPanel
      });
    }

    if (window.TurniInteractions && typeof TurniInteractions.attachRowEditClick === 'function') {
      TurniInteractions.attachRowEditClick({
        listEl,
        getEditing: () => isEditing,
        onEditRow: (idx) => openEditPanel(idx)
      });
    }

    if (_wired) return;
    _wired = true;

    panelAdd = document.querySelector('.settings-panel.settings-festivita-add[data-settings-id="festivita-add"]');
    inputNome = document.getElementById('festivitaNome');
    inputData = document.getElementById('festivitaData');
    btnSave = document.querySelector('[data-festivita-save]');
    errEl = document.querySelector('[data-festivita-error]');
    levelBtns = Array.from(document.querySelectorAll('[data-festivita-level]'));

    if (inputNome) inputNome.addEventListener('input', clearAddError);
    if (inputData) inputData.addEventListener('input', clearAddError);

    levelBtns.forEach((b) => {
      b.addEventListener('click', () => {
        setLevel(String(b.dataset.festivitaLevel || 'festivo'));
      });
    });

    if (btnSave) {
      btnSave.addEventListener('click', () => saveFromPanel());
    }
  }

  function refreshFromStorage() {
    defs = normalizeDefs(getDefs());
    cacheYear = null;
    cacheMap = null;
  }

  function init() {
    panel = document.querySelector('.settings-panel.settings-festivita[data-settings-id="festivita"]');
    refreshFromStorage();
    renderSettingsPanel();

    window.addEventListener('turnipds:storage-changed', (ev) => {
      const k = ev && ev.detail ? String(ev.detail.key || '') : '';
      if (k && k !== FEST_KEY) return;
      refreshFromStorage();
      renderSettingsPanel();
    });
  }

  window.Festivita = { init, getNomeForDate };
})();


(function () {

  function getSiglaFontSizePx(siglaText) {
    const len = (siglaText || "").length;

    if (len <= 2) return 15;
    if (len === 3) return 14;
    return 11.5;
  }

  // Unica sorgente di verità per lo sizing delle sigle (preview + liste).
  window.SiglaSizing = window.SiglaSizing || {};
  window.SiglaSizing.getFontSizePx = getSiglaFontSizePx;

  function applySiglaFontSize(el, siglaText) {
    if (!el) return;
    const sizePx = getSiglaFontSizePx(siglaText);
    el.style.fontSize = `${sizePx}px`;
  }


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

    
    listEl.classList.toggle("editing", isEditing);

    if (emptyHintEl) {
      emptyHintEl.hidden = true;
    }

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

    turni.forEach((t, index) => {
      const row = document.createElement("div");
      row.className = "turno-item";
      
      row.dataset.index = String(index);

      
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

      
      const siglaPill = document.createElement("span");
      siglaPill.className = "turno-sigla-pill";

      const siglaEl = document.createElement("span");
      siglaEl.className = "turno-sigla";
      const siglaTxt = t.sigla || "";
      siglaEl.textContent = siglaTxt;
      if (t.colore) {
        siglaEl.style.color = t.colore;
      }
      
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

  window.TurniRender = {
    applySiglaFontSize,
    renderTurni
  };

})();

(function () {
  window.SiglaSizing = window.SiglaSizing || {};

  // Preview (celle quadrate): sizing semplice e coerente
  window.SiglaSizing.preview = function (el, txt) {
    if (!el) return;
    const sizePx = (window.SiglaSizing && typeof SiglaSizing.getFontSizePx === "function")
      ? SiglaSizing.getFontSizePx(txt)
      : 15;
    el.style.fontSize = `${sizePx}px`;
  };
})();

(function () {
	
	let openEditTurnazioneImpl = null;
	let clearEditTurnazioneImpl = null;

  
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

  function getPreferred(savedTurnazioni, preferredId) {
    if (!Array.isArray(savedTurnazioni) || savedTurnazioni.length === 0) return null;

    let pick = null;
    if (preferredId) {
      pick = savedTurnazioni.find(t => String(t.id) === String(preferredId)) || null;
    }
    if (!pick) pick = savedTurnazioni[savedTurnazioni.length - 1];
    return pick;
  }
  
function renderTurnazioni(listEl, turnazioni, emptyHintEl, editBtn, options) {
  if (!listEl) return;

  const opts = options || {};
  const isEditing = !!opts.isEditing;
  const onDelete = typeof opts.onDelete === "function" ? opts.onDelete : null;

  
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

    
    if (onSelect) {
      row.addEventListener("click", () => onSelect(index));
    }

    listEl.appendChild(row);
  });
}
  
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
      
      this.editBtn = ctx && ctx.turnazioniEditBtn ? ctx.turnazioniEditBtn : null;

      this.refresh();
    },


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

      
      if (this.preferredId && has) {
        const ok = this.saved.some(t => String(t.id) === String(this.preferredId));
        if (!ok) this.preferredId = null;
      }

      
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
            
            this.refresh(options);
            this.syncVisualHint();
            this.notifyTurnoIniziale();
          }
        }
      );

      this.syncVisualHint();
      this.notifyTurnoIniziale();
    },


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


    notifyTurnoIniziale() {
      if (window.Turni && typeof Turni.syncTurnoInizialeUI === "function") {
        Turni.syncTurnoInizialeUI();
      }
      // Notifica disaccoppiata: chiunque ascolti (es. TurniStart) si aggiorna da solo
      document.dispatchEvent(new CustomEvent("turnazioni:changed", {
        detail: { source: "TurnazioniList.notifyTurnoIniziale" }
      }));
    }
  };

  window.TurnazioniList = api;

})();



(function () {


  function sameTurno(a, b) {
    if (!a || !b) return false;
    const an = (a.nome || "").trim();
    const as = (a.sigla || "").trim();
    const bn = (b.nome || "").trim();
    const bs = (b.sigla || "").trim();
    return an === bn && as === bs;
  }


  function initTurnazioniAddUI(ctx) {
    if (!window.TurniStorage) return;
    if (!window.TurniRender) return;


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


    const turnazioniListEl = (ctx && ctx.turnazioniListEl)
      ? ctx.turnazioniListEl
      : (panelTurni ? panelTurni.querySelector("[data-turnazioni-list]") : null);

    const turnazioniEmptyEl = (ctx && ctx.turnazioniEmptyEl)
      ? ctx.turnazioniEmptyEl
      : (panelTurni ? panelTurni.querySelector("[data-turnazioni-empty-hint]") : null);

    const visualHintEl = (ctx && ctx.visualHintEl)
      ? ctx.visualHintEl
      : (panelTurni ? panelTurni.querySelector("[data-turni-visual-hint]") : null);

    
    const btnSave = panelAdd.querySelector("[data-turnazioni-save]");
    const errEl   = panelAdd.querySelector("[data-turnazioni-error]");
    const errorCtl = (window.UIFeedback && typeof UIFeedback.createTempError === "function")
      ? UIFeedback.createTempError(errEl, 2000)
      : null;

    
    const select = panelAdd.querySelector("#turnazioniDaysSelect");
    const input  = panelAdd.querySelector("#turnazioniDaysInput");
    const grid   = panelAdd.querySelector("#turnazioniDaysGrid");

    const subtitleEl    = panelAdd.querySelector("#turnazioniDaysSubtitle");
    const placeholderEl = panelAdd.querySelector("#turnazioniDaysPlaceholder");
    
    const nameInput = panelAdd.querySelector("#turnazioniNome");
    
    const pickListEl = panelPick ? panelPick.querySelector("#turnazioniPickList") : null;
    const pickEmpty  = panelPick ? panelPick.querySelector("#turnazioniPickEmpty") : null;
    const pickHint   = panelPick ? panelPick.querySelector("#turnazioniPickHint") : null;
    
    const restRowEl    = panelPick ? panelPick.querySelector("#turnazioniPickRestRow") : null;
    const restToggleEl = panelPick ? panelPick.querySelector("#turnazioniRestToggle") : null;
    
    const restDaysBtns = panelAdd.querySelectorAll('[data-turnazioni-rest-days]');
    
    let isDirty = false;
    let lastSaveTs = 0;
    function markDirty() { isDirty = true; }
    
    let rotationDaysCount = null;                
    let rotationSlots = new Array(7).fill(null); 
    let activePickIndex = null;                  
    
    let restDaysAllowed = 1; 
    let restDayIndices = [];

    const hasStorage =
      window.TurniStorage &&
      typeof TurniStorage.loadTurnazioni === "function" &&
      typeof TurniStorage.saveTurnazioni === "function" &&
      typeof TurniStorage.loadPreferredTurnazioneId === "function" &&
      typeof TurniStorage.savePreferredTurnazioneId === "function";

    let savedTurnazioni = hasStorage ? TurniStorage.loadTurnazioni() : [];
    let preferredId     = hasStorage ? TurniStorage.loadPreferredTurnazioneId() : null;

	    
	    let editingIndex = null; 
	    let editingId = null;    
	    const originalPanelTitle = panelAdd.dataset.settingsTitle || "Aggiungi turnazione";

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
      if (window.SiglaSizing && typeof SiglaSizing.preview === "function") {
        SiglaSizing.preview(el, txt);
        return;
      }
      if (window.TurniRender && typeof TurniRender.applySiglaFontSize === "function") {
        TurniRender.applySiglaFontSize(el, txt);
      }
    }
    
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
            restDayIndices.shift(); 
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

    function renderPickList() {
      if (!pickListEl) return;

      const turni = (window.TurniStorage && typeof TurniStorage.loadTurni === "function")
        ? TurniStorage.loadTurni()
        : [];

      const hasTurni = Array.isArray(turni) && turni.length > 0;
      const selected = (activePickIndex !== null) ? rotationSlots[activePickIndex] : null;

      renderTurnazioniPickList({
        listEl: pickListEl,
        emptyEl: pickEmpty,
        items: hasTurni ? turni : [],
        isSelected: (t) => !!(selected && sameTurno(selected, t)),
        getLabel: (t) => (t && t.nome) ? String(t.nome) : "",
        onPick: (t) => {
          if (activePickIndex !== null) setSlotFromTurno(activePickIndex, t);

          if (window.SettingsUI && typeof SettingsUI.openPanel === "function") {
            SettingsUI.openPanel("turnazioni-add", { internal: true });
          }
        }
      });
    }


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
      
      
      if (typeof syncRiposiFissiEnabled === "function") syncRiposiFissiEnabled();
    }
    
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

      
      const headerEl = cardEl.querySelector(".turnazioni-riposo-header");
      let disabledHintEl = cardEl.querySelector("[data-turnazioni-riposo-disabled-hint]");
      if (!disabledHintEl) {
        disabledHintEl = document.createElement("p");
        disabledHintEl.className = "turnazioni-riposo-disabled-hint";
        disabledHintEl.setAttribute("data-turnazioni-riposo-disabled-hint", "");
        
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

        
        if (!sigla) return null;

        return { nome, sigla, colore };
      }

      
      function setData(data) {
        if (!data) {
          reset();
          return;
        }

        
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

    
    syncRiposiFissiEnabled = function () {
      if (riposo1 && typeof riposo1.syncEnabled === "function") riposo1.syncEnabled();
      if (riposo2 && typeof riposo2.syncEnabled === "function") riposo2.syncEnabled();
    };

    
    if (typeof syncRiposiFissiEnabled === "function") syncRiposiFissiEnabled();

    riposo1Reset = riposo1 && typeof riposo1.reset === "function" ? riposo1.reset : null;
    riposo2Reset = riposo2 && typeof riposo2.reset === "function" ? riposo2.reset : null;

    riposo1GetData = riposo1 && typeof riposo1.getData === "function" ? riposo1.getData : null;
    riposo2GetData = riposo2 && typeof riposo2.getData === "function" ? riposo2.getData : null;

    riposo1SetData = riposo1 && typeof riposo1.setData === "function" ? riposo1.setData : null;
    riposo2SetData = riposo2 && typeof riposo2.setData === "function" ? riposo2.setData : null;

    
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
	      
	      panelAdd.dataset.settingsTitle = originalPanelTitle;
	    }

	    function enterEditTurnazione(turnazione, index) {
	      if (!turnazione) return;
	      editingIndex = (typeof index === "number") ? index : null;
	      editingId = turnazione && turnazione.id != null ? String(turnazione.id) : null;
	      panelAdd.dataset.settingsTitle = "Modifica turnazione";

	      clearError();

	      
	      if (nameInput) nameInput.value = (turnazione.name || "");

	      
	      const days = Number(turnazione.days) || null;
	      rotationDaysCount = days;
	      if (select) select.value = days ? String(days) : "";
	      if (input) input.value = days ? String(days) : "";

	      
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

	      
	      restDaysAllowed = clampRestDaysAllowed(turnazione.restDaysAllowed);
	      restDayIndices = Array.isArray(turnazione.restIndices)
	        ? turnazione.restIndices.slice(0, restDaysAllowed)
	        : [];
	      normalizeRestIndicesToAllowed();
	      syncRestDaysCardUI();

        
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
	    
	    openEditTurnazioneImpl = function (turnazione, index) {
	      enterEditTurnazione(turnazione, index);
	      if (window.SettingsUI && typeof SettingsUI.openPanel === "function") {
	        SettingsUI.openPanel("turnazioni-add", { internal: true });
	      }
	    };
	    clearEditTurnazioneImpl = function () {
	      clearEditContext();
	    };
    
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
	        
	        const payload = buildPayload(v.name, v.days, editingId);

	        savedTurnazioni = TurniStorage.loadTurnazioni();
	        if (editingIndex !== null && editingIndex >= 0 && editingIndex < savedTurnazioni.length) {
	          savedTurnazioni[editingIndex] = payload;
	        } else {
	          savedTurnazioni.push(payload);
	        }
	        TurniStorage.saveTurnazioni(savedTurnazioni);

	        
	        preferredId = String(payload.id);
	        TurniStorage.savePreferredTurnazioneId(preferredId);

        lastSaveTs = Date.now();
        isDirty = false;

	        
	        if (window.TurnazioniList) {
	          TurnazioniList.refresh();
	        }

	        
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
    
    if (select && input && grid) {
      renderDaysGrid(null);

      if (nameInput) nameInput.addEventListener("input", markDirty);

      
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

    
    if (window.SettingsUI && typeof SettingsUI.onChange === "function") {
      SettingsUI.onChange((prevId, nextId) => {
        if (prevId === "turnazioni-add" && nextId !== "turnazioni-add") {
          const justSaved = (Date.now() - lastSaveTs) < 800;

          
          if (nextId === "turnazioni-pick") return;

	          if (!justSaved) {
	            
	            resetTurnazioneForm();
	            clearEditContext();
	            if (window.Turnazioni && typeof Turnazioni.exitEditMode === "function") {
	              Turnazioni.exitEditMode();
	            }
	          }
        }
      });
    }


    if (window.TurnazioniList && typeof TurnazioniList.init === "function") {
      TurnazioniList.init({
        panelTurni,
        turnazioniListEl,
        turnazioniEmptyEl,
        visualHintEl,
        
        
        turnazioniEditBtn: panelTurni ? panelTurni.querySelector("[data-turnazioni-edit]") : null
      });
    } else {
      
    }


  }

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


})();


(function () {
  
  const Turnazioni = {
    _setCollapsed: null,
	  _exitEditMode: null,
	  exitEditMode() {
	    if (typeof this._exitEditMode === "function") this._exitEditMode();
	  },

    init(ctx) {
      
      const {
        panelTurni,
        turnazioniCard,
        turnazioniToggleBtn,
        turnazioniHeader,
        turnazioniAddBtn,
        turnazioniEditBtn,
        visualHintEl
      } = ctx || {};
      
      if (!panelTurni) {
        
        if (window.TurnazioniAdd && typeof TurnazioniAdd.init === "function") {
          TurnazioniAdd.init(ctx);
        }
        return;
      }
      

      const turnazioniListEl = panelTurni.querySelector("[data-turnazioni-list]");
      const turnazioniEmpty  = panelTurni.querySelector("[data-turnazioni-empty-hint]");
      
      let turnazioniCollapsed = turnazioniCard
        ? turnazioniCard.classList.contains("is-collapsed")
        : true;

      function getCollapsed() { return turnazioniCollapsed; }
      function setCollapsed(v) { turnazioniCollapsed = !!v; }
      
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

  
  if (turnazioniCollapsed && isEditing) {
    isEditing = false;
    refreshList();
  }

  apply();
});

        }
      }
      
      
      if (turnazioniAddBtn) {
        turnazioniAddBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          if (window.SettingsUI && typeof SettingsUI.openPanel === "function") {
            SettingsUI.openPanel("turnazioni-add", { internal: true });
          }
        });
      }
	      
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
	        
	        turnazioniEditBtn.addEventListener("click", (e) => {
	          e.stopPropagation();
	          const list = loadTurnazioni();
	          if (!Array.isArray(list) || !list.length) return;
	          isEditing = !isEditing;
	          refreshList();
	        });
	      }

	      
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
	
	      
	      if (window.SettingsUI && typeof SettingsUI.onChange === "function") {
	        SettingsUI.onChange((prevId, nextId) => {
	          
	          if (prevId === "turni" && nextId !== "turni") {
	            if (isEditing) {
	              isEditing = false;
	              refreshList();
	            }
	          }
	        });
	      }
	      

      if (!this._storageListenerAttached) {
        this._storageListenerAttached = true;

        const keys = (window.AppConfig && window.AppConfig.STORAGE_KEYS) ? window.AppConfig.STORAGE_KEYS : null;
        const KEY_TURNAZIONI = keys ? keys.turnazioni : null;
        const KEY_PREF      = keys ? keys.turnazioniPreferred : null;

        window.addEventListener("turnipds:storage-changed", (ev) => {
          const k = ev && ev.detail && ev.detail.key ? String(ev.detail.key) : "";

          if (k && (k === String(KEY_TURNAZIONI) || k === String(KEY_PREF))) {
            // micro-debounce per evitare refresh multipli nello stesso tick
            try {
              cancelAnimationFrame(this._rafRefreshList || 0);
            } catch {}
            this._rafRefreshList = requestAnimationFrame(() => {
              refreshList();
            });
          }
        });
      }


	      refreshList();
	      
	      this._exitEditMode = () => {
	        if (!isEditing) return;
	        isEditing = false;
	        refreshList();
	      };

      
      this._setCollapsed = (v) => {
        turnazioniCollapsed = !!v;
        if (turnazioniCard && turnazioniToggleBtn) {
          turnazioniCard.classList.toggle("is-collapsed", turnazioniCollapsed);
          turnazioniToggleBtn.setAttribute("aria-expanded", turnazioniCollapsed ? "false" : "true");
        }
      };
      
    }
  };
  

  
  window.Turnazioni = Turnazioni;
  
})();


(function () {

  // Servizio unico: stato/validazione/salvataggio/summary per "Turno Iniziale"
  // UI (pannelli, click, input) resta a TurniStart.
  const TurnoInizialeService = (function () {

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

    function getTodayISO() {
      const d = new Date();
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    }


    function canUse() {
      return !!(window.TurniStorage && typeof TurniStorage.getPreferredTurnazione === "function" && TurniStorage.getPreferredTurnazione());
    }

    function load() {
      if (!window.TurniStorage || typeof TurniStorage.loadTurnoIniziale !== "function") {
        return { date: "", slotIndex: null };
      }
      const d = TurniStorage.loadTurnoIniziale();
      return (d && typeof d === "object")
        ? { date: (d.date || ""), slotIndex: (Number.isInteger(d.slotIndex) ? d.slotIndex : null) }
        : { date: "", slotIndex: null };
    }

    function save(draft) {
      if (!window.TurniStorage || typeof TurniStorage.saveTurnoIniziale !== "function") return false;
      TurniStorage.saveTurnoIniziale({
        date: String((draft && draft.date) ? draft.date : ""),
        slotIndex: (draft && Number.isInteger(draft.slotIndex)) ? draft.slotIndex : null
      });
      return true;
    }

    function validate(draft) {
      if (!canUse()) return false;
      const dateOk = !!(draft && draft.date && String(draft.date).trim());
      const slotOk = !!(draft && Number.isInteger(draft.slotIndex));
      return dateOk && slotOk;
    }

    function applyDefaultsIfEmpty(draft) {
      if (!canUse()) return draft;

      const d = (draft && typeof draft === "object") ? draft : { date: "", slotIndex: null };
      const dateOk = !!(d.date && String(d.date).trim());
      const slotOk = Number.isInteger(d.slotIndex);

      // Se l'utente ha già iniziato a compilare, non tocchiamo nulla.
      if (dateOk || slotOk) return d;

      const t = (window.TurniStorage && typeof TurniStorage.getPreferredTurnazione === "function")
        ? TurniStorage.getPreferredTurnazione()
        : null;
      if (!t) return d;

      const days = Number(t.days) || 0;
      const slots = Array.isArray(t.slots) ? t.slots : [];
      if (!days || !slots.length) return d;

      d.date = getTodayISO();
      d.slotIndex = 0;
      return d;
    }

    function getTurnoLabelForDraft(draft, kind) {
      const t = (window.TurniStorage && typeof TurniStorage.getPreferredTurnazione === "function")
        ? TurniStorage.getPreferredTurnazione()
        : null;
      const idx = (draft && Number.isInteger(draft.slotIndex)) ? draft.slotIndex : null;

      if (!t || idx === null || idx < 0) return "";

      const slots = Array.isArray(t.slots) ? t.slots : [];
      const s = slots[idx] || null;

      if (!s) return "";

      if (kind === "sigla") {
        return (s.sigla ? String(s.sigla).trim() : "");
      }
      // default: nome
      return (s.nome ? String(s.nome).trim() : "");
    }

    function buildSummaryText() {
      if (!window.TurniStorage || typeof TurniStorage.loadTurnoIniziale !== "function") return "";
      const cfg = load();

      const dateTxt = cfg.date ? formatDateShortISO(cfg.date) : "";
      const turnoTxt = getTurnoLabelForDraft(cfg, "sigla");

      if (dateTxt && turnoTxt) return `${dateTxt} · ${turnoTxt}`;
      if (dateTxt) return dateTxt;
      if (turnoTxt) return turnoTxt;
      return "";
    }

    function normalizeISODateYear4(v) {
      if (typeof v !== "string") return "";
      let s = v.trim();

      const firstDash = s.indexOf("-");
      if (firstDash > 4) {
        s = s.slice(0, 4) + s.slice(firstDash);
      } else if (firstDash === -1 && /^\d{5,}$/.test(s)) {
        s = s.slice(0, 4);
      }

      if (s.length > 10) s = s.slice(0, 10);

      return s;
    }

    return {
      formatDateShortISO,
      getTodayISO,
      canUse,
      load,
      save,
      validate,
      applyDefaultsIfEmpty,
      getTurnoLabelForDraft,
      buildSummaryText,
      normalizeISODateYear4
    };
  })();

  window.TurnoInizialeService = TurnoInizialeService;

})();


(function () {

  // UI/controller: usa TurnoInizialeService per tutto ciò che non è UI.
  if (!window.TurnoInizialeService) return;

  const Svc = window.TurnoInizialeService;

  let startRowBtn = null;
  let startSummaryEl = null;
  let startChevronEl = null;

  let panelStart = null;
  let panelStartPick = null;

  let startDateInput = null;
  let startTurnoRow = null;
  let startTurnoSummary = null;

  let startSaveBtn = null;
  let startErrEl = null;
  let startErrCtl = null;

  let startDraft = { date: "", slotIndex: null };
  let isDirty = false;

  let startPickList = null;
  let startPickEmpty = null;

  let visibleByToggle = true;

  function setStartRowEnabled(enabled) {
    if (!startRowBtn) return;
    startRowBtn.classList.toggle("is-disabled", !enabled);
    startRowBtn.setAttribute("aria-disabled", enabled ? "false" : "true");
    if (startChevronEl) startChevronEl.style.display = enabled ? "" : "none";
  }

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

  function syncSummaryUI() {
    const ok = Svc.canUse();

    const txt = ok ? Svc.buildSummaryText() : "";
    if (startSummaryEl) startSummaryEl.textContent = txt;

    if (startTurnoSummary) {
      if (!ok) {
        startTurnoSummary.textContent = "";
      } else {
        startTurnoSummary.textContent = Svc.getTurnoLabelForDraft(startDraft, "nome");
      }
    }

    if (startSaveBtn) {
      startSaveBtn.disabled = !ok;
      startSaveBtn.classList.toggle("is-disabled", !ok);
    }

    setStartRowEnabled(ok);
  }

  function syncPanelDraftUI() {
    if (!panelStart) return;

    if (startDateInput) startDateInput.value = startDraft.date || "";

    if (startTurnoSummary) {
      startTurnoSummary.textContent = Svc.canUse()
        ? Svc.getTurnoLabelForDraft(startDraft, "nome")
        : "";
    }

    if (startSaveBtn) {
      const ok = Svc.canUse();
      startSaveBtn.disabled = !ok;
      startSaveBtn.classList.toggle("is-disabled", !ok);
    }
  }

  function openPanelStart() {
    if (!panelStart) return;
    if (!Svc.canUse()) return;

    startDraft = Svc.load();
    setDirty(false);
    clearStartError();

    startDraft = Svc.applyDefaultsIfEmpty(startDraft);

    syncPanelDraftUI();
    syncSummaryUI();

    if (window.SettingsUI && typeof SettingsUI.openPanel === "function") {
      SettingsUI.openPanel("turni-start", { internal: true });
    }
  }

  function renderPickList() {
    if (!startPickList) return;

    const t = (window.TurniStorage && typeof TurniStorage.getPreferredTurnazione === "function")
      ? TurniStorage.getPreferredTurnazione()
      : null;
    if (!t) {
      renderTurnazioniPickList({ listEl: startPickList, emptyEl: startPickEmpty, items: [] });
      return;
    }

    const days = Number(t.days) || 0;
    const slots = Array.isArray(t.slots) ? t.slots : [];

    const items = [];
    for (let i = 0; i < days; i++) {
      const s = slots[i] || {};
      items.push({
        index: i,
        sigla: s.sigla ? String(s.sigla).trim() : "",
        nome:  s.nome  ? String(s.nome).trim()  : ""
      });
    }

    const selectedIndex = Number.isInteger(startDraft.slotIndex) ? startDraft.slotIndex : null;

    renderTurnazioniPickList({
      listEl: startPickList,
      emptyEl: startPickEmpty,
      items,
      isSelected: (it) => (selectedIndex !== null && it.index === selectedIndex),
      getLabel: (it) => it.nome || it.sigla || "",
      onPick: (it) => {
        startDraft.slotIndex = it.index;
        setDirty(true);
        clearStartError();
        syncPanelDraftUI();

        if (window.SettingsUI && typeof SettingsUI.openPanel === "function") {
          SettingsUI.openPanel("turni-start", { internal: true });
        }
      }
    });
  }

  function syncVisibility(visualOn) {
    visibleByToggle = !!visualOn;
    if (startRowBtn) startRowBtn.hidden = !visibleByToggle;
    syncSummaryUI();
  }

  function syncFromTurnazioniChange() {
    syncSummaryUI();

    // Se sono nel pannello e non ho ancora toccato nulla, applica default coerenti.
    if (panelStart && panelStart.classList.contains("is-active") && !isDirty) {
      startDraft = Svc.applyDefaultsIfEmpty(startDraft);
      syncPanelDraftUI();
    }

    if (panelStartPick && panelStartPick.classList.contains("is-active")) {
      renderPickList();
    }
  }

  function init(ctx) {
    if (!window.TurniStorage) return;

    const panelTurni = ctx && ctx.panelTurni;
    if (!panelTurni) return;

    startRowBtn     = panelTurni.querySelector("[data-turni-start-row]");
    startSummaryEl  = panelTurni.querySelector("[data-turni-start-summary]");
    startChevronEl  = panelTurni.querySelector("[data-turni-start-chevron]");

    // Listener una sola volta: reagisce ai cambi Turnazioni
    if (!init._turnazioniListenerBound) {
      document.addEventListener("turnazioni:changed", () => {
        syncFromTurnazioniChange();
      });
      init._turnazioniListenerBound = true;
    }

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

    startDraft = Svc.load();

    if (startRowBtn) {
      startRowBtn.addEventListener("click", () => {
        if (startRowBtn.classList.contains("is-disabled")) return;
        openPanelStart();
      });
    }

    if (startDateInput) {
      startDateInput.addEventListener("input", () => {
        const before = startDateInput.value || "";
        const norm = Svc.normalizeISODateYear4(before);
        if (norm !== before) startDateInput.value = norm;
      });

      startDateInput.addEventListener("change", () => {
        const before = startDateInput.value || "";
        const norm = Svc.normalizeISODateYear4(before);
        if (norm !== before) startDateInput.value = norm;

        startDraft.date = startDateInput.value || "";
        setDirty(true);
        clearStartError();
        syncPanelDraftUI();
      });
    }

    if (startSaveBtn) {
      startSaveBtn.addEventListener("click", () => {
        if (!Svc.canUse()) return;
        clearStartError();

        if (!Svc.validate(startDraft)) {
          showStartError();
          return;
        }

        Svc.save(startDraft);

        setDirty(false);
        syncSummaryUI();

        if (window.SettingsUI && typeof SettingsUI.openPanel === "function") {
          SettingsUI.openPanel("turni", { internal: true });
        }
      });

      startSaveBtn.disabled = !Svc.canUse();
      startSaveBtn.classList.toggle("is-disabled", startSaveBtn.disabled);
    }

    if (startTurnoRow) {
      startTurnoRow.addEventListener("click", () => {
        if (!Svc.canUse()) return;
        renderPickList();
        if (window.SettingsUI && typeof SettingsUI.openPanel === "function") {
          SettingsUI.openPanel("turni-start-pick", { internal: true });
        }
      });
    }

    syncSummaryUI();

    // Compat: TurnazioniList chiama Turni.syncTurnoInizialeUI()
    if (window.Turni) {
      window.Turni.syncTurnoInizialeUI = syncFromTurnazioniChange;
    }
  }

  window.TurniStart = {
    init,
    syncVisibility,
    syncFromTurnazioniChange
  };

})();


(function () {


  function safeClosest(target, selector) {
    try { return target && target.closest ? target.closest(selector) : null; }
    catch { return null; }
  }

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


  function attachPanelExitReset(opts) {
    const { panelEl, onExit } = opts || {};
    if (!panelEl) return;

    
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

  window.TurniInteractions = {
    attachCollapsibleCard,
    attachEditToggle,
    attachRowEditClick,
    attachDragSort,
    attachPanelExitReset
  };


})();

(function () {
  if (!window.AppConfig) {
    throw new Error("CONFIG.MISSING: AppConfig non disponibile (turni.js)");
  }

  let exitEditModeImpl = function () {};

  function initTurniPanel() {
    const settingsView = document.querySelector(".view-settings");
    if (!settingsView) return;

    if (!window.TurniStorage || !window.TurniRender) {
      console.error("Turni: TurniStorage o TurniRender non disponibili");
      return;
    }

    const {
      loadTurni,
      saveTurni,
      isValidTime,
      loadVisualToggle,
      saveVisualToggle
    } = window.TurniStorage;

    const { renderTurni, applySiglaFontSize } = window.TurniRender;

    const panelTurni = settingsView.querySelector('.settings-panel.settings-turni[data-settings-id="turni"]');
    const panelAdd   = settingsView.querySelector('.settings-panel.settings-turni-add[data-settings-id="turni-add"]');
    if (!panelTurni || !panelAdd) return;
    
    const listEl     = panelTurni.querySelector("[data-turni-list]");
    const emptyHint  = panelTurni.querySelector("[data-turni-empty-hint]");
    const btnAdd     = panelTurni.querySelector("[data-turni-add]");
    const btnEdit    = panelTurni.querySelector("[data-turni-edit]");
    const toggleBtn  = panelTurni.querySelector("[data-turni-toggle]");

    const cardEl   = toggleBtn ? toggleBtn.closest(".turni-card") : null;
    const headerEl = cardEl ? cardEl.querySelector(".turni-card-header") : null;
    
    const visualToggleBtn = panelTurni.querySelector("[data-turni-visual-toggle]");
    const visualHint      = panelTurni.querySelector("[data-turni-visual-hint]");

    
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
    
    const turnazioniCard      = panelTurni.querySelector(".turnazioni-card");
    const turnazioniToggleBtn = panelTurni.querySelector("[data-turnazioni-toggle]");
    const turnazioniHeader    = turnazioniCard ? turnazioniCard.querySelector(".turni-card-header") : null;
    const turnazioniAddBtn    = panelTurni.querySelector("[data-turnazioni-add]");
    const turnazioniEditBtn   = panelTurni.querySelector("[data-turnazioni-edit]");

    const defaultAddTitle = panelAdd.dataset.settingsTitle || "Aggiungi turno";
    const editTitle       = "Modifica turno";


    let turni = loadTurni();
    let isEditing = false;
    let isCollapsed = cardEl.classList.contains("is-collapsed");
    let editIndex = null;
    
    let isNoTime = false;

    
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

    
    if (visualToggleBtn && typeof loadVisualToggle === "function") {
      let visualOn = loadVisualToggle();

      function applyVisualState() {
  visualToggleBtn.classList.toggle("is-on", visualOn);
  visualToggleBtn.setAttribute("aria-checked", visualOn ? "true" : "false");

  
  const visualCard = visualToggleBtn.closest(".turni-card");
  if (visualCard) {
    visualCard.classList.toggle("is-collapsed", !visualOn);
  }

  if (visualHint) {
    visualHint.hidden = !visualOn;
  }

  
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


    applyNoTimeState();

    noTimeToggleBtn.addEventListener("click", () => {
      isNoTime = !isNoTime;
      applyNoTimeState();
    });

    
    btnAdd.addEventListener("click", (e) => {
      e.stopPropagation();
      openNewTurnoPanel();
    });

    
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
  const prev = turni[editIndex];
  turni[editIndex] = payload;

  
  if (window.TurniStorage && typeof TurniStorage.syncTurnazioniForTurnoChange === "function") {
    TurniStorage.syncTurnazioniForTurnoChange(prev, payload);
  }
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

  
  if (isEditing) {
    isEditing = false;
    refreshList();
  }

  
  if (window.Turnazioni && typeof Turnazioni.exitEditMode === "function") {
    Turnazioni.exitEditMode();
  }
}

      });
    }

    
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

    
    if (window.TurniStart && typeof TurniStart.init === "function") {
      TurniStart.init({ panelTurni });
    }
    
    exitEditModeImpl = function () {
      if (!isEditing) return;
      isEditing = false;
      refreshList();

	    
	    if (window.Turnazioni && typeof Turnazioni.exitEditMode === "function") {
	      Turnazioni.exitEditMode();
	    }
    };
  }

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
    
    syncTurnoInizialeUI: function () {}
  };
})();


(function () {
  
  const settingsApi = {
    showMainFn: null,
    showPanelFn: null
  };
  
  let activePanelId = null; 
  let pendingInternalNav = false;
  
  const changeListeners = new Set();

  function emitChange(prevId, nextId, meta) {
    changeListeners.forEach((cb) => {
      try { cb(prevId, nextId, meta || {}); } catch {}
    });
  }
  
  function consumeInternalNav() {
    const v = pendingInternalNav;
    pendingInternalNav = false;
    return v;
  }
  
  function initSettingsNavigation() {
    const settingsView = document.querySelector(".view-settings");
    if (!settingsView) return;

    const main   = settingsView.querySelector(".settings-main");
    const panels = settingsView.querySelectorAll(".settings-panel[data-settings-id]");
    const rows   = settingsView.querySelectorAll(".settings-row[data-settings-page]");

    const titleEl = settingsView.querySelector("#settingsTitle");
    const backBtn = settingsView.querySelector("[data-settings-back-main]");

    if (!main || !titleEl || !backBtn) return;

    function hideBackBtn() {
      backBtn.hidden = true;
      backBtn.style.display = "none";
    }

    function showBackBtn() {
      backBtn.hidden = false;
      backBtn.style.display = "inline-flex";
    }
    
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
    
    function showMain(meta) {
      
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
    
    settingsApi.showMainFn  = showMain;
    settingsApi.showPanelFn = showPanel;
    
    showMain({ reason: "init" });
   
    
    rows.forEach(row => {
      row.addEventListener("click", () => {
        const id = row.dataset.settingsPage;
        showPanel(id, { reason: "row" });
      });
    });

    backBtn.addEventListener("click", () => {
      

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
    
  }
  
  window.SettingsUI = {
    init: initSettingsNavigation,

    showMain: function () {
      if (typeof settingsApi.showMainFn === "function") {
        settingsApi.showMainFn({ reason: "api" });
      }
    },

    openPanel: function (id, opts) {
      if (opts && opts.internal) {
        pendingInternalNav = true;
      }
      if (typeof settingsApi.showPanelFn === "function") {
        settingsApi.showPanelFn(id, { reason: "api", internal: !!(opts && opts.internal) });
      }
    },

    
    getActivePanelId: function () {
      return activePanelId;
    },

    consumeInternalNav: function () {
      return consumeInternalNav();
    },

    
    onChange: function (cb) {
      if (typeof cb !== "function") return function () {};
      changeListeners.add(cb);
      return function () { changeListeners.delete(cb); };
    }
  };
  
})();


(function () {

  
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
      const variant = (opts && opts.variant) ? String(opts.variant) : "primary"; 

      const modal = document.getElementById("uiConfirm");
      const titleEl = document.getElementById("uiConfirmTitle");
      const textEl  = document.getElementById("uiConfirmText");
      const okBtn   = document.getElementById("uiConfirmOk");

      if (!modal || !titleEl || !textEl || !okBtn) {
        
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
        
        modal.hidden = false;
        document.body.classList.add("ui-modal-open");

        
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

        
        try { localStorage.setItem(STORAGE_KEYS.turni, "[]"); } catch {}
        try { localStorage.setItem(STORAGE_KEYS.turnazioni, "[]"); } catch {}
        try { localStorage.setItem(STORAGE_KEYS.turnazioniPreferred, ""); } catch {}
        try { localStorage.setItem(STORAGE_KEYS.turniVisualizza, "false"); } catch {}
        try { localStorage.setItem(STORAGE_KEYS.turniStart, JSON.stringify({ date: "", slotIndex: null })); } catch {}

        
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
  
  window.BackupRestore = {
    init: initBackupRestorePanel
  };
  

})();


(function () {

  
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
  
  window.UIFeedback = { createTempError }; 

})();


(function () {

function initTabs() {
  const tabs  = document.querySelectorAll(".tab");
  const views = document.querySelectorAll(".view");

  if (!tabs.length || !views.length) return;

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.tab;

      
      const activeView = document.querySelector(".view.is-active");
      const activeViewId = activeView ? activeView.dataset.view : null;

      
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
      
      
      if (target === "settings") {
        
        if (typeof window.__bootSettingsOnce === "function") {
          window.__bootSettingsOnce();
        }

        const settingsView = document.querySelector(".view-settings");
        const isSettingsActive =
          settingsView && settingsView.classList.contains("is-active");

        if (isSettingsActive) {
          
          if (window.Turni && typeof Turni.exitEditMode === "function") {
            Turni.exitEditMode();
          }
          
          if (window.Turnazioni && typeof Turnazioni.exitEditMode === "function") {
            Turnazioni.exitEditMode();
          }

          if (window.SettingsUI && typeof SettingsUI.showMain === "function") {
            
            SettingsUI.showMain();
          }
          return;
        }
      }
      
      
      if (activeViewId === "settings" && target !== "settings") {
        if (window.Turni && typeof Turni.exitEditMode === "function") {
          Turni.exitEditMode();
        }
        
        if (window.Turnazioni && typeof Turnazioni.exitEditMode === "function") {
          Turnazioni.exitEditMode();
        }
      }

      
      tabs.forEach(t => t.classList.toggle("active", t === tab));
      views.forEach(v => {
        v.classList.toggle("is-active", v.dataset.view === target);
      });
      
      
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

  
  window.addEventListener("DOMContentLoaded", () => {
    
    if (window.Status && typeof Status.init === "function") {
      Status.init();
    }

    
    if (window.TurniStorage && typeof TurniStorage.seedFactoryDefaultsIfNeeded === "function") {
      TurniStorage.seedFactoryDefaultsIfNeeded();
    }

    
    if (window.Calendar && typeof Calendar.init === "function") {
      Calendar.init();
    }

    
    if (window.Theme && typeof Theme.init === "function") {
      Theme.init();
    }

    
    if (!window.__bootSettingsOnce) {
      window.__bootSettingsOnce = (function () {
        let done = false;
        return function () {
          if (done) return;
          done = true;

          
          if (window.SettingsUI && typeof SettingsUI.init === "function") {
            SettingsUI.init();
          }

          
          if (window.BackupRestore && typeof BackupRestore.init === "function") {
            BackupRestore.init();
          }

          
          if (window.Turni && typeof Turni.init === "function") {
            Turni.init();
          }

          if (window.Festivita && typeof Festivita.init === "function") {
            Festivita.init();
          }
        };
      })();
    }
    
    initTabs();

    
    if (window.Icons && typeof Icons.initTabbar === "function") {
      Icons.initTabbar();

      if (typeof Icons.loadStatusIcon === "function") {
        Icons.loadStatusIcon();
      }
    }
    
    const settingsActive = document.querySelector(".view-settings.is-active");
    if (settingsActive && typeof window.__bootSettingsOnce === "function") {
      window.__bootSettingsOnce();
    }
  });
 
})();

(function () {
  if (!("serviceWorker" in navigator)) return;
  if (!window.AppConfig) {
    throw new Error("CONFIG.MISSING: AppConfig non disponibile (sw-register.js)");
  }

  const { PATHS, VERSION } = window.AppConfig;
  const BASE       = PATHS.base;
  const SCOPE      = PATHS.swScope || `${BASE}/`;
  const SW_URL_RAW = PATHS.swFile;

  
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
      
      return null;
    }
  }
  
  
function setVersionLabel(fullVersion) {
  const elId = VERSION.labelElementId || "versionLabel";
  const el = document.getElementById(elId);
  if (!el) return;

  if (!fullVersion) {
    el.textContent = "";
    return;
  }

  const s = String(fullVersion).trim();

  
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
  
  async function registerSW() {
    const swVersion = await getSWVersion();

    
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

      
      reg.update().catch(() => {});
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          reg.update().catch(() => {});
        }
      });
    } catch {
      
      setVersionLabel("");
    }
  }
  
  function scheduleSWRegistration() {
    
    if (navigator && navigator.onLine === false) {
      setVersionLabel("");
      
      window.addEventListener("online", () => {
        registerSW();
      }, { once: true });
      return;
    }

    
    registerSW();
  }

  
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleSWRegistration);
  } else {
    scheduleSWRegistration();
  }
})();

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
