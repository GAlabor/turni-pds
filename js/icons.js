// ============================
// Icone SVG tabbar + icona stato
// ============================

(function () {
  function app_base() {
    if (location.hostname === "localhost") return "";
    const seg = location.pathname.split("/").filter(Boolean)[0] || "turni-pds";
    return "/" + seg;
  }

  // Aggiorna mese e giorno dentro l'SVG del calendario
  function setCalendarIconDateInSvg() {
    const host = document.getElementById("icoCalendar");
    if (!host) return;

    const now = new Date();
    const months = ["GEN","FEB","MAR","APR","MAG","GIU","LUG","AGO","SET","OTT","NOV","DIC"];

    const monthEl = host.querySelector("#calMonth");
    const dayEl   = host.querySelector("#calDay");

    if (monthEl) monthEl.textContent = months[now.getMonth()];
    if (dayEl)   dayEl.textContent   = now.getDate();
  }

  // Caricamento uniforme SVG → innerHTML diretto
  async function loadSVGInto(id, file) {
    const host = document.getElementById(id);
    if (!host) return;

    try {
      const res = await fetch(`${app_base()}/svg/${file}`, {
        cache: "no-store",
        credentials: "same-origin"
      });
      if (!res.ok) return;

      const txt = await res.text();
      host.innerHTML = txt.trim(); // preserva <svg> intero o gruppo interno
    } catch (err) {
      console.error("Errore icona:", file, err);
    }
  }

  async function loadTabbarIcons() {
    // CALENDARIO
    await loadSVGInto("icoCalendar", "calendar.svg");
    setCalendarIconDateInSvg();

    // INSERIMENTI/PAGAMENTI
    await loadSVGInto("icoInspag", "inspag.svg");

    // RIEPILOGO
    await loadSVGInto("icoRiepilogo", "riepilogo.svg");

    // IMPOSTAZIONI
    await loadSVGInto("icoSettings", "settings.svg");

    // quando tutte le icone sono state iniettate, rendile visibili
    const tabbar = document.querySelector(".tabbar");
    if (tabbar) {
      tabbar.classList.add("tabbar-icons-ready");
    }
  }

  // Icona stato / login.svg
  async function loadStatusIcon() {
    await loadSVGInto("icoStatus", "login.svg");
  }

  window.Icons = {
    initTabbar: loadTabbarIcons,
    loadStatusIcon
  };
})();
