// ============================
// Icone SVG:
// icons.js
// - Tabbar (Calendario / InsPag / Riepilogo / Impostazioni)
// - Icona stato / login (in alto a destra)
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
