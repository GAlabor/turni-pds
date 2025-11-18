// ============================
// Calendario + "Vai a data"
// ============================

(function () {
  const monthNames = [
    "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
    "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
  ];

  let today = new Date();
  let currentYear = today.getFullYear();
  let currentMonth = today.getMonth(); // 0–11

  // Stato per il mini calendario "vai a data"
  let jumpYear = currentYear;
  let jumpMonth = currentMonth;

  // Riferimenti DOM (inizializzati in init)
  let grid = null;
  let monthLabel = null;
  let prevBtn = null;
  let nextBtn = null;

  function renderCalendar(year, month) {
    if (!grid) return;

    grid.innerHTML = "";

    const firstDay = new Date(year, month, 1);

    // JS: 0 = Domenica ... 6 = Sabato
    // Noi vogliamo: 0 = Lunedì ... 6 = Domenica
    const startIndex = (firstDay.getDay() + 6) % 7;

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const isCurrentMonth =
      year === today.getFullYear() && month === today.getMonth();

    // Celle vuote prima del giorno 1
    for (let i = 0; i < startIndex; i++) {
      const empty = document.createElement("div");
      empty.className = "day empty";
      grid.appendChild(empty);
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

      grid.appendChild(cell);
    }

    if (monthLabel) {
      monthLabel.textContent = `${monthNames[month]} ${year}`;
    }
  }

  // ============================
  // Bottom sheet "Vai a data"
  // ============================

  function renderYearSelector() {
    const popup = document.getElementById("dateJumpYearPopup");
    if (!popup) return;

    popup.innerHTML = "";

    const range = 5; // 5 anni prima e 5 dopo
    const start = jumpYear - range;
    const end = jumpYear + range;

    for (let y = start; y <= end; y++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "date-jump-year-item" + (y === jumpYear ? " is-active" : "");
      btn.textContent = y;
      btn.dataset.year = y;

      btn.addEventListener("click", () => {
        jumpYear = y;
        renderDateJumpCalendar();

        const popupEl = document.getElementById("dateJumpYearPopup");
        const yearBtnEl = document.getElementById("dateJumpYearBtn");
        if (popupEl) {
          popupEl.classList.remove("is-open");
          popupEl.setAttribute("aria-hidden", "true");
        }
        if (yearBtnEl) {
          yearBtnEl.setAttribute("aria-expanded", "false");
        }
      });

      popup.appendChild(btn);
    }

    // prova a centrare circa l'anno selezionato
    requestAnimationFrame(() => {
      popup.scrollTop = popup.scrollHeight / 2 - popup.clientHeight / 2;
    });
  }

  function renderDateJumpCalendar() {
    const gridJump = document.getElementById("dateJumpGrid");
    const label = document.getElementById("dateJumpMonthLabel");
    const yearBtn = document.getElementById("dateJumpYearBtn");
    if (!gridJump || !label) return;

    gridJump.innerHTML = "";
    label.textContent = `${monthNames[jumpMonth]} ${jumpYear}`;

    if (yearBtn) {
      yearBtn.textContent = jumpYear;
    }

    // aggiorna lista anni
    renderYearSelector();

    const firstDay = new Date(jumpYear, jumpMonth, 1);
    const startIndex = (firstDay.getDay() + 6) % 7; // lun=0 ... dom=6
    const daysInMonth = new Date(jumpYear, jumpMonth + 1, 0).getDate();

    const todayDate = new Date();
    const isThisMonth =
      jumpYear === todayDate.getFullYear() &&
      jumpMonth === todayDate.getMonth();

    // celle vuote prima del giorno 1
    for (let i = 0; i < startIndex; i++) {
      const empty = document.createElement("div");
      empty.className = "date-jump-day empty";
      gridJump.appendChild(empty);
    }

    // giorni del mese
    for (let d = 1; d <= daysInMonth; d++) {
      const cell = document.createElement("div");
      cell.className = "date-jump-day";
      cell.textContent = d;
      cell.dataset.day = d;

      if (isThisMonth && d === todayDate.getDate()) {
        cell.classList.add("date-jump-day-today");
      }

      cell.addEventListener("click", () => {
        currentYear = jumpYear;
        currentMonth = jumpMonth;
        renderCalendar(currentYear, currentMonth);
        closeDateJumpSheet();
      });

      gridJump.appendChild(cell);
    }
  }

  function openDateJumpSheet() {
    const modal = document.getElementById("dateJumpModal");
    if (!modal) return;

    // parti dal mese attuale mostrato nel calendario principale
    jumpYear = currentYear;
    jumpMonth = currentMonth;
    renderDateJumpCalendar();

    const popup = document.getElementById("dateJumpYearPopup");
    const yearBtn = document.getElementById("dateJumpYearBtn");
    if (popup) {
      popup.classList.remove("is-open");
      popup.setAttribute("aria-hidden", "true");
    }
    if (yearBtn) {
      yearBtn.setAttribute("aria-expanded", "false");
    }

    modal.classList.add("is-open");
  }

  function closeDateJumpSheet() {
    const modal = document.getElementById("dateJumpModal");
    if (modal) {
      modal.classList.remove("is-open");
    }

    const popup = document.getElementById("dateJumpYearPopup");
    const yearBtn = document.getElementById("dateJumpYearBtn");
    if (popup) {
      popup.classList.remove("is-open");
      popup.setAttribute("aria-hidden", "true");
    }
    if (yearBtn) {
      yearBtn.setAttribute("aria-expanded", "false");
    }

    // ripulisce la tab calendario da eventuale stato "long-press"
    const calendarTab = document.querySelector('.tab[data-tab="calendar"]');
    if (calendarTab) {
      calendarTab.classList.remove("long-press");
    }
  }

  function setupDateJumpSheet() {
    const modal = document.getElementById("dateJumpModal");
    if (!modal) return;

    const prevBtn = modal.querySelector('.date-jump-nav-btn[data-dir="prev"]');
    const nextBtn = modal.querySelector('.date-jump-nav-btn[data-dir="next"]');

    if (!prevBtn || !nextBtn) return;

    // chiudi toccando l'overlay scuro
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeDateJumpSheet();
      }
    });

    prevBtn.addEventListener("click", () => {
      jumpMonth--;
      if (jumpMonth < 0) {
        jumpMonth = 11;
        jumpYear--;
      }
      renderDateJumpCalendar();
    });

    nextBtn.addEventListener("click", () => {
      jumpMonth++;
      if (jumpMonth > 11) {
        jumpMonth = 0;
        jumpYear++;
      }
      renderDateJumpCalendar();
    });

    const yearBtn = document.getElementById("dateJumpYearBtn");
    const yearPopup = document.getElementById("dateJumpYearPopup");

    if (yearBtn && yearPopup) {
      yearBtn.addEventListener("click", (e) => {
        e.stopPropagation();

        const isOpen = yearPopup.classList.toggle("is-open");
        yearPopup.setAttribute("aria-hidden", isOpen ? "false" : "true");
        yearBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");

        if (isOpen) {
          renderYearSelector();
        }
      });
    }
  }

  // ============================
  // API pubblica calendario
  // ============================

  function resetToToday() {
    today = new Date();
    currentYear = today.getFullYear();
    currentMonth = today.getMonth();
    renderCalendar(currentYear, currentMonth);
  }

  function getState() {
    return {
      year: currentYear,
      month: currentMonth
    };
  }

  function setState(year, month) {
    currentYear = year;
    currentMonth = month;
    renderCalendar(currentYear, currentMonth);
  }

  function init() {
    grid = document.getElementById("calendar-grid");
    monthLabel = document.querySelector(".month-label");
    prevBtn = document.querySelector(".prev");
    nextBtn = document.querySelector(".next");

    if (!grid || !monthLabel) return;

    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        currentMonth--;
        if (currentMonth < 0) {
          currentMonth = 11;
          currentYear--;
        }
        renderCalendar(currentYear, currentMonth);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        currentMonth++;
        if (currentMonth > 11) {
          currentMonth = 0;
          currentYear++;
        }
        renderCalendar(currentYear, currentMonth);
      });
    }

    renderCalendar(currentYear, currentMonth);
    setupDateJumpSheet();
  }

  window.Calendar = {
    init,
    resetToToday,
    getState,
    setState,
    openDateJumpSheet
  };
})();
