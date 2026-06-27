const mediaQueries = {
  reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)"),
  compact: window.matchMedia("(max-width: 900px)"),
  touch: window.matchMedia("(hover: none), (pointer: coarse)"),
};

const state = {
  particles: [],
  rafId: null,
};

const config = {
  particles: {
    desktopCount: 56,
    compactCount: 28,
    speed: [0.25, 1.35],
    drift: [-0.18, 0.18],
    size: [0.6, 2.2],
    alpha: [0.06, 0.3],
  },
};

const revealElements = [...document.querySelectorAll("[data-reveal]")];
const tiltElements = [...document.querySelectorAll(".js-tilt")];
const particleCanvas = document.getElementById("particle-canvas");
const body = document.body;

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function createParticle(width, height) {
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    vx: randomBetween(...config.particles.drift),
    vy: randomBetween(...config.particles.speed),
    radius: randomBetween(...config.particles.size),
    alpha: randomBetween(...config.particles.alpha),
  };
}

function setupParticles() {
  if (!particleCanvas) {
    return;
  }

  const ctx = particleCanvas.getContext("2d");
  if (!ctx) {
    return;
  }

  function resizeCanvas() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;

    particleCanvas.width = Math.floor(width * ratio);
    particleCanvas.height = Math.floor(height * ratio);
    particleCanvas.style.width = `${width}px`;
    particleCanvas.style.height = `${height}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    const targetCount = mediaQueries.compact.matches
      ? config.particles.compactCount
      : config.particles.desktopCount;

    state.particles = Array.from({ length: targetCount }, () =>
      createParticle(width, height),
    );
  }

  function render() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    ctx.clearRect(0, 0, width, height);

    state.particles.forEach((particle) => {
      particle.x += particle.vx;
      particle.y += particle.vy;

      if (particle.y > height + 8) {
        particle.y = -10;
        particle.x = Math.random() * width;
      }

      if (particle.x > width + 10) {
        particle.x = -10;
      } else if (particle.x < -10) {
        particle.x = width + 10;
      }

      ctx.beginPath();
      ctx.fillStyle = `rgba(244, 240, 232, ${particle.alpha})`;
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    state.rafId = window.requestAnimationFrame(render);
  }

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  if (!mediaQueries.reducedMotion.matches) {
    render();
  }
}

function stopParticles() {
  if (state.rafId) {
    window.cancelAnimationFrame(state.rafId);
    state.rafId = null;
  }
}

function setupReducedMotionReveals() {
  revealElements.forEach((element) => {
    element.classList.remove("is-visible");
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
        }
      });
    },
    { threshold: 0.18, rootMargin: "0px 0px -10% 0px" },
  );

  revealElements.forEach((element) => observer.observe(element));
}

function setupTilt() {
  if (mediaQueries.touch.matches || mediaQueries.reducedMotion.matches) {
    return;
  }

  tiltElements.forEach((element) => {
    const inner = element.querySelector(".cutout__inner, .character-panel__content");

    element.addEventListener("pointermove", (event) => {
      const rect = element.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;
      const rotateY = (px - 0.5) * 10;
      const rotateX = (0.5 - py) * 10;
      const depth = Number(element.dataset.depth || 0.5);

      element.style.setProperty("--tilt-x", `${rotateX}deg`);
      element.style.setProperty("--tilt-y", `${rotateY}deg`);
      element.style.setProperty("--hover-lift", `${depth * -8}px`);

      if (inner) {
        inner.style.transform = `translateZ(${24 + depth * 36}px)`;
      }
    });

    element.addEventListener("pointerleave", () => {
      element.style.removeProperty("--tilt-x");
      element.style.removeProperty("--tilt-y");
      element.style.removeProperty("--hover-lift");
      if (inner) {
        inner.style.transform = "";
      }
    });
  });
}

function setupGsapScenes() {
  if (!window.gsap || !window.ScrollTrigger || mediaQueries.reducedMotion.matches) {
    setupReducedMotionReveals();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  gsap.set(revealElements, { opacity: 0, y: 38 });
  gsap.set(".hero__title span", { yPercent: 120, opacity: 0 });
  gsap.set(".hero__lede, .hero__actions, .hero__glyphs, .scroll-cue", {
    y: 24,
    opacity: 0,
  });
  gsap.set(".cutout", { y: 50, opacity: 0, scale: 0.92 });

  const heroTimeline = gsap.timeline({
    defaults: { ease: "power3.out" },
    scrollTrigger: {
      trigger: "#hero",
      start: "top top",
      end: "+=130%",
      scrub: 0.8,
      pin: true,
    },
  });

  heroTimeline
    .to(".hero__title span", {
      yPercent: 0,
      opacity: 1,
      stagger: 0.08,
      duration: 0.85,
    })
    .to(
      ".hero__lede, .hero__actions, .hero__glyphs, .scroll-cue",
      {
        y: 0,
        opacity: 1,
        stagger: 0.06,
        duration: 0.5,
      },
      "-=0.4",
    )
    .to(
      ".cutout--left",
      {
        x: 20,
        y: -18,
        opacity: 1,
        scale: 1,
      },
      "-=0.5",
    )
    .to(
      ".cutout--center",
      {
        y: -8,
        opacity: 1,
        scale: 1,
      },
      "<",
    )
    .to(
      ".cutout--right",
      {
        x: -20,
        y: 14,
        opacity: 1,
        scale: 1,
      },
      "<",
    )
    .to(
      ".hero__backdrop",
      {
        scale: 1.08,
        opacity: 0.55,
      },
      0,
    );

  revealElements.forEach((element) => {
    gsap.to(element, {
      opacity: 1,
      y: 0,
      ease: "power2.out",
      duration: 0.9,
      scrollTrigger: {
        trigger: element,
        start: "top 86%",
        toggleActions: "play none none reverse",
      },
    });
  });

  gsap.to(".character-panel", {
    yPercent: -8,
    stagger: 0.12,
    ease: "none",
    scrollTrigger: {
      trigger: "#showcase",
      start: "top bottom",
      end: "bottom top",
      scrub: 0.8,
    },
  });

  gsap.fromTo(
    ".transition__statement h2",
    { letterSpacing: "-0.02em", opacity: 0.45 },
    {
      letterSpacing: "0.02em",
      opacity: 1,
      ease: "none",
      scrollTrigger: {
        trigger: "#transition",
        start: "top 65%",
        end: "bottom 40%",
        scrub: true,
      },
    },
  );

  gsap.fromTo(
    ".finale__image",
    { y: 50, opacity: 0.55 },
    {
      y: 0,
      opacity: 1,
      ease: "power2.out",
      scrollTrigger: {
        trigger: "#finale",
        start: "top 78%",
        end: "top 36%",
        scrub: 0.7,
      },
    },
  );
}

function setMotionMode() {
  body.classList.toggle("is-reduced-motion", mediaQueries.reducedMotion.matches);

  if (mediaQueries.reducedMotion.matches) {
    stopParticles();
    setupReducedMotionReveals();
  }
}

function init() {
  setMotionMode();
  setupParticles();
  setupTilt();
  setupGsapScenes();
}

init();
