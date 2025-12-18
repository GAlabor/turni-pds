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
      const n = Number(t.days) || 0;
      const slots = Array.isArray(t.slots) ? t.slots : [];
      if (slotIndex < n) {
        const s = slots[slotIndex] || null;
        const sigla = s && s.sigla ? String(s.sigla).trim() : "";
        turnoTxt = `Giorno ${slotIndex + 1}${sigla ? ` (${sigla})` : ""}`;
      }
    }

    if (dateTxt && turnoTxt) return `${dateTxt} · ${turnoTxt}`;
    if (dateTxt) return dateTxt;
    if (turnoTxt) return turnoTxt;
    return "";
  }

  function syncSummaryUI() {
    const ok = canUse();

    const txt = ok ? buildStartSummaryText() : "";

    if (startSummaryEl) startSummaryEl.textContent = txt;

    if (startTurnoSummary) {
      if (!ok) {
        startTurnoSummary.textContent = "";
      } else {
        const cfg = TurniStorage.loadTurnoIniziale();
        const t = getPreferredTurnazione();

        let turnoTxt = "";
        if (t && Number.isInteger(cfg.slotIndex)) {
          const n = Number(t.days) || 0;
          const slots = Array.isArray(t.slots) ? t.slots : [];
          const i = cfg.slotIndex;
          if (i >= 0 && i < n) {
            const s = slots[i] || null;
            const sigla = s && s.sigla ? String(s.sigla).trim() : "";
            const nome  = s && s.nome  ? String(s.nome).trim()  : "";
            turnoTxt = sigla ? sigla : (nome || "");
            if (sigla && nome) turnoTxt = `${sigla} — ${nome}`;
            turnoTxt = `Giorno ${i + 1}${turnoTxt ? ` · ${turnoTxt}` : ""}`;
          }
        }
        startTurnoSummary.textContent = turnoTxt;
      }
    }

    setStartRowEnabled(ok);
  }
  // ===================== SPLIT summary_builders : END   =====================

  // ===================== SPLIT navigation_open_panel : START =====================
  function openPanelStart() {
    if (!panelStart) return;
    if (!canUse()) return;

    const cfg = TurniStorage.loadTurnoIniziale();
    if (startDateInput) startDateInput.value = cfg.date || "";
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

    const cfg = TurniStorage.loadTurnoIniziale();
    const selectedIndex = Number.isInteger(cfg.slotIndex) ? cfg.slotIndex : null;

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

      let label = `Giorno ${i + 1}`;
      if (sigla && nome) label += ` — ${sigla} ${nome}`;
      else if (sigla)    label += ` — ${sigla}`;
      else if (nome)     label += ` — ${nome}`;

      nameEl.textContent = label;
      row.appendChild(nameEl);

      row.addEventListener("click", () => {
        const next = TurniStorage.loadTurnoIniziale();
        next.slotIndex = i;
        TurniStorage.saveTurnoIniziale(next);

        syncSummaryUI();

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

    if (panelStartPick && panelStartPick.classList.contains("is-active")) {
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

    startPickList     = panelStartPick ? panelStartPick.querySelector("#turniStartPickList") : null;
    startPickEmpty    = panelStartPick ? panelStartPick.querySelector("#turniStartPickEmpty") : null;

    if (startRowBtn) {
      startRowBtn.addEventListener("click", () => {
        if (startRowBtn.classList.contains("is-disabled")) return;
        openPanelStart();
      });
    }

    if (startDateInput) {
      startDateInput.addEventListener("change", () => {
        const cfg = TurniStorage.loadTurnoIniziale();
        cfg.date = startDateInput.value || "";
        TurniStorage.saveTurnoIniziale(cfg);
        syncSummaryUI();
      });
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
