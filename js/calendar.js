// ============================
// Calendario con viste:
// giorni / mesi / anni
// ============================

(function () {
  const monthNames = [
    "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
    "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
  ];

  const monthShort = [
    "gen", "feb", "mar", "apr", "mag", "giu",
    "lug", "ago", "set", "ott", "nov", "dic"
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

      // Sabato / Domenica
      if (colIndex === 5 || colIndex === 6) {
        cell.classList.add("weekend");
      }

      // Oggi
      if (isCurrentMonth && d === today.getDate()) {
        cell.classList.add("today");
      }

      gridDays.appendChild(cell);
    }

    updateHeader();
  }

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

  function setState(year, month) {
    currentYear = year;
    currentMonth = month;
    currentMode = MODES.DAYS;
    updateContainerModeClass();
    renderDays();
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
  }

  window.Calendar = {
    init,
    resetToToday,
    getState,
    setState
  };
})();
