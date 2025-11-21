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

  async function loadTabbarIcons() {
    try {
      // ----- ICONA CALENDARIO -----
      const cal = await fetch(`${app_base()}/svg/calendar.svg`, {
        cache: "no-store",
        credentials: "same-origin"
      });

      if (cal.ok) {
        const txt = await cal.text();
        const host = document.getElementById("icoCalendar");

        if (host) {
          host.innerHTML = txt;
          setCalendarIconDateInSvg();
        }
      }

      // ----- ICONA INSERIMENTI / PAGAMENTI -----
      const inspag = await fetch(`${app_base()}/svg/inspag.svg`, {
        cache: "no-store",
        credentials: "same-origin"
      });

      if (inspag.ok) {
        const txt = await inspag.text();
        const host = document.getElementById("icoInspag");

        if (host) {
          const temp = document.createElement("div");
          temp.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg">${txt}</svg>`;

          temp.querySelectorAll("svg > *")
            .forEach(n => host.appendChild(n.cloneNode(true)));
        }
      }

      // ----- ICONA RIEPILOGO -----
      const riepilogo = await fetch(`${app_base()}/svg/riepilogo.svg`, {
        cache: "no-store",
        credentials: "same-origin"
      });

      if (riepilogo.ok) {
        const txt = await riepilogo.text();
        const host = document.getElementById("icoRiepilogo");

        if (host) {
          const temp = document.createElement("div");
          temp.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg">${txt}</svg>`;

          temp.querySelectorAll("svg > *")
            .forEach(n => host.appendChild(n.cloneNode(true)));
        }
      }

      // ----- ICONA IMPOSTAZIONI -----
      const set = await fetch(`${app_base()}/svg/settings.svg`, {
        cache: "no-store",
        credentials: "same-origin"
      });

      if (set.ok) {
        const txt = await set.text();
        const host = document.getElementById("icoSettings");

        if (host) {
          const temp = document.createElement("div");
          temp.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg">${txt}</svg>`;

          temp.querySelectorAll("svg > *")
            .forEach(n => host.appendChild(n.cloneNode(true)));
        }
      }

    } catch (err) {
      console.error("Errore icone tabbar:", err);
    }
  }

  // Icona stato / login.svg
  async function loadStatusIcon() {
    try {
      const res = await fetch(`${app_base()}/svg/login.svg`, {
        cache: "no-store",
        credentials: "same-origin"
      });
      if (!res.ok) return;

      const txt = await res.text();
      const host = document.getElementById("icoStatus");
      if (!host) return;

      const temp = document.createElement("div");
      temp.innerHTML = txt.trim();
      const svg = temp.querySelector("svg");
      if (svg) {
        host.innerHTML = "";
        host.appendChild(svg);
      }
    } catch (err) {
      console.error("Errore icona stato:", err);
    }
  }

  window.Icons = {
    initTabbar: loadTabbarIcons,
    loadStatusIcon
  };
})();
