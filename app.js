// ============================
// Calendario base
// ============================

const monthNames = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
];

const grid = document.getElementById("calendar-grid");
const monthLabel = document.querySelector(".month-label");

const prevBtn = document.querySelector(".prev");
const nextBtn = document.querySelector(".next");

let today = new Date();
let currentYear = today.getFullYear();
let currentMonth = today.getMonth(); // 0–11

function renderCalendar(year, month) {
  if (!grid) return;

  // Pulisci griglia
  grid.innerHTML = "";

  // Primo giorno del mese
  const firstDay = new Date(year, month, 1);

  // JS: 0 = Domenica ... 6 = Sabato
  // Noi vogliamo: 0 = Lunedì ... 6 = Domenica
  const startIndex = (firstDay.getDay() + 6) % 7;

  // Numero di giorni del mese
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

    // Calcola colonna (0 = Lun, ... 6 = Dom)
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

  // Etichetta mese
  if (monthLabel) {
    monthLabel.textContent = `${monthNames[month]} ${year}`;
  }
}

// Navigazione mesi
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

// Prima render
renderCalendar(currentYear, currentMonth);


// ============================
// Tabbar: switch viste
// ============================

const tabs = document.querySelectorAll(".tab");
const views = document.querySelectorAll(".view");

tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    const target = tab.dataset.tab;

    tabs.forEach(t => t.classList.toggle("active", t === tab));
    views.forEach(v => {
      v.classList.toggle("is-active", v.dataset.view === target);
    });
  });
});


// ============================
// Tema: system / light / dark
// ============================

const THEME_KEY = "turnipds-theme";

function applyTheme(theme) {
  const root = document.documentElement;

  if (theme === "light" || theme === "dark") {
    root.setAttribute("data-theme", theme);
  } else {
    // "system": nessun attributo, lascia lavorare prefers-color-scheme
    root.removeAttribute("data-theme");
  }
}

function loadTheme() {
  let saved = localStorage.getItem(THEME_KEY);
  if (!saved) {
    saved = "system";
  }

  applyTheme(saved);

  const input = document.querySelector(`input[name="theme"][value="${saved}"]`);
  if (input) {
    input.checked = true;
  }
}

function setupThemeControls() {
  const radios = document.querySelectorAll('input[name="theme"]');
  radios.forEach(r => {
    r.addEventListener("change", () => {
      const value = r.value;
      localStorage.setItem(THEME_KEY, value);
      applyTheme(value);
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadTheme();
  setupThemeControls();
});


// ============================
// Icone SVG tabbar
// ============================

function app_base(){
  if (location.hostname === 'localhost') return '';
  const seg = location.pathname.split('/').filter(Boolean)[0] || 'turni-pds';
  return '/' + seg;
}

// Aggiorna mese e giorno dentro l'SVG del calendario
function setCalendarIconDateInSvg() {
  const host = document.getElementById('icoCalendar');
  if (!host) return;

  const now = new Date();
  const months = ["GEN","FEB","MAR","APR","MAG","GIU","LUG","AGO","SET","OTT","NOV","DIC"];

  const monthEl = host.querySelector('#calMonth');
  const dayEl   = host.querySelector('#calDay');

  if (monthEl) monthEl.textContent = months[now.getMonth()];
  if (dayEl)   dayEl.textContent   = now.getDate();
}


// ========================
// Caricamento icone tabbar
// ========================
async function loadTabbarIcons() {
  try {
    // ----- ICONA CALENDARIO -----
    const cal = await fetch(`${app_base()}/svg/calendar.svg`, {
      cache: 'no-store',
      credentials: 'same-origin'
    });

    if (cal.ok) {
      const txt = await cal.text();
      const host = document.getElementById('icoCalendar');

      if (host) {
        host.innerHTML = txt;     // Inserisce l'SVG intero
        setCalendarIconDateInSvg(); // Aggiorna Mese + Giorno dentro l'SVG
      }
    }

        // ----- ICONA INSERIMENTI / PAGAMENTI -----
    const inspag = await fetch(`${app_base()}/svg/inspag.svg`, {
      cache: 'no-store',
      credentials: 'same-origin'
    });

    if (inspag.ok) {
      const txt = await inspag.text();
      const host = document.getElementById('icoInspag');

      if (host) {
        const temp = document.createElement('div');
        temp.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg">${txt}</svg>`;

        temp.querySelectorAll('svg > *')
            .forEach(n => host.appendChild(n.cloneNode(true)));
      }
    }


    // ----- ICONA SETTINGS -----
    const set = await fetch(`${app_base()}/svg/settings.svg`, {
      cache: 'no-store',
      credentials: 'same-origin'
    });

    if (set.ok) {
      const txt = await set.text();
      const host = document.getElementById('icoSettings');

      if (host) {
        const temp = document.createElement('div');
        temp.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg">${txt}</svg>`;

        temp.querySelectorAll('svg > *')
            .forEach(n => host.appendChild(n.cloneNode(true)));
      }
    }

  } catch (err) {
    console.error('Errore icone tabbar:', err);
  }
}

loadTabbarIcons();


// ============================
// Service worker + versione
// ============================

(function(){
  if (!('serviceWorker' in navigator)) return;
  const BASE  = (location.hostname === 'localhost') ? '' : '/turni-pds';
  const SCOPE = `${BASE}/`;

  async function getSWVersion() {
    const url = `${BASE}/service-worker.js`;
    const res = await fetch(url, { cache: 'no-store', credentials: 'same-origin' });
    const text = await res.text();
    const m = text.match(/const\s+VERSION\s*=\s*['"]([^'"]+)['"]/);
    if (!m) throw new Error('VERSION non trovata');
    return m[1];
  }

  function setVersionLabel(fullVersion) {
    const m = fullVersion.match(/V\s*([0-9.]+)/i);
    const label = m ? m[1] : '';
    const el = document.getElementById('versionLabel');
    if (el) el.textContent = label;
  }

  async function registerSW(){
    try {
      const swVersion = await getSWVersion();
      setVersionLabel(swVersion);
      const SW_URL = `${BASE}/service-worker.js?v=${encodeURIComponent(swVersion)}`;
      const reg = await navigator.serviceWorker.register(SW_URL, { scope: SCOPE });
      if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });

      reg.addEventListener('updatefound', () => {
        const nw = reg.installing; if (!nw) return;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            nw.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!window.__reloadedForSW) {
          window.__reloadedForSW = true;
          location.reload();
        }
      });

      reg.update().catch(()=>{});
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          reg.update().catch(()=>{});
        }
      });
    } catch(e) {
      console.warn("SW registration failed:", e);
      const el = document.getElementById('versionLabel');
      if (el) el.textContent = '';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', registerSW);
  } else {
    registerSW();
  }
})();


