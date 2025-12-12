// ============================
// turni-interactions.js
// Interazioni UI condivise per Turni/Turnazioni:
// - collapse card (header + freccia)
// - modalità Modifica (toggle)
// - click rigo in edit -> modifica
// - drag & drop (pointer) con FLIP
// - reset stato quando esci dal pannello "turni" (MutationObserver)
// ============================

(function () {
  function safeClosest(target, selector) {
    try { return target && target.closest ? target.closest(selector) : null; }
    catch { return null; }
  }

  // ----------------------------
  // Collapse card (header + freccia)
  // ----------------------------
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

    // stato iniziale
    apply();

    return { apply };
  }

  // ----------------------------
  // Modalità Modifica (toggle bottone)
  // ----------------------------
  function attachEditToggle(opts) {
    const {
      btnEdit,
      canEdit,
      getEditing,
      setEditing,
      refresh
    } = opts || {};

    if (!btnEdit) return;

    btnEdit.addEventListener("click", (e) => {
      e.stopPropagation();
      if (typeof canEdit === "function" && !canEdit()) return;

      const next = !getEditing();
      setEditing(next);

      if (typeof refresh === "function") refresh();
    });
  }

  // ----------------------------
  // Click rigo in edit -> modifica
  // ----------------------------
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

  // ----------------------------
  // Drag & drop riordino (pointer) + FLIP
  // ----------------------------
  function attachDragSort(opts) {
    const {
      listEl,
      getEditing,
      getItems,
      setItems,
      saveItems,
      refresh
    } = opts || {};

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

      // rimuovi eventuale selezione
      if (window.getSelection) {
        const sel = window.getSelection();
        if (sel && sel.removeAllRanges) sel.removeAllRanges();
      }

      document.addEventListener("pointermove", onPointerMove);
      document.addEventListener("pointerup", onPointerUp);
    });
  }

  // ----------------------------
  // Reset quando esci dal pannello "turni"
  // ----------------------------
  function attachPanelExitReset(opts) {
    const {
      panelEl,
      onExit,
      getInternalNavFlag,
      consumeInternalNavFlag
    } = opts || {};

    if (!panelEl) return;

    let wasActive = panelEl.classList.contains("is-active");

    const obs = new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        if (m.type !== "attributes" || m.attributeName !== "class") return;

        const isActiveNow = panelEl.classList.contains("is-active");

        if (wasActive && !isActiveNow) {
          const internal = typeof getInternalNavFlag === "function"
            ? !!getInternalNavFlag()
            : !!window.__turniInternalNav;

          if (!internal) {
            if (typeof onExit === "function") onExit();
          } else {
            if (typeof consumeInternalNavFlag === "function") {
              consumeInternalNavFlag();
            } else {
              window.__turniInternalNav = false;
            }
          }
        }

        wasActive = isActiveNow;
      });
    });

    obs.observe(panelEl, { attributes: true, attributeFilter: ["class"] });

    return { disconnect: () => obs.disconnect() };
  }

  // ============================
  // API pubblica
  // ============================
  window.TurniInteractions = {
    attachCollapsibleCard,
    attachEditToggle,
    attachRowEditClick,
    attachDragSort,
    attachPanelExitReset
  };
})();
