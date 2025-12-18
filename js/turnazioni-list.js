// ============================
// turnazioni-list.js
// Rendering lista turnazioni (mini-card) + preferita + hint
// ============================

(function () {
  function formatSigle(turnazione) {
    const n = Number(turnazione && turnazione.days) || 0;
    const slots = Array.isArray(turnazione && turnazione.slots) ? turnazione.slots : [];
    const restIdx = Array.isArray(turnazione && turnazione.restIndices) ? turnazione.restIndices : [];

    const out = [];
    for (let i = 0; i < n; i++) {
      if (restIdx.includes(i)) out.push("R");
      else {
        const s = (slots[i] && slots[i].sigla) ? String(slots[i].sigla).trim() : "";
        out.push(s || "?");
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

      this.refresh();
    },

    refresh() {
      if (!window.TurniStorage) return;

      const hasStorage =
        window.TurniStorage &&
        typeof TurniStorage.loadTurnazioni === "function" &&
        typeof TurniStorage.saveTurnazioni === "function" &&
        typeof TurniStorage.loadPreferredTurnazioneId === "function" &&
        typeof TurniStorage.savePreferredTurnazioneId === "function";

      this.saved = hasStorage ? TurniStorage.loadTurnazioni() : [];
      this.preferredId = hasStorage ? TurniStorage.loadPreferredTurnazioneId() : null;

      if (this.listEl) this.listEl.innerHTML = "";

      const has = Array.isArray(this.saved) && this.saved.length > 0;
      if (this.emptyEl) this.emptyEl.hidden = has;

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

      if (has && this.listEl) {
        this.saved.forEach((t) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "turnazione-mini-card";

          const isSel = this.preferredId && String(t.id) === String(this.preferredId);
          btn.classList.toggle("is-selected", !!isSel);

          const name = document.createElement("span");
          name.className = "turnazione-mini-name";
          name.textContent = t.name || "";

          const sigle = document.createElement("span");
          sigle.className = "turnazione-mini-sigle";
          sigle.textContent = formatSigle(t);

          btn.appendChild(name);
          btn.appendChild(sigle);

          btn.addEventListener("click", () => {
            this.preferredId = String(t.id);
            if (hasStorage) TurniStorage.savePreferredTurnazioneId(this.preferredId);

            this.refresh();
            this.syncVisualHint();
            this.notifyTurnoIniziale();
          });

          this.listEl.appendChild(btn);
        });
      }

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
      if (window.TurniStart && typeof TurniStart.syncFromTurnazioniChange === "function") {
        TurniStart.syncFromTurnazioniChange();
      }
    }
  };

  window.TurnazioniList = api;
})();
