/**
 * TargetCursor — кастомный курсор с «прицелом» на элементах (GSAP), порт с React Bits.
 */
(function () {
  const CONFIG = {
    targetSelector:
      '.cursor-target, .btn, .nav-link, .brand, .card, .project, .project-link, .site-footer .link:not([aria-disabled="true"]), .to-top, .skip-link',
    spinDuration: 2,
    hideDefaultCursor: true,
    hoverDuration: 0.2,
    parallaxOn: true,
  };

  const constants = {
    borderWidth: 3,
    cornerSize: 12,
  };

  function isMobileDevice() {
    if (typeof window === "undefined") return true;
    const hasTouchScreen = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.innerWidth <= 768;
    const ua = navigator.userAgent || navigator.vendor || window.opera || "";
    const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
    const isMobileUserAgent = mobileRegex.test(ua.toLowerCase());
    return (hasTouchScreen && isSmallScreen) || isMobileUserAgent;
  }

  function init() {
    if (typeof window.gsap === "undefined") return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    if (isMobileDevice()) {
      const root = document.getElementById("target-cursor-root");
      if (root) root.hidden = true;
      return;
    }

    const cursor = document.getElementById("target-cursor-root");
    if (!cursor) return;

    const dot = cursor.querySelector(".target-cursor-dot");
    const corners = cursor.querySelectorAll(".target-cursor-corner");
    if (!corners.length) return;

    const gsap = window.gsap;
    const activeStrengthRef = { current: 0 };

    let spinTl = null;
    let activeTarget = null;
    let currentLeaveHandler = null;
    let resumeTimeout = null;
    let targetCornerPositionsRef = null;

    const originalCursor = document.body.style.cursor;
    if (CONFIG.hideDefaultCursor) {
      document.body.style.cursor = "none";
    }
    document.documentElement.classList.add("has-target-cursor");

    function moveCursor(x, y) {
      gsap.to(cursor, {
        x,
        y,
        duration: 0.1,
        ease: "power3.out",
      });
    }

    gsap.set(cursor, {
      xPercent: -50,
      yPercent: -50,
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });

    function createSpinTimeline() {
      if (spinTl) spinTl.kill();
      spinTl = gsap
        .timeline({ repeat: -1 })
        .to(cursor, { rotation: "+=360", duration: CONFIG.spinDuration, ease: "none" });
    }

    createSpinTimeline();

    function tickerFn() {
      if (!targetCornerPositionsRef || !corners.length) return;

      const strength = activeStrengthRef.current;
      if (strength === 0) return;

      const cursorX = gsap.getProperty(cursor, "x");
      const cursorY = gsap.getProperty(cursor, "y");

      corners.forEach((corner, i) => {
        const currentX = gsap.getProperty(corner, "x");
        const currentY = gsap.getProperty(corner, "y");

        const targetX = targetCornerPositionsRef[i].x - cursorX;
        const targetY = targetCornerPositionsRef[i].y - cursorY;

        const finalX = currentX + (targetX - currentX) * strength;
        const finalY = currentY + (targetY - currentY) * strength;

        const duration = strength >= 0.99 ? (CONFIG.parallaxOn ? 0.2 : 0) : 0.05;

        gsap.to(corner, {
          x: finalX,
          y: finalY,
          duration: duration,
          ease: duration === 0 ? "none" : "power1.out",
          overwrite: "auto",
        });
      });
    }

    function cleanupTarget(target) {
      if (currentLeaveHandler) {
        target.removeEventListener("mouseleave", currentLeaveHandler);
      }
      currentLeaveHandler = null;
    }

    function moveHandler(e) {
      moveCursor(e.clientX, e.clientY);
    }

    function scrollHandler() {
      if (!activeTarget) return;
      const mouseX = gsap.getProperty(cursor, "x");
      const mouseY = gsap.getProperty(cursor, "y");
      const elementUnderMouse = document.elementFromPoint(mouseX, mouseY);
      const sel = CONFIG.targetSelector;
      const isStillOverTarget =
        elementUnderMouse &&
        (elementUnderMouse === activeTarget ||
          (typeof elementUnderMouse.closest === "function" &&
            elementUnderMouse.closest(sel) === activeTarget));
      if (!isStillOverTarget && currentLeaveHandler) {
        currentLeaveHandler();
      }
    }

    function mouseDownHandler() {
      if (dot) gsap.to(dot, { scale: 0.7, duration: 0.3 });
      gsap.to(cursor, { scale: 0.9, duration: 0.2 });
    }

    function mouseUpHandler() {
      if (dot) gsap.to(dot, { scale: 1, duration: 0.3 });
      gsap.to(cursor, { scale: 1, duration: 0.2 });
    }

    function enterHandler(e) {
      const directTarget = e.target;
      const allTargets = [];
      let current = directTarget;
      const sel = CONFIG.targetSelector;
      while (current && current !== document.body) {
        try {
          if (current.matches && current.matches(sel)) {
            allTargets.push(current);
          }
        } catch {
          /* invalid selector in old browsers */
        }
        current = current.parentElement;
      }
      const target = allTargets[0] || null;
      if (!target) return;
      if (activeTarget === target) return;

      if (activeTarget) cleanupTarget(activeTarget);
      if (resumeTimeout) {
        clearTimeout(resumeTimeout);
        resumeTimeout = null;
      }

      activeTarget = target;
      corners.forEach((c) => gsap.killTweensOf(c));

      gsap.killTweensOf(cursor, "rotation");
      if (spinTl) spinTl.pause();
      gsap.set(cursor, { rotation: 0 });

      const rect = target.getBoundingClientRect();
      const { borderWidth, cornerSize } = constants;
      const cursorX = gsap.getProperty(cursor, "x");
      const cursorY = gsap.getProperty(cursor, "y");

      targetCornerPositionsRef = [
        { x: rect.left - borderWidth, y: rect.top - borderWidth },
        { x: rect.right + borderWidth - cornerSize, y: rect.top - borderWidth },
        { x: rect.right + borderWidth - cornerSize, y: rect.bottom + borderWidth - cornerSize },
        { x: rect.left - borderWidth, y: rect.bottom + borderWidth - cornerSize },
      ];

      gsap.ticker.add(tickerFn);

      gsap.to(activeStrengthRef, {
        current: 1,
        duration: CONFIG.hoverDuration,
        ease: "power2.out",
      });

      corners.forEach((corner, i) => {
        gsap.to(corner, {
          x: targetCornerPositionsRef[i].x - cursorX,
          y: targetCornerPositionsRef[i].y - cursorY,
          duration: 0.2,
          ease: "power2.out",
        });
      });

      function leaveHandler() {
        gsap.ticker.remove(tickerFn);

        targetCornerPositionsRef = null;
        gsap.set(activeStrengthRef, { current: 0, overwrite: true });
        activeTarget = null;

        corners.forEach((c) => gsap.killTweensOf(c));
        const { cornerSize: cs } = constants;
        const positions = [
          { x: -cs * 1.5, y: -cs * 1.5 },
          { x: cs * 0.5, y: -cs * 1.5 },
          { x: cs * 0.5, y: cs * 0.5 },
          { x: -cs * 1.5, y: cs * 0.5 },
        ];
        const tl = gsap.timeline();
        corners.forEach((corner, index) => {
          tl.to(
            corner,
            {
              x: positions[index].x,
              y: positions[index].y,
              duration: 0.3,
              ease: "power3.out",
            },
            0
          );
        });

        resumeTimeout = setTimeout(() => {
          if (!activeTarget && cursor && spinTl) {
            const currentRotation = gsap.getProperty(cursor, "rotation");
            const normalizedRotation = currentRotation % 360;
            spinTl.kill();
            spinTl = gsap
              .timeline({ repeat: -1 })
              .to(cursor, { rotation: "+=360", duration: CONFIG.spinDuration, ease: "none" });
            gsap.to(cursor, {
              rotation: normalizedRotation + 360,
              duration: CONFIG.spinDuration * (1 - normalizedRotation / 360),
              ease: "none",
              onComplete: () => {
                if (spinTl) spinTl.restart();
              },
            });
          }
          resumeTimeout = null;
        }, 50);

        cleanupTarget(target);
      }

      currentLeaveHandler = leaveHandler;
      target.addEventListener("mouseleave", leaveHandler);
    }

    window.addEventListener("mousemove", moveHandler);
    window.addEventListener("mouseover", enterHandler, { passive: true });
    window.addEventListener("scroll", scrollHandler, { passive: true });
    window.addEventListener("mousedown", mouseDownHandler);
    window.addEventListener("mouseup", mouseUpHandler);

    window.__targetCursorCleanup = function () {
      gsap.ticker.remove(tickerFn);
      window.removeEventListener("mousemove", moveHandler);
      window.removeEventListener("mouseover", enterHandler);
      window.removeEventListener("scroll", scrollHandler);
      window.removeEventListener("mousedown", mouseDownHandler);
      window.removeEventListener("mouseup", mouseUpHandler);
      if (activeTarget) cleanupTarget(activeTarget);
      if (spinTl) spinTl.kill();
      document.body.style.cursor = originalCursor;
      document.documentElement.classList.remove("has-target-cursor");
      targetCornerPositionsRef = null;
      activeStrengthRef.current = 0;
      if (resumeTimeout) clearTimeout(resumeTimeout);
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
