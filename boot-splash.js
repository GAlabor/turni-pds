// boot-splash.js
(function () {
  if (window.BootSplash) return;

  const ID = "bootSplash";

  function _hideNow() {
    const el = document.getElementById(ID);
    if (!el) return;

    if (el.classList.contains("is-hidden") || el.classList.contains("is-hiding")) return;

    el.classList.add("is-hiding");

    const done = () => {
      el.classList.add("is-hidden");
      el.setAttribute("aria-hidden", "true");
    };

    const t = setTimeout(done, 260);
    el.addEventListener("transitionend", () => {
      clearTimeout(t);
      done();
    }, { once: true });
  }

  function hide() {
    // lascia un frame per far comparire il primo paint dell’app
    requestAnimationFrame(() => requestAnimationFrame(_hideNow));
  }

  // failsafe: se qualcosa si rompe, non resti bloccato sullo splash
  window.addEventListener("load", () => {
    setTimeout(_hideNow, 4500);
  });

  window.BootSplash = { hide };
})();
