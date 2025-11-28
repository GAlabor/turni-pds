// ============================
// Icone SVG:
// - Tabbar (Calendario / InsPag / Riepilogo / Impostazioni)
// - Icona stato / login (in alto a destra)
// ============================

(function () {
  if (!window.AppConfig) {
    throw new Error("CONFIG.MISSING: AppConfig non disponibile (icons.js)");
  }

  const { PATHS } = window.AppConfig;
  const SVG_BASE = PATHS.svgBase;

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

  // ============================
  // Icona stato / login:
  // - SVG login.svg dentro #icoStatus
  // - gli stati (idle/saving/ok) sono gestiti da status.js via classi sul wrapper
  // ============================
  async function loadStatusIcon() {
    await loadSVGInto("icoStatus", "login.svg");
  }

  // ============================
  // API pubblica
  // ============================
  window.Icons = {
    initTabbar: loadTabbarIcons,
    loadStatusIcon
  };
})();
