/**
 * Эффект печати для главного заголовка (логика как в React Bits TextType + GSAP для курсора).
 */
(function () {
  const FULL_HEADLINE =
    "Я делаю сайты, интерфейсы и digital‑проекты, которые выглядят как вайб, а работают как система";

  const TEXTS = [
    "Я делаю сайты, интерфейсы и digital‑проекты,",
    "которые выглядят как вайб,",
    "а работают как система",
  ];

  const typingSpeed = 100;
  const pauseDuration = 1900;
  const deletingSpeed = 50;
  const loop = true;
  const initialDelay = 900;
  const cursorCharacter = "_";
  const cursorBlinkDuration = 0.5;

  function init() {
    const h1 = document.querySelector(".hero-title.text-type-root");
    if (!h1) return;

    const contentEl = h1.querySelector(".text-type__content");
    const cursorEl = h1.querySelector(".text-type__cursor");
    if (!contentEl) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      contentEl.textContent = FULL_HEADLINE;
      if (cursorEl) cursorEl.hidden = true;
      return;
    }

    let displayedText = "";
    let currentCharIndex = 0;
    let isDeleting = false;
    let currentTextIndex = 0;
    let timeoutId = 0;
    let cursorTween = null;

    if (cursorEl && window.gsap) {
      window.gsap.set(cursorEl, { opacity: 1 });
      cursorTween = window.gsap.to(cursorEl, {
        opacity: 0,
        duration: cursorBlinkDuration,
        repeat: -1,
        yoyo: true,
        ease: "power2.inOut",
      });
    }

    function updateDom() {
      contentEl.textContent = displayedText;
    }

    function runStep() {
      const currentText = TEXTS[currentTextIndex];

      if (!isDeleting) {
        if (currentCharIndex < currentText.length) {
          displayedText += currentText[currentCharIndex];
          currentCharIndex += 1;
          updateDom();
          timeoutId = window.setTimeout(runStep, typingSpeed);
          return;
        }
        if (!loop && currentTextIndex === TEXTS.length - 1) return;
        timeoutId = window.setTimeout(() => {
          isDeleting = true;
          runStep();
        }, pauseDuration);
        return;
      }

      if (displayedText.length > 0) {
        displayedText = displayedText.slice(0, -1);
        updateDom();
        timeoutId = window.setTimeout(runStep, deletingSpeed);
        return;
      }

      isDeleting = false;
      if (currentTextIndex === TEXTS.length - 1 && !loop) return;
      currentTextIndex = (currentTextIndex + 1) % TEXTS.length;
      currentCharIndex = 0;
      timeoutId = window.setTimeout(runStep, pauseDuration);
    }

    timeoutId = window.setTimeout(runStep, initialDelay);

    window.addEventListener(
      "pagehide",
      () => {
        window.clearTimeout(timeoutId);
        if (cursorTween && cursorTween.kill) cursorTween.kill();
      },
      { once: true }
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
