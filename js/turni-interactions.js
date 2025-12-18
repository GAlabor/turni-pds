// ============================
// Interazioni UI condivise per Turni/Turnazioni:
// - collapse card (header + freccia)
// - modalità Modifica (toggle)
// - click rigo in edit -> modifica
// - drag & drop (pointer) con FLIP
// - reset stato quando esci dal pannello "turni"
//   (ora: preferisce SettingsUI.onChange, fallback MutationObserver)
// turni-interactions.js v 1.0
// ============================

(function () {

// ===================== SPLIT helpers : START =====================
  function safeClosest(target, selector) {
    try { return target && target.closest ? target.closest(selector) : null; }
    catch { return null; }
  }
// ===================== SPLIT helpers : END =====================


// ===================== SPLIT collapsible-card : START =====================
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
// ===================== SPLIT collapsible-card : END =====================


// ===================== SPLIT edit-toggle : START =====================
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
// ===================== SPLIT edit-toggle : END =====================


// ===================== SPLIT row-edit-click : START =====================
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
// ===================== SPLIT row-edit-click : END =====================


// ===================== SPLIT drag-sort : START =====================
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

      // FLIP
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
// ===================== SPLIT drag-sort : END =====================


  // ----------------------------
  // Reset quando esci dal pannello "turni"
  // Ora preferisce SettingsUI.onChange per capire prev/next,
  // e usa SettingsUI.consumeInternalNav() per distinguere nav interne.
  // ----------------------------

// ===================== SPLIT panel-exit-reset : START =====================
  function attachPanelExitReset(opts) {
    const { panelEl, onExit } = opts || {};
    if (!panelEl) return;

    // 1) via SettingsUI.onChange (preferito)
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

    // 2) fallback MutationObserver (se SettingsUI non c’è)
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
// ===================== SPLIT panel-exit-reset : END =====================


// ===================== SPLIT exports : START =====================
  window.TurniInteractions = {
    attachCollapsibleCard,
    attachEditToggle,
    attachRowEditClick,
    attachDragSort,
    attachPanelExitReset
  };
// ===================== SPLIT exports : END =====================

})();
