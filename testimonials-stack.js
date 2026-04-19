/**
 * Стек отзывов: первая карточка не лицевая; плавные переходы (ease-out) между отзывами по скроллу.
 */
(function () {
  const track = document.querySelector("[data-testimonials-track]");
  if (!track) return;

  const section = track.closest(".testimonials-section");
  const cards = Array.from(track.querySelectorAll(".review-stack-card"));
  const progressRoot = document.querySelector("[data-testimonials-progress]");
  if (!cards.length) return;

  const n = cards.length;
  const SKIP_FIRST = true;
  const firstFrontIndex = SKIP_FIRST ? 1 : 0;
  const lastIndex = n - 1;
  const screenCount = lastIndex - firstFrontIndex + 1;

  let stackMode = null;
  let rafScroll = null;
  let onScrollFn = null;
  let ro = null;

  function clamp01(t) {
    return Math.max(0, Math.min(1, t));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function easeOutCubic(t) {
    const x = clamp01(t);
    return 1 - Math.pow(1 - x, 3);
  }

  function getScrollProgress(el) {
    const rect = el.getBoundingClientRect();
    const scrollY = window.scrollY ?? window.pageYOffset;
    const top = scrollY + rect.top;
    const h = el.offsetHeight;
    const vh = window.innerHeight;
    const start = top - vh / 2;
    const end = top + h - vh;
    const denom = end - start;
    if (Math.abs(denom) < 1e-6) return 0;
    return clamp01((scrollY - start) / denom);
  }

  /** f ∈ [firstFrontIndex, lastIndex] — «плавающий» индекс верха стопки */
  function getFrontFloat(p) {
    return firstFrontIndex + p * (lastIndex - firstFrontIndex);
  }

  function shouldUseStaticLayout() {
    return (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      window.matchMedia("(max-width: 768px)").matches
    );
  }

  function clearCardInlineStyles() {
    cards.forEach((card) => {
      card.removeAttribute("style");
      card.classList.remove(
        "review-stack-card--skipped",
        "review-stack-card--active",
        "review-stack-card--below",
        "review-stack-card--past"
      );
    });
  }

  function updateProgressUI(f) {
    if (!progressRoot) return;
    const rel = f - firstFrontIndex;
    const dotIdx = Math.min(screenCount - 1, Math.max(0, Math.round(rel)));
    progressRoot.querySelectorAll("[data-testimonial-dot]").forEach((dot, i) => {
      dot.classList.toggle("is-active", i === dotIdx);
    });
    const label = progressRoot.querySelector("[data-testimonials-count]");
    if (label) {
      label.textContent = `${dotIdx + 1} / ${screenCount}`;
    }
  }

  function applyCard(card, i, f) {
    if (SKIP_FIRST && i === 0) {
      card.style.transform = "translateY(-140%) scale(1)";
      card.style.opacity = "0";
      card.style.zIndex = "1";
      card.style.pointerEvents = "none";
      card.classList.add("review-stack-card--skipped");
      card.classList.add("review-stack-card--past");
      card.setAttribute("tabindex", "-1");
      return;
    }

    const low = Math.floor(f - 1e-9);
    const high = Math.min(Math.ceil(f + 1e-9), lastIndex);
    const blending = high > low;
    const t = blending ? clamp01((f - low) / (high - low)) : 0;
    const te = easeOutCubic(t);

    /** Кому отдать фокус и «лицевой» стиль: при переходе — ближе к входящей после середины */
    let focusIndex = low;
    if (blending) {
      focusIndex = te >= 0.5 ? high : low;
    }

    let ty;
    let scale = 1;
    let opacity = 1;
    let z = 50;
    let pe = "auto";

    if (i < low) {
      ty = "-130%";
      opacity = 0;
      z = 5 + i;
      pe = "none";
      card.classList.add("review-stack-card--past");
      card.classList.remove("review-stack-card--below", "review-stack-card--active");
    } else if (blending && i === low) {
      ty = `${lerp(0, -128, te)}%`;
      opacity = lerp(1, 0, te);
      z = Math.round(lerp(100, 10, te));
      pe = "none";
      card.classList.add("review-stack-card--past");
      card.classList.remove("review-stack-card--below");
    } else if (blending && i === high) {
      ty = `${lerp(32, 0, te)}px`;
      scale = lerp(0.92, 1, te);
      opacity = lerp(0.78, 1, te);
      z = Math.round(lerp(88, 100, te));
      pe = "auto";
      card.classList.remove("review-stack-card--past", "review-stack-card--below");
    } else if (!blending && i === low) {
      ty = "0px";
      scale = 1;
      opacity = 1;
      z = 100;
      pe = "auto";
      card.classList.remove("review-stack-card--past", "review-stack-card--below");
    } else if (i > (blending ? high : low)) {
      const ref = blending ? high : low;
      const d = i - ref;
      ty = `${14 + d * 20}px`;
      scale = Math.max(0.86, 1 - d * 0.05);
      opacity = Math.max(0.48, 1 - d * 0.15);
      z = 92 - d;
      pe = "auto";
      card.classList.add("review-stack-card--below");
      card.classList.remove("review-stack-card--past");
    }

    card.style.transform = `translateY(${ty}) scale(${scale})`;
    card.style.opacity = String(opacity);
    card.style.zIndex = String(z);
    card.style.pointerEvents = pe;

    const isActive = i === focusIndex && opacity > 0.82;
    card.classList.toggle("review-stack-card--active", isActive);

    const tabbable = isActive && pe === "auto";
    if (tabbable) {
      card.removeAttribute("tabindex");
    } else {
      card.setAttribute("tabindex", "-1");
    }
  }

  function update() {
    const p = getScrollProgress(track);
    const f = getFrontFloat(p);
    cards.forEach((card, i) => {
      applyCard(card, i, f);
    });
    updateProgressUI(f);
  }

  function tickScroll() {
    if (!shouldUseStaticLayout() && stackMode === true) {
      update();
    }
    rafScroll = null;
  }

  function onScrollOrResize() {
    if (!stackMode) return;
    if (rafScroll == null) {
      rafScroll = requestAnimationFrame(tickScroll);
    }
  }

  function unbindStack() {
    if (onScrollFn) {
      window.removeEventListener("scroll", onScrollFn);
      window.removeEventListener("resize", onScrollFn);
      onScrollFn = null;
    }
    if (ro) {
      ro.disconnect();
      ro = null;
    }
    if (rafScroll != null) {
      cancelAnimationFrame(rafScroll);
      rafScroll = null;
    }
  }

  function bindStack() {
    onScrollFn = onScrollOrResize;
    window.addEventListener("scroll", onScrollFn, { passive: true });
    window.addEventListener("resize", onScrollFn, { passive: true });
    ro = new ResizeObserver(onScrollFn);
    ro.observe(track);
    update();
  }

  function applyStaticModeClass() {
    section?.classList.add("testimonials--static");
  }

  function removeStaticModeClass() {
    section?.classList.remove("testimonials--static");
  }

  function setMode(useStack) {
    if (useStack === stackMode) return;
    stackMode = useStack;

    if (useStack) {
      removeStaticModeClass();
      clearCardInlineStyles();
      if (progressRoot) {
        progressRoot.hidden = false;
        progressRoot.removeAttribute("aria-hidden");
      }
      bindStack();
    } else {
      unbindStack();
      clearCardInlineStyles();
      applyStaticModeClass();
      cards.forEach((c) => c.removeAttribute("tabindex"));
      if (progressRoot) {
        progressRoot.hidden = true;
        progressRoot.setAttribute("aria-hidden", "true");
      }
    }
  }

  function syncMode() {
    setMode(!shouldUseStaticLayout());
  }

  syncMode();

  const mqMobile = window.matchMedia("(max-width: 768px)");
  const mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  function onPreferenceChange() {
    syncMode();
  }

  if (typeof mqMobile.addEventListener === "function") {
    mqMobile.addEventListener("change", onPreferenceChange);
    mqReduce.addEventListener("change", onPreferenceChange);
  } else {
    mqMobile.addListener(onPreferenceChange);
    mqReduce.addListener(onPreferenceChange);
  }
})();
