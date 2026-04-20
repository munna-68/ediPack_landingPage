document.addEventListener("DOMContentLoaded", () => {
  const preloader = document.getElementById("preloader");
  const preloaderBox = document.getElementById("preloader-box");
  const loadRevealGroups = Array.from(
    document.querySelectorAll("[data-load-reveal]"),
  );
  const loadRevealBoxes = loadRevealGroups.flatMap((group) =>
    Array.from(group.querySelectorAll(".reveal-box")),
  );
  const scrollGroups = Array.from(
    document.querySelectorAll("[data-scroll-reveal]"),
  );
  const reducedMotionQuery = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  );
  document.body.classList.add("is-preloading");

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function easeInOutQuart(x) {
    return x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2;
  }

  function getTiming(box, index) {
    const fallbackStart = clamp(index * 0.12, 0, 0.85);
    const fallbackEnd = clamp(fallbackStart + 0.45, fallbackStart + 0.08, 1);
    const parsedStart = Number.parseFloat(
      box.dataset.start ?? String(fallbackStart),
    );
    const parsedEnd = Number.parseFloat(box.dataset.end ?? String(fallbackEnd));
    const start = Number.isFinite(parsedStart)
      ? clamp(parsedStart, 0, 1)
      : fallbackStart;
    const end = Number.isFinite(parsedEnd)
      ? clamp(parsedEnd, start + 0.01, 1)
      : fallbackEnd;

    return { start, end };
  }

  function applyProgress(boxes, progress) {
    boxes.forEach((box, index) => {
      const { start, end } = getTiming(box, index);
      const localProgress = clamp((progress - start) / (end - start), 0, 1);
      const easedProgress = easeInOutQuart(localProgress);
      box.style.transform = `translate3d(-${easedProgress * 101}%, 0, 0)`;
    });
  }

  function finishAll() {
    document.querySelectorAll(".reveal-box").forEach((box) => {
      box.style.transform = "translate3d(-101%, 0, 0)";
    });

    scrollGroups.forEach((group) => {
      group.dataset.revealState = "done";
      group.classList.add("is-revealed");
    });

    if (preloader) {
      preloader.remove();
    }

    document.body.classList.remove("is-preloading");
  }

  if (reducedMotionQuery.matches) {
    finishAll();
    return;
  }

  function runLoadAutoplay() {
    if (!loadRevealBoxes.length) {
      return;
    }

    const duration = 1750;
    const delay = 80;
    let startedAt = null;

    function tick(timestamp) {
      if (startedAt === null) {
        startedAt = timestamp + delay;
      }

      const progress = clamp((timestamp - startedAt) / duration, 0, 1);
      applyProgress(loadRevealBoxes, progress);

      if (progress < 1) {
        requestAnimationFrame(tick);
        return;
      }

      loadRevealGroups.forEach((group) => group.classList.add("is-revealed"));
    }

    requestAnimationFrame(tick);
  }

  function startPreloaderSequence() {
    if (!preloader || !preloaderBox) {
      document.body.classList.remove("is-preloading");
      runLoadAutoplay();
      return;
    }

    setTimeout(() => {
      preloaderBox.style.transform = "translate3d(-101%, 0, 0)";

      setTimeout(() => {
        preloader.classList.add("is-hidden");

        setTimeout(() => {
          preloader.remove();
          document.body.classList.remove("is-preloading");
          runLoadAutoplay();
        }, 1200);
      }, 1400);
    }, 400);
  }

  function animateScrollGroup(group) {
    if (
      group.dataset.revealState === "animating" ||
      group.dataset.revealState === "done"
    ) {
      return;
    }

    const boxes = Array.from(group.querySelectorAll(".reveal-box"));
    if (!boxes.length) {
      group.dataset.revealState = "done";
      group.classList.add("is-revealed");
      return;
    }

    group.dataset.revealState = "animating";
    const duration = Number.parseInt(
      group.dataset.revealDuration ?? "1200",
      10,
    );
    let startedAt = null;

    function tick(timestamp) {
      if (startedAt === null) {
        startedAt = timestamp;
      }

      const progress = clamp((timestamp - startedAt) / duration, 0, 1);
      applyProgress(boxes, progress);

      if (progress < 1) {
        requestAnimationFrame(tick);
        return;
      }

      group.dataset.revealState = "done";
      group.classList.add("is-revealed");
    }

    requestAnimationFrame(tick);
  }

  const groupObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        animateScrollGroup(entry.target);
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.2,
      rootMargin: "0px 0px -12% 0px",
    },
  );

  scrollGroups.forEach((group) => {
    groupObserver.observe(group);
  });

  reducedMotionQuery.addEventListener("change", (event) => {
    if (!event.matches) {
      return;
    }

    finishAll();
    groupObserver.disconnect();
  });

  startPreloaderSequence();
});
