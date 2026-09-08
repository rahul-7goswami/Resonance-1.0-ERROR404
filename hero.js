/**
 * Resonance - Front-End Interaction Engine
 * Implements Apple-inspired scroll-up transitions, dial interaction, and squarcle options.
 */

document.addEventListener("DOMContentLoaded", () => {
  const welcomeSection = document.getElementById("welcome-section");
  const optionsSection = document.getElementById("options-section");
  let currentView = "welcome"; // 'welcome' | 'options'
  let isTransitioning = false;

  // Function to show Options from Welcome (Greeting scrolls up to exit)
  function showOptions() {
    if (isTransitioning || currentView === "options") return;
    isTransitioning = true;

    // Greeting exits upward
    welcomeSection.classList.remove("active");
    welcomeSection.classList.add("exit-up");

    // Options section scrolls in from bottom
    optionsSection.classList.remove("exit-up");
    optionsSection.classList.add("active");

    currentView = "options";
    setTimeout(() => {
      isTransitioning = false;
    }, 700);
  }

  // Function to return to Welcome greeting
  function showWelcome() {
    if (isTransitioning || currentView === "welcome") return;
    isTransitioning = true;

    optionsSection.classList.remove("active");
    optionsSection.classList.remove("exit-up");

    welcomeSection.classList.remove("exit-up");
    welcomeSection.classList.add("active");

    currentView = "welcome";
    setTimeout(() => {
      isTransitioning = false;
    }, 700);
  }

  if (['#options', '#life'].includes(location.hash)) showOptions();

  // Squarcle navigation bridging
  const squarcleCards = document.querySelectorAll(".squarcle-card");
  squarcleCards.forEach((card) => {
    const page = card.getAttribute("data-page");
    const href = card.getAttribute("data-href");

    if (page === "Business" || href) {
      const destination = href || "business/business.html";
      card.addEventListener("click", () => {
        window.DFlowTransition.navigate(destination);
      });
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          window.DFlowTransition.navigate(destination);
        }
      });
    }
  });

  // =========================================================
  // Cinematic Scroll Animation Engine
  // =========================================================
  const dialItems = document.querySelectorAll(".dial-item");
  const backdropVideo = document.getElementById("backdrop-video");
  const scrollPrompt = document.getElementById("scroll-prompt");

  // Each phrase is spaced 8 degrees apart on the arc.
  const angleStep = 8;

  // scrollProgress controls the timeline.
  // At progress=0, the first item ("Hello!") is at 0° = perfectly horizontal = centered.
  // Start at 30 so all items begin offscreen (angles > 12° = invisible).
  let scrollProgress = 30;
  let targetProgress = 30;
  let hasScrolled = false;
  let isDialDragging = false;
  let dragStartY = 0;
  let dragStartProgress = 0;

  // =========================================================
  // Video scrubbing: drive currentTime directly from targetProgress
  // Range: targetProgress 30 (start) → -80 (transition to options)
  // =========================================================
  const SCROLL_MIN = -80; // bottom of welcome scroll range
  const SCROLL_MAX = 30;  // top of welcome scroll range

  let videoDuration = 0; // set once metadata fires

  if (backdropVideo) {
    backdropVideo.addEventListener("loadedmetadata", () => {
      videoDuration = backdropVideo.duration;
      backdropVideo.currentTime = 0;
    });
    // Already cached (e.g. hard refresh with cached video)
    if (backdropVideo.readyState >= 1) {
      videoDuration = backdropVideo.duration || 0;
    }
    backdropVideo.pause();
  }

  // Scrub the video smoothly to match the current scrollProgress.
  function scrubVideo() {
    if (!backdropVideo) return;

    // If the browser missed the loadedmetadata event, grab duration directly
    if (videoDuration <= 0 && backdropVideo.duration && !isNaN(backdropVideo.duration)) {
      videoDuration = backdropVideo.duration;
    }

    if (videoDuration <= 0) return;

    const t = Math.max(0, Math.min(1,
      (SCROLL_MAX - scrollProgress) / (SCROLL_MAX - SCROLL_MIN)
    ));

    backdropVideo.currentTime = t * videoDuration;
  }

  function updateCinematicScroll() {
    // Smooth interpolation for fluid Apple feel
    scrollProgress += (targetProgress - scrollProgress) * 0.1;

    // Hide scroll prompt once user starts scrolling
    if (!hasScrolled && targetProgress < 28) {
      hasScrolled = true;
      if (scrollPrompt) scrollPrompt.classList.add("hidden");
    }

    // --- Phase 1: Greeting Dial ---
    dialItems.forEach((item, index) => {
      const itemAngle = scrollProgress + index * angleStep;

      let opacity = 0;
      if (itemAngle > 12) {
        opacity = 0;
      } else if (itemAngle > 3) {
        opacity = 1 - (itemAngle - 3) / (12 - 3);
      } else if (itemAngle >= -3) {
        opacity = 1;
      } else if (itemAngle >= -12) {
        opacity = (itemAngle + 12) / (12 - 3);
      } else {
        opacity = 0;
      }

      const scale = 0.92 + Math.max(0, opacity) * 0.08;
      item.style.transform = `rotate(${itemAngle.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
      item.style.opacity = Math.max(0, Math.min(1, opacity)).toFixed(3);
    });

    scrubVideo();

    requestAnimationFrame(updateCinematicScroll);
  }

  // Start the animation loop
  requestAnimationFrame(updateCinematicScroll);

  // --- Scroll / Wheel ---
  let wheelTimeout;
  window.addEventListener("wheel", (e) => {
    if (isTransitioning) return;

    if (currentView === "welcome") {
      targetProgress -= e.deltaY * 0.04;

      // Upper bound: don't scroll above the starting position
      if (targetProgress > 30) targetProgress = 30;

      // If past the cinematic sequence, transition to options
      if (targetProgress < -80) {
        if (!wheelTimeout) {
          wheelTimeout = setTimeout(() => { wheelTimeout = null; }, 500);
          showOptions();
        }
      }
    } else if (currentView === "options" && e.deltaY < -20) {
      const container = document.querySelector(".options-container");
      if (container && container.scrollTop <= 0) {
        if (!wheelTimeout) {
          wheelTimeout = setTimeout(() => { wheelTimeout = null; }, 500);
          showWelcome();
          targetProgress = -70;
        }
      }
    }
  }, { passive: true });

  // --- Mouse Drag ---
  window.addEventListener("mousedown", (e) => {
    if (currentView !== "welcome") return;
    isDialDragging = true;
    dragStartY = e.clientY;
    dragStartProgress = targetProgress;
  });

  window.addEventListener("mousemove", (e) => {
    if (!isDialDragging || currentView !== "welcome") return;
    const diffY = e.clientY - dragStartY;
    targetProgress = dragStartProgress - diffY * 0.12;
    if (targetProgress > 30) targetProgress = 30;
    if (targetProgress < -85) showOptions();
  });

  window.addEventListener("mouseup", () => {
    isDialDragging = false;
  });

  // --- Touch ---
  window.addEventListener("touchstart", (e) => {
    if (currentView !== "welcome") return;
    isDialDragging = true;
    dragStartY = e.changedTouches[0].clientY;
    dragStartProgress = targetProgress;
  }, { passive: true });

  window.addEventListener("touchmove", (e) => {
    if (!isDialDragging || currentView !== "welcome") return;
    const diffY = e.changedTouches[0].clientY - dragStartY;
    targetProgress = dragStartProgress - diffY * 0.15;
    if (targetProgress > 30) targetProgress = 30;
    if (targetProgress < -85) showOptions();
  }, { passive: true });

  window.addEventListener("touchend", () => {
    isDialDragging = false;
  });

  // --- Keyboard ---
  window.addEventListener("keydown", (e) => {
    if (currentView === "welcome") {
      if (e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        targetProgress -= 15;
        if (targetProgress < -80) showOptions();
      } else if (e.key === "ArrowUp") {
        targetProgress = Math.min(30, targetProgress + 15);
      }
    } else if (e.key === "ArrowUp" && currentView === "options") {
      showWelcome();
      targetProgress = -70;
    }
  });
});
